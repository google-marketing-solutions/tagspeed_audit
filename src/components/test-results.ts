/*
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview A component to display a results of the tagspeed audit.
 */

import {css, html, LitElement, TemplateResult} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {map} from 'lit/directives/map.js';
import {Account, Container, TestResult, Workspace} from '../models/tag-manager';

declare global {
  interface HTMLElementEventMap {
    'test-completed': CustomEvent<{detail: TestResult}>;
  }
}

@customElement('test-results')
export class TestResults extends LitElement {
  private currentAccount: Account;
  private currentContainer: Container;
  private currentWorkspace: Workspace;
  private baseLine: TestResult;
  @state() testResults: Array<TestResult>;
  @state() sortKey: keyof TestResult;
  @state() sortDesc = true;

  static styles = css`
    .diff {
      font-style: italic;
      color: gainsboro;
    }

    table {
      table-layout: fixed;
      width: 80%;
      border-collapse: collapse;
      text-align: center;
    }

    thead th:nth-child(1) {
      width: 30%
    }

    thead th:nth-child(2) {
      width: 10%
    }

    th, td {
      padding:20px;
    }

    .baseline-result {
      padding: 20px;
      border-bottom: 2px solid #9fa2a6;
    }
  `;

  // TO BE REMOVED
  private results = [
    {
      tagID: '29',
      tagName: 'lighthouse_pic',
      LCP: 35800,
      FID: 400,
      CLS: 0,
      INP: 530,
      FCP: 1100,
      TTFB: 200,
    },
    {
      tagID: '32',
      tagName: 'Cat Pic',
      LCP: 30900,
      FID: 260,
      CLS: 0,
      INP: 390,
      FCP: 1000,
      TTFB: 110,
    },
  ];
  // END TO BE REMOVED

  constructor() {
    super();
    // TO BE REMOVED
    const blr = {
      tagID: 'baseline',
      tagName: 'baseline',
      LCP: 80000,
      FID: 830,
      CLS: 0.74,
      INP: 3700,
      FCP: 1000,
      TTFB: 110,
    };
    localStorage.setItem('baseline-result', JSON.stringify(blr));
    // END TO BE REMOVED
    this.currentAccount = JSON.parse(
      localStorage.getItem('current-account') ?? '{}'
    ) as Account;
    this.currentContainer = JSON.parse(
      localStorage.getItem('current-container') ?? '{}'
    ) as Container;
    this.currentWorkspace = JSON.parse(
      localStorage.getItem('current-workspace') ?? '{}'
    ) as Workspace;
    this.testResults = new Array<TestResult>();
    this.baseLine = JSON.parse(
      localStorage.getItem('baseline-result') ?? '{}'
    ) as TestResult;

    this.sortKey = 'LCP';

    this.addEventListener('test-completed', this.updateTestResults);
  }

  // TO BE REMOVED
  addResults(): void {
    setTimeout(() => {
      const ce = new CustomEvent<TestResult>('test-completed', {
        detail: this.results[0],
      });
      this.updateTestResults(ce);
    }, 4000);
    setTimeout(() => {
      const ce = new CustomEvent<TestResult>('test-completed', {
        detail: this.results[1],
      });
      this.updateTestResults(ce);
    }, 8000);
  }
  // END TO BE REMOVED

  updateTestResults(event: CustomEvent): void {
    this.testResults.push(event.detail);
    this.sortResults(this.sortKey);
  }

  sortResults(key: keyof TestResult) {
    if (key === this.sortKey) {
      this.sortDesc = !this.sortDesc;
    } else {
      this.sortKey = key;
    }
    if (this.sortDesc) {
      this.testResults.sort((a, b) =>
        a[this.sortKey] > b[this.sortKey] ? -1 : 1
      );
    } else {
      this.testResults.sort((a, b) =>
        a[this.sortKey] < b[this.sortKey] ? -1 : 1
      );
    }
  }

  createResultRow(result: TestResult): TemplateResult {
    const lcpDiff = this.baseLine.LCP - result.LCP;
    const fidDiff = this.baseLine.FID - result.FID;
    const clsDiff = this.baseLine.CLS - result.CLS;
    const inpDiff = this.baseLine.INP - result.INP;

    return html`
    <tr>
      <td>${result.tagName}</td>
      <td>${result.tagID}</td>
      <td>${result.LCP} <span class="diff">(${lcpDiff})</span></td>
      <td>${result.FID} <span class="diff">(${fidDiff})</span></td>
      <td>${result.CLS} <span class="diff">(${clsDiff})</span></td>
      <td>${result.INP} <span class="diff">(${inpDiff})</span></td>
      </tr>
    `;
  }

  render() {
    // if (
    //   !(
    //     this.currentAccount.name &&
    //     this.currentContainer.name &&
    //     this.currentWorkspace.name
    //   )
    // ) {
    //   return html`<p>
    //     The tool is not properly configured.
    //     <a href="./index.html">Please start from the beginning.</a>
    //   </p>`;
    // }
    return html`
      <table>
        <thead>
          <tr>
            <th @click=${() => this.sortResults('tagName')}>Tag Name</th>
            <th @click=${() => this.sortResults('tagID')}>Tag ID</th>
            <th colspan="4">Web Vitals</th>
            <th></th>
          </tr>

          <tr>
            <th colspan="2"></th>
            <th @click=${() => this.sortResults('LCP')}>LCP</th>
            <th @click=${() => this.sortResults('FID')}>FID</th>
            <th @click=${() => this.sortResults('CLS')}>CLS</th>
            <th @click=${() => this.sortResults('INP')}>INP</th>
          </tr>
        </thead>
        <tbody>
          <tr class="baseline-result">
            <td colspan="2" @click=${() => this.addResults()}>Base Line</td>
            <td>${this.baseLine.LCP}</td>
            <td>${this.baseLine.FID}</td>
            <td>${this.baseLine.CLS}</td>
            <td>${this.baseLine.INP}</td>
          </tr>
          ${map(this.testResults, r => html` ${this.createResultRow(r)} `)}
        </tbody>
      </table>
    `;
  }
}
