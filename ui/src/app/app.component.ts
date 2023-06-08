// Copyright 2023 Google LLC
// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy
// of the License at

//   http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuditExecution, ExecutionResponse } from './types';
import {
  Subject,
  catchError,
  firstValueFrom,
  of,
  share,
  switchMap,
  takeUntil,
  timer,
} from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  formGroup: FormGroup;
  thirdPartyResults: { name: string; selected: boolean }[] = [];
  error?: string;
  currentExecution?: ExecutionResponse;
  results?: AuditExecution;
  isLoading = false;
  displayedColumns: string[] = ['urls', 'lcp', 'fcp', 'cls', 'screen'];

  private stopPolling = new Subject();

  constructor(
    private http: HttpClient,
    private readonly formBuilder: FormBuilder,
    public domSanitizer: DomSanitizer
  ) {
    this.formGroup = this.formBuilder.group({
      server: ['http://localhost:3000', [Validators.required]],
      url: ['', [Validators.required]],
      numberOfReports: [
        3,
        [Validators.required, Validators.max(10), Validators.min(1)],
      ],
      max: ['', [Validators.min(0)]],
      userAgentOverride: ['', []],
      cookies: ['', []],
      localStorage: ['', []],
      blockAll: [false, []],
    });
  }

  private extractRequest() {
    const url: string = this.formGroup.get('url')?.value ?? '';
    const userAgentOverride: string =
      this.formGroup.get('userAgentOverride')?.value ?? '';
    const cookies: string = this.formGroup.get('cookies')?.value ?? '';
    const localStorage: string =
      this.formGroup.get('localStorage')?.value ?? '';
    const maxUrlsToTry: number = parseInt(
      this.formGroup.get('maxUrlsToTry')?.value ?? '-1'
    );
    const numberOfReports: number = parseInt(
      this.formGroup.get('numberOfReports')?.value ?? '-1'
    );
    const blockAll: boolean = this.formGroup.get('blockAll')?.value ?? false;

    const data: AuditExecution = {
      url,
      cookies,
      localStorage,
      numberOfReports,
      maxUrlsToTry,
      userAgentOverride,
      blockAll,
    };

    return data;
  }

  extractThirdParties() {
    const data = this.extractRequest();
    const server: string = this.formGroup.get('server')?.value;

    this.thirdPartyResults = [];
    this.isLoading = true;
    firstValueFrom(
      this.http.post<{ identifiedThirdParties: string[]; error?: string }>(
        `${server}/analyse-urls/`,
        data
      )
    ).then(
      (response) => {
        if (response.error) {
          this.error = response.error;
        } else {
          this.thirdPartyResults = response.identifiedThirdParties.map((p) => {
            return { name: p, selected: false };
          });
        }
        this.isLoading = false;
      },
      (err) => {
        console.error(err);
        this.error = JSON.stringify(err);
        this.isLoading = false;
      }
    );
  }

  areAllSelected() {
    return !this.thirdPartyResults.find((p) => !p.selected);
  }

  toggleSelectAll() {
    if (this.areAllSelected()) {
      this.thirdPartyResults.forEach((p) => (p.selected = false));
    } else {
      this.thirdPartyResults.forEach((p) => (p.selected = true));
    }
  }

  checkProgress() {
    const server: string = this.formGroup.get('server')?.value;

    return this.http
      .get<AuditExecution | null>(
        `${server}/status/${this.currentExecution?.executionId}`
      )
      .pipe(
        catchError((err) => {
          console.error(err);

          this.stopPolling.next({});
          return of(null);
        })
      );
  }

  generateReport() {
    const data = this.extractRequest();
    const server: string = this.formGroup.get('server')?.value;
    this.isLoading = true;

    firstValueFrom(
      this.http.post<ExecutionResponse>(`${server}/test/`, data)
    ).then(
      (response) => {
        if (response.error) {
          this.error = response.error;
        } else {
          this.currentExecution = response;
          timer(1, 5000)
            .pipe(
              switchMap(() => {
                return this.checkProgress();
              }),
              share(),
              catchError((err) => {
                console.error(err);
                this.error = JSON.stringify(err);
                this.isLoading = false;
                this.currentExecution = undefined;
                return of(null);
              }),
              takeUntil(this.stopPolling)
            )
            .subscribe((response) => {
              if (response) {
                response.results = response.results?.map((r) => {
                  r.screenshotSafe = this.domSanitizer.bypassSecurityTrustHtml(
                    '<img src="data:image/png;base64, ' +
                      r.screenshot! +
                      '" height="128px"/>'
                  );
                  return r;
                });
                this.results = response;
                if (this.results.status === 'complete') {
                  this.isLoading = false;
                  this.stopPolling.next({});
                }
              }
            });
        }
      },
      (err) => {
        console.error(err);
        this.error = JSON.stringify(err);
        this.currentExecution = undefined;
        this.isLoading = false;
      }
    );
  }

  cancel() {
    const server: string = this.formGroup.get('server')?.value;

    firstValueFrom(
      this.http.get(`${server}/cancel/${this.currentExecution?.executionId}`)
    ).then(
      () => {
        this.isLoading = false;
      },
      (err) => {
        console.error(err);
        this.error = JSON.stringify(err);
        this.isLoading = false;
      }
    );
  }

  screenshotClick(imageData: string) {
    const w = window.open('');
    if (w) {
      const image = new Image();
      image.src = 'data:image/png;base64, ' + imageData;

      w.document.write(image.outerHTML);
    }
  }

  ngOnDestroy() {
    this.stopPolling.next({});
  }
}
