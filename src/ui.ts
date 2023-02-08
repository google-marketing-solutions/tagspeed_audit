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

import {AuditExecution, ExecutionResponse, LHResponse} from './types';

function round(n: number) {
  return Math.round(n * 100) / 100;
}
/**
 * Inject information into the UI.
 * @param result
 */
export function printResult(result: LHResponse, baseline: LHResponse) {
  const table = document.getElementById('results-table') as HTMLTableElement;
  const row = table.insertRow(table.rows.length);
  const isBaseline = baseline === undefined;
  row.classList.add('result');
  const url = row.insertCell(0);
  if (result.blockedURL.length > 70) {
    url.innerText = result.blockedURL.substring(0, 70) + '...';
  } else if (isBaseline) {
    url.innerText = 'BASELINE';
  } else {
    url.innerText = result.blockedURL;
  }
  url.title = result.blockedURL;

  const LCPImproved = !isBaseline
    ? ` (${round(100 - result.scores.LCP / (baseline.scores.LCP / 100))}%)`
    : '';
  const FCPImproved = !isBaseline
    ? ` (${round(100 - result.scores.FCP / (baseline.scores.FCP / 100))}%)`
    : '';
  const CLSImproved = !isBaseline
    ? ` (${round(100 - result.scores.CLS / (baseline.scores.CLS / 100))}%)`
    : '';
  row.insertCell(1).innerText = `${result.scores.LCP} s${LCPImproved}`;
  row.insertCell(2).innerText = `${result.scores.FCP} s${FCPImproved}`;
  row.insertCell(3).innerText = `${result.scores.CLS}${CLSImproved}`;
}

function showError(message: string) {
  const error = document.getElementById('error');
  error.innerText = message;
  error.style.display = 'block';
}

/**
 * Poll regularly for results from backend for a specific id.
 * The backend will continue processing async.
 * @param executionId
 */
async function pollForResults(executionId: string, processedResults: string[]) {
  setTimeout(async () => {
    try {
      const response = await checkForResults(executionId);
      document.getElementById(
        'results-so-far'
      ).innerText = `${response.results.length}`;
      const newResults = response.results.filter(
        r => processedResults.indexOf(r.id) === -1
      );
      newResults.forEach(result => {
        printResult(
          result,
          response.results.length > 1 ? response.results[0] : undefined
        );
        processedResults.push(result.id);
      });

      if (response.status !== 'running') {
        alert('Analysis has finished running!');
        (document.getElementById('submit') as HTMLButtonElement).disabled =
          false;
      } else {
        setTimeout(
          async () => await pollForResults(executionId, processedResults),
          3000
        );
      }
    } catch (ex) {
      showError(ex.message);
      (document.getElementById('submit') as HTMLButtonElement).disabled = false;
    }
  }, 3000);
}

/**
 * Execute HTTP request to check for new results from backend.
 * @param executionId
 * @returns
 */
async function checkForResults(executionId: string): Promise<AuditExecution> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status === 200) {
          const result: AuditExecution = JSON.parse(this.responseText);
          if (result.error) {
            showError(result.error);
            reject(result.error);
          } else {
            resolve(result);
          }
        } else {
          reject(new Error('Unexpected server error'));
        }
      }
    };
    xhr.open('GET', `/status/${executionId}?`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send();
  });
}

/**
 * Handle UI form submission, requesting analysis for a URL.
 * @param e
 * @returns
 */
export function submit(e: Event) {
  e.preventDefault();
  const submitButton = document.getElementById('submit') as HTMLButtonElement;
  const url = (document.getElementById('url') as HTMLFormElement).value;
  const userAgent = (document.getElementById('agent') as HTMLFormElement).value;
  const maxUrlsToTry = (document.getElementById('max') as HTMLFormElement)
    .value;
  const numberOfReports = (
    document.getElementById('numberOfReports') as HTMLFormElement
  ).value;

  document.querySelectorAll('.result').forEach(e => e.remove());

  submitButton.disabled = true;
  const error = document.getElementById('error');
  error.innerText = '';
  error.style.display = 'none';

  try {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status === 200) {
          const response: ExecutionResponse = JSON.parse(this.responseText);
          if (response.error) {
            submitButton.disabled = false;
            showError(response.error);
          } else {
            const processedResults: string[] = [];
            document.getElementById('results-so-far').innerText = '0';
            document.getElementById(
              'results-expected'
            ).innerText = `${response.expectedResults}`;
            const results = document.getElementById(
              'results'
            ) as HTMLDivElement;
            results.style.display = 'block';
            pollForResults(response.executionId, processedResults);
          }
        } else {
          showError('Unexpected server error');
          submitButton.disabled = false;
        }
      }
    };
    xhr.open(
      'GET',
      `/test/${encodeURIComponent(url)}?numberOfReports=${numberOfReports}` +
        (maxUrlsToTry ? `&maxUrlsToTry=${maxUrlsToTry}` : '') +
        (userAgent ? `&userAgent=${encodeURIComponent(userAgent)}` : '')
    );
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send();
  } catch (e) {
    submitButton.disabled = false;
    showError(e.message);
    console.error(e);
    throw new Error(e.message);
  }
  return false;
}
