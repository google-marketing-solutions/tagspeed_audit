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
import puppeteer, {
  Browser,
  HTTPRequest,
  KnownDevices,
  PredefinedNetworkConditions,
} from 'puppeteer';
import {getEntity} from 'third-party-web';
import {v4 as uuidv4} from 'uuid';
import {AuditExecution, AuditResponse, ExecutionResponse} from './types';
import {Page} from 'puppeteer';

export async function identifyThirdParties(
  execution: AuditExecution
): Promise<Set<string>> {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: null,
  });

  const toBlockSet = new Set<string>();

  const requests = await extractRequestsFromPage(
    browser,
    execution.userAgentOverride,
    execution.url,
    execution.cookies,
    execution.localStorage
  );

  for (const request of requests) {
    const url = request.url();
    const headers = request.response().headers();
    const isImage =
      headers['content-type'] && !!headers['content-type'].match(/(image)+\//g);
    if (!isImage && getEntity(url)) {
      toBlockSet.add(url);
    }
  }

  return toBlockSet;
}

/**
 * Identify all network requests done by a page, filter out those that are
 * 3rd parties, then block the 3rd party URLs one by one and run a perf
 * report for each situation to identify if there are performance improvements.
 * @param url
 * @param userAgent
 * @param maxUrlsToTry
 * @returns
 */
export async function doAnalysis(
  execution: AuditExecution
): Promise<ExecutionResponse> {
  console.log(`[${execution.id}] Started ${execution.url}`);

  try {
    // Use Puppeteer to launch headful Chrome and don't use its default 800x600
    // viewport.
    const browser = await puppeteer.launch({
      headless: 'new',
      defaultViewport: null,
    });

    const baselineLHResult = await getPerformanceForURL(
      browser,
      execution.userAgentOverride,
      execution.url,
      new Set<string>(),
      execution.numberOfReports,
      execution.cookies,
      execution.localStorage
    );
    execution.results.push(baselineLHResult);

    // create list of blocking URLs
    let toBlockSet = new Set<string>(execution.blockSpecificUrls ?? []);

    if (toBlockSet.size === 0) {
      toBlockSet = await identifyThirdParties(execution);
    }

    console.log(`[${execution.id}] Will block ${toBlockSet.size} URLs`);
    const limit =
      execution.maxUrlsToTry === -1
        ? toBlockSet.size
        : Math.min(execution.maxUrlsToTry, toBlockSet.size);

    generateReports(browser, toBlockSet, limit, execution);

    return {
      executionId: execution.id,
      expectedResults: execution.blockAll ? 2 : limit + 1,
    } as ExecutionResponse;
  } catch (ex) {
    execution.status = 'error';
    console.error(ex);
    return {
      error: ex.message,
    };
  }
}

/**
 * Execute performance checks against URL, blocking specific pattern from `toBlock`
 * and writing final HTML report to disk.
 * @param browser
 * @param url
 * @param toBlock
 * @returns
 */
async function getPerformanceForURL(
  browser: Browser,
  userAgent: string,
  url: string,
  toBlock: Set<string>,
  numberOfReports: number,
  cookies?: string,
  localStorage?: string
): Promise<AuditResponse> {
  const responses: AuditResponse[] = [];
  for (let i = 0; i < numberOfReports; i++) {
    const page = await (
      await browser.createIncognitoBrowserContext()
    ).newPage();

    if (userAgent.length > 0) {
      await page.setUserAgent(userAgent);
    }

    await page.emulate(KnownDevices['iPhone 11']);
    await page.emulateNetworkConditions(PredefinedNetworkConditions['Fast 3G']);
    await attachCookiesToPage(page, url, cookies);
    await attachLocalStorageToPage(page, localStorage);

    await page.setRequestInterception(true);
    page.on('request', request => {
      if (toBlock.has(request.url())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.goto(url);

    const LCP = await page.evaluate(() => {
      return new Promise<number>(resolve => {
        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1]; // Use the latest LCP candidate
          resolve(lastEntry.startTime);
        });
        observer.observe({type: 'largest-contentful-paint', buffered: true});
      });
    });

    const FCP = await page.evaluate(() => {
      return new Promise<number>(resolve => {
        const observer = new PerformanceObserver(entryList => {
          resolve(
            entryList.getEntriesByName('first-contentful-paint')[0].startTime
          );
        });
        // Some browsers throw when 'type' is passed:
        observer.observe({type: 'paint', buffered: true});
      });
    });

    const CLS = await page.evaluate(() => {
      return new Promise<number>(resolve => {
        let cumulativeLayoutShiftScore = 0;
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            cumulativeLayoutShiftScore += entry.toJSON().value;
          }
          resolve(cumulativeLayoutShiftScore);
        });
        observer.observe({type: 'layout-shift', buffered: true});
        // in a test environment / no CLS at all environment
        // the observer is never called hence timing it out
        setTimeout(() => resolve(cumulativeLayoutShiftScore), 2000);
      });
    });

    responses.push({
      id: uuidv4(),
      reportUrl: '',
      blockedURL: Array.from(toBlock).join(', '),
      screenshot: await page.screenshot({encoding: 'base64'}),
      scores: {
        LCP: LCP / 1000.0,
        FCP: FCP / 1000.0,
        CLS: CLS,
        consoleErrors: 0,
      },
    });

    await page.close();
  }

  const averagedResponse = averageCrossReportMetrics(responses);

  return averagedResponse;
}

/**
 * Execute a browser requests to given URL and keep track of
 * network requests.
 * @param browser
 * @param userAgent
 * @param url
 * @returns
 */
export async function extractRequestsFromPage(
  browser: Browser,
  userAgent: string,
  url: string,
  cookies?: string,
  localStorage?: string
) {
  const page = await browser.newPage();
  if (userAgent.length > 0) {
    await page.setUserAgent(userAgent);
  }
  await attachCookiesToPage(page, url, cookies);
  await attachLocalStorageToPage(page, localStorage);

  await page.setRequestInterception(true);

  page.on('request', request => {
    request.continue();
  });

  const requests = new Array<HTTPRequest>();
  page.on('requestfinished', request => {
    requests.push(request);
  });

  await page.goto(url, {
    waitUntil: 'networkidle0',
  });

  await page.close();
  return requests;
}

/**
 * Average metrics after having ran multiple LH reports for the same scenario.
 * @param responses
 */
export function averageCrossReportMetrics(
  responses: AuditResponse[]
): AuditResponse {
  const FCP =
    Math.round(
      (responses.map(r => r.scores.FCP).reduce((r1, r2) => r1 + r2, 0) /
        responses.length) *
        100
    ) / 100;

  const LCP =
    Math.round(
      (responses.map(r => r.scores.LCP).reduce((r1, r2) => r1 + r2, 0) /
        responses.length) *
        100
    ) / 100;

  const CLS =
    Math.round(
      (responses.map(r => r.scores.CLS).reduce((r1, r2) => r1 + r2, 0) /
        responses.length) *
        100
    ) / 100;

  const consoleErrors =
    Math.round(
      (responses
        .map(r => r.scores.consoleErrors)
        .reduce((r1, r2) => r1 + r2, 0) /
        responses.length) *
        100
    ) / 100;

  return {
    id: responses[0].id,
    blockedURL: responses[0].blockedURL,
    reportUrl: responses[0].reportUrl,
    screenshot: responses[0].screenshot,
    scores: {
      FCP: FCP,
      LCP: LCP,
      CLS: CLS,
      consoleErrors: consoleErrors,
    },
  };
}

/**
 * Execute lighthouse reports, per parameter specifications.
 * @param browser
 * @param toBlock
 * @param limit
 * @param execution
 */
export async function generateReports(
  browser: Browser,
  toBlock: Set<string>,
  limit: number,
  execution: AuditExecution
) {
  if (execution.blockAll) {
    console.log(`[${execution.id}] Blocking all`);
    const lhResult = await getPerformanceForURL(
      browser,
      execution.userAgentOverride,
      execution.url,
      toBlock,
      execution.numberOfReports,
      execution.cookies,
      execution.localStorage
    );

    execution.results.push(lhResult);
  } else {
    const toBlockArray = Array.from(toBlock);
    for (let i = 0; i < limit; i++) {
      if (execution.status === 'canceled') {
        console.log(`[${execution.id}] Canceled`);
        break;
      }
      const b = toBlockArray[i];
      console.log(`[${execution.id}] Blocking ${b}`);
      const lhResult = await getPerformanceForURL(
        browser,
        execution.userAgentOverride,
        execution.url,
        new Set<string>([b]),
        execution.numberOfReports,
        execution.cookies,
        execution.localStorage
      );

      execution.results.push(lhResult);
    }
  }

  await browser.close();
  console.log(`[${execution.id}] Completed`);
  execution.status =
    execution.status === 'running' ? 'complete' : execution.status;
}

/**
 * Attaching cookies to a puppeteer page
 * Expected format of cookie string is one that matches what Chrome shows
 * on the network tab when reviewing a request, ';' separated key=value pairs
 * Example:
 * _octo=HASH123; device_id=IDHERE
 * @param page
 * @param cookies
 */
async function attachCookiesToPage(page: Page, url: string, cookies?: string) {
  if (cookies) {
    const parsedCookies = splitOutData(cookies);
    for (const cookie of Object.keys(parsedCookies)) {
      await page.setCookie({
        name: cookie,
        value: parsedCookies[cookie],
        url: url,
      });
    }
  }
}

/**
 * Creates a map of string to string from inputs in cookie format:
 * a=2;b=3
 * @param s input string to convert to map
 */
export function splitOutData(s: string): {[key: string]: string} {
  const cookies: {[key: string]: string} = {};
  let currentIndex = 0;
  let currentKey = '';
  let currentValue = null;
  while (currentIndex < s.length) {
    if (currentValue === null) {
      if (s[currentIndex] === '=') {
        currentValue = '';
        currentKey = currentKey.trim();
      } else {
        currentKey += s[currentIndex];
      }
    } else if (s[currentIndex] !== ' ' || currentValue.length > 0) {
      if (
        s[currentIndex] === ';' &&
        (currentValue[0] !== '"' ||
          currentValue[currentValue.length - 1] === '"')
      ) {
        currentKey = decodeURIComponent(currentKey);
        cookies[currentKey] = decodeURIComponent(
          cleanParsedValue(currentValue)
        );
        currentKey = '';
        currentValue = null;
      } else {
        currentValue += s[currentIndex];
      }
    }

    currentIndex++;
  }

  if (currentKey && currentValue) {
    cookies[currentKey] = decodeURIComponent(cleanParsedValue(currentValue));
  }

  return cookies;
}

function cleanParsedValue(currentValue: string) {
  currentValue = currentValue.trim();
  if (
    currentValue[0] === '"' &&
    currentValue[currentValue.length - 1] === '"' &&
    currentValue.length > 1
  ) {
    currentValue = currentValue.substring(1, currentValue.length - 1);
  }
  return currentValue;
}

async function attachLocalStorageToPage(page: Page, localStorageData?: string) {
  if (localStorageData) {
    const data = splitOutData(localStorageData);
    await page.evaluateOnNewDocument(data => {
      return new Promise<void>(resolve => {
        for (const ls of Object.keys(data)) {
          localStorage.setItem(ls, data[ls]);
        }
        resolve();
      });
    }, data);
  }
}
