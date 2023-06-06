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

import {AuditExecution, ExecutionResponse, AuditResponse} from './types';

let globalTimeoutIdentifier: NodeJS.Timeout = null;
let globalExecutionId: string = null;

function enableSubmit() {
  if (globalTimeoutIdentifier) {
    clearTimeout(globalTimeoutIdentifier);
  }

  (document.getElementById('submit') as HTMLButtonElement).disabled = false;
  (document.getElementById('cancel') as HTMLButtonElement).style.display =
    'none';
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Inject information into the UI.
 * @param result
 */
export function printResult(result: AuditResponse, baseline: AuditResponse) {
  const table = document.getElementById('results-table') as HTMLTableElement;
  const row = table.insertRow(table.rows.length);
  const isBaseline = baseline.id === result.id;
  row.classList.add('mdc-data-table__row');
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
  const CLSImproved =
    !isBaseline && baseline.scores.CLS > 0
      ? ` (${round(100 - result.scores.CLS / (baseline.scores.CLS / 100))}%)`
      : '';
  row.insertCell(1).innerText = `${result.scores.LCP} s${LCPImproved}`;
  row.insertCell(2).innerText = `${result.scores.FCP} s${FCPImproved}`;
  row.insertCell(3).innerText = `${result.scores.CLS}${CLSImproved}`;
  row.insertCell(
    4
  ).innerHTML = `<img src="data:image/png;base64, ${result.screenshot}" alt="Screenshot with ${result.blockedURL} blocked" width="70px" height="128px" onclick="screenshotClick(event)">`;
  for (let i = 0; i < row.cells.length; i++) {
    row.cells[i].classList.add('mdc-data-table__cell');
  }
}

function showError(message: string) {
  const error = document.getElementById('error');
  error.innerText = message;
  error.style.display = 'block';
  console.error(message);
}

export function screenshotClick(event: {target: {src: string}}) {
  const w = window.open('');
  const image = new Image();
  image.src = event.target.src;

  w.document.write(image.outerHTML);
}

/**
 * Poll regularly for results from backend for a specific id.
 * The backend will continue processing async.
 * @param executionId
 */
async function pollForResults(executionId: string, processedResults: string[]) {
  globalExecutionId = executionId;
  (document.getElementById('cancel') as HTMLButtonElement).style.display =
    'inline-block';

  globalTimeoutIdentifier = setTimeout(async () => {
    try {
      const response = await checkForResults(executionId);
      if (response.id !== globalExecutionId) return;

      document.getElementById(
        'results-so-far'
      ).innerText = `${response.results.length}`;
      const newResults = response.results.filter(
        r => processedResults.indexOf(r.id) === -1
      );
      newResults.forEach(result => {
        printResult(
          result,
          response.results.length >= 1 ? response.results[0] : undefined
        );
        processedResults.push(result.id);
      });

      if (response.status !== 'running') {
        alert('Analysis has finished running!');
        enableSubmit();
      } else {
        globalTimeoutIdentifier = setTimeout(
          async () => await pollForResults(executionId, processedResults),
          3000
        );
      }
    } catch (ex) {
      showError(ex.message);
      enableSubmit();
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
export function submit(e: SubmitEvent) {
  e.preventDefault();
  const formData = new FormData(e.target as HTMLFormElement);

  const url = formData.get('url').valueOf().toString();
  const userAgentOverride = formData.get('agent').valueOf().toString();
  const cookies = formData.get('cookies').valueOf().toString();
  const localStorage = formData.get('localStorage').valueOf().toString();
  const maxUrlsToTry = parseInt(formData.get('max').valueOf().toString());
  const numberOfReports = parseInt(
    formData.get('numberOfReports').valueOf().toString()
  );
  const blockAll =
    formData.get('blockAll') && formData.get('blockAll').valueOf() === 'on';
  const blockSpecificUrls = Array.from(
    document.querySelectorAll('[name="third-party"]')
  )
    .map(i => i as HTMLInputElement)
    .filter(i => i.checked)
    .map(i => i.value);

  const data: AuditExecution = {
    url,
    cookies,
    localStorage,
    numberOfReports,
    maxUrlsToTry,
    userAgentOverride,
    blockAll,
    blockSpecificUrls:
      blockSpecificUrls.length > 0 ? blockSpecificUrls : undefined,
  };

  const action = e.submitter.getAttribute('value');

  if (action === 'send') {
    handleSend(data);
  } else {
    handleExtract(data);
  }

  return false;
}

export function cancel() {
  if (globalTimeoutIdentifier) {
    clearTimeout(globalTimeoutIdentifier);
    globalTimeoutIdentifier = null;
    const submitButton = document.getElementById('submit') as HTMLButtonElement;
    submitButton.disabled = false;
    (document.getElementById('cancel') as HTMLButtonElement).style.display =
      'none';
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status !== 200) {
          showError('Unknow server state error');
        }
      }
    };
    xhr.open('GET', `/cancel/${globalExecutionId}`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send();
    globalExecutionId = null;
  }
}

function handleExtract(data: AuditExecution) {
  document.querySelectorAll('.third-party').forEach(e => e.remove());
  const xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        const response: {identifiedThirdParties: string[]} = JSON.parse(
          this.responseText
        );
        const thirdParties = document.getElementById('third-parties');
        for (let i = 0; i < response.identifiedThirdParties.length; i++) {
          const thirdParty = document.createElement('div');
          thirdParty.className = 'third-party';

          const thirdPartyCheckbox = document.createElement('input');
          thirdPartyCheckbox.type = 'checkbox';
          thirdPartyCheckbox.name = 'third-party';
          thirdPartyCheckbox.value = response.identifiedThirdParties[i];

          thirdParty.appendChild(thirdPartyCheckbox);
          thirdParty.appendChild(
            document.createTextNode(response.identifiedThirdParties[i])
          );

          thirdParties.appendChild(thirdParty);
        }
      } else {
        showError('Unexpected server error');
      }
    }
  };
  xhr.open('POST', '/analyse-urls/');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify(data));
}

function handleSend(data: AuditExecution) {
  document.querySelectorAll('.mdc-data-table__row').forEach(e => e.remove());

  const submitButton = document.getElementById('submit') as HTMLButtonElement;
  submitButton.disabled = true;
  const error = document.getElementById('error');
  error.innerText = '';
  error.style.display = 'none';

  const results = document.getElementById('results') as HTMLDivElement;
  results.style.display = 'none';

  try {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {
        if (this.status === 200) {
          const response: ExecutionResponse = JSON.parse(this.responseText);
          if (response.error) {
            enableSubmit();
            showError(response.error);
          } else {
            const processedResults: string[] = [];
            document.getElementById('results-so-far').innerText = '0';
            document.getElementById(
              'results-expected'
            ).innerText = `${response.expectedResults}`;

            results.style.display = 'block';
            pollForResults(response.executionId, processedResults);
          }
        } else {
          showError('Unexpected server error');
          enableSubmit();
        }
      }
    };
    xhr.open('POST', '/test/');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
  } catch (e) {
    enableSubmit();
    showError(e.message);
    console.error(e);
    throw new Error(e.message);
  }
}
