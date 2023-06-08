import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  formGroup: FormGroup;


  constructor(private http: HttpClient, private readonly formBuilder: FormBuilder) {
    this.formGroup = this.formBuilder.group({
      url: ['', [Validators.required]],
      numberOfReports: [3, [Validators.required, Validators.max(10), Validators.min(1)]],
      max: ['', [Validators.min(0)]],
      userAgentOverride: ['', []],
      cookies: ['', []],
      localStorage: ['', []],
      blockAll: [false, []]
      
    });
  }

  extractThirdParties() {

  }

  generateReport() {

  }

}
