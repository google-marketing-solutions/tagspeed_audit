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
  console.log(`[${execution.id}] Started`);
  try {
    // Use Puppeteer to launch headful Chrome and don't use its default 800x600
    // viewport.
    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
    });

    const requests = await extractRequestsFromPage(
      browser,
      execution.userAgentOverride,
      execution.url,
      execution.cookies
    );

    const baselineLHResult = await getPerformanceForURL(
      browser,
      execution.url,
      '',
      execution.numberOfReports
    );
    execution.results.push(baselineLHResult);

    // create list of blocking URLs
    const toBlockSet = new Set<string>();
    for (const r of requests) {
      const url = r.url();
      if (getEntity(url)) {
        toBlockSet.add(url);
      }
    }

    const toBlock = Array.from(toBlockSet);
    console.log(`[${execution.id}] Will block ${toBlock.length} URLs`);
    const limit =
      execution.maxUrlsToTry === -1
        ? toBlock.length
        : Math.min(execution.maxUrlsToTry, toBlock.length);

    generateReports(browser, toBlock, limit, execution);

    return {
      executionId: execution.id,
      expectedResults: limit + 1,
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
  url: string,
  toBlock: string,
  numberOfReports: number,
  cookies?: string
): Promise<AuditResponse> {
  const responses: AuditResponse[] = [];
  for (let i = 0; i < numberOfReports; i++) {
    const page = await browser.newPage();
    await page.emulate(KnownDevices['iPhone 11']);
    await page.emulateNetworkConditions(PredefinedNetworkConditions['Fast 3G']);
    await attachCookiesToPage(page, url, cookies);

    if (toBlock.length > 0) {
      await page.setRequestInterception(true);
      page.on('request', request => {
        if (request.url().indexOf(toBlock) !== -1) {
          request.abort();
        } else {
          request.continue();
        }
      });
    }
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
      blockedURL: toBlock,
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
  cookies?: string
) {
  const page = await browser.newPage();
  if (userAgent.length > 0) {
    await page.setUserAgent(userAgent);
  }
  attachCookiesToPage(page, url, cookies);

  const requests = new Array<HTTPRequest>();

  await page.setRequestInterception(true);
  await page.setUserAgent(userAgent);
  page.on('request', request => {
    requests.push(request);
    request.continue();
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
  toBlock: string[],
  limit: number,
  execution: AuditExecution
) {
  for (let i = 0; i < limit; i++) {
    if (execution.status === 'canceled') {
      console.log(`[${execution.id}] Canceled`);
      break;
    }
    const b = toBlock[i];
    console.log(`[${execution.id}] Blocking ${b}`);
    const lhResult = await getPerformanceForURL(
      browser,
      execution.url,
      b,
      execution.numberOfReports,
      execution.cookies
    );

    execution.results.push(lhResult);
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
    const parsedCookies = cookies
      .split(';')
      .map(v => v.split('='))
      .reduce((acc, v) => {
        acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
        return acc;
      }, {});

    for (const cookie of Object.keys(parsedCookies)) {
      await page.setCookie({
        name: cookie,
        value: parsedCookies[cookie],
        url: url,
      });
    }
  }
}
