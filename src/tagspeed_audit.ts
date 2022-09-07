/**
 * @fileoverview Main file for the tag-speed audit platform. All of the code
 * directly related to the tool's web page is collected here.
 */

import {Metric} from 'web-vitals/src/types';
import 'gapi';

/*
 * This is global so that we can prevent multiple tests being run at once,
 * which is not supported.
 */
let TARGET_WINDOW: Window | null = null;

/*
 * Sets up a listener for window.postMessage messages.
 * The messages listened for will only be processed if they originate from the
 * target origin, provided by the origin parameter.
 *
 * @param origin The origin of the site under analysis.
 */
function createMessageListener(origin: string) {
  function messageEventListener(event: MessageEvent) {
    if (event.origin !== origin) return;
    const metric = JSON.parse(event.data) as Metric;
    const resultsTable = document.getElementById('results-table');
    if (!resultsTable) return;
    resultsTable.innerHTML = `<tr><td>${metric.name}</td><td>${metric.delta}</td></tr>`;
  }
  removeEventListener('message', messageEventListener);
  addEventListener('message', messageEventListener);
}

/**
 * Opens a new window with the page to be audited and creates
 * the event listener for the messages being posted back to the platform.
 */
function openTargetWindow() {
  const urlInput = document.getElementById('url-input') as HTMLInputElement;
  if (!urlInput) return;
  const targetURL = new URL(urlInput.value);
  if (TARGET_WINDOW === null || TARGET_WINDOW.closed) {
    TARGET_WINDOW = window.open(targetURL.toString());
    if (!TARGET_WINDOW) return;
    TARGET_WINDOW.focus();
    createMessageListener(targetURL.origin);
  } else {
    alert('Please wait for current test to finish.');
  }
}

/** Page Initialization */
(() => {
  // set up the listener to open the site being audited.
  const form = document.getElementById('url-form') as HTMLFormElement;
  form.addEventListener('submit', openTargetWindow);
})();
