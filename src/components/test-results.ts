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
import {customElement, state} from 'lit/decorators';
import {map} from 'lit/directives/map';
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

    .baseline-result {
      border-bottom: 1pm solid darkgray;
    }
  `;

  constructor() {
    super();
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
      localStorage.getItem('base-line') ?? '{}'
    ) as TestResult;

    this.sortKey = 'LCP';

    this.addEventListener('test-completed', this.updateTestResults);
  }

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
      <td>${result.tagName}</td>
      <td>${result.tagID}</td>
      <td>${result.LCP} <span class="diff">(${lcpDiff})</span></td>
      <td>${result.FID} <span class="diff">(${fidDiff})</span></td>
      <td>${result.CLS} <span class="diff">(${clsDiff})</span></td>
      <td>${result.INP} <span class="diff">(${inpDiff})</span></td>
    `;
  }

  render() {
    if (
      !(
        this.currentAccount.name &&
        this.currentContainer.name &&
        this.currentWorkspace.name
      )
    ) {
      return html`<p>
        The tool is not properly configured.
        <a href="./index.html">Please start from the beginning.</a>
      </p>`;
    }

    return html`
      <table>
        <thead>
          <tr>
            <th @click=${this.sortResults('tagName')}>Tag Name</th>
            <th @click=${this.sortResults('tagID')}>Tag ID</th>
            <th colspan="4">Web Vitals</th>
            <th></th>
          </tr>

          <tr>
            <th colspan="2"></th>
            <th @click=${this.sortResults('LCP')}>LCP</th>
            <th @click=${this.sortResults('FID')}>FID</th>
            <th @click=${this.sortResults('CLS')}>CLS</th>
            <th @click=${this.sortResults('INP')}>INP</th>
          </tr>
        </thead>
        <tbody>
          <tr class="baseline-result">
            <td colspan="2">Base Line</td>
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
