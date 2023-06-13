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
import fs from 'fs';
import lighthouse from 'lighthouse';
import puppeteer, {Browser, HTTPRequest} from 'puppeteer';
import {getEntity} from 'third-party-web';
import {URL} from 'url';
import {v4 as uuidv4} from 'uuid';
import {AuditExecution, ExecutionResponse, LHReport, LHResponse} from './types';

/**
 * Identify all network requests done by a page, filter out those that are
 * 3rd parties, then block the 3rd party URLs one by one and run a lighthouse
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
      execution.url
    );

    execution.results.push(
      await runLHForURL(browser, execution.url, '', execution.numberOfReports)
    );

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
 * Execute Lighthouse against URL, blocking specific pattern from `toBlock`
 * and writing final HTML report to disk.
 * @param browser
 * @param url
 * @param toBlock
 * @returns
 */
async function runLHForURL(
  browser: Browser,
  url: string,
  toBlock: string,
  numberOfReports: number
): Promise<LHResponse> {
  const responses: LHResponse[] = [];
  for (let i = 0; i < numberOfReports; i++) {
    const lhr: LHReport = await lighthouse(url, {
      port: new URL(browser.wsEndpoint()).port,
      output: 'html',
      logLevel: 'error',
      onlyAudits: [
        'first-contentful-paint',
        'largest-contentful-paint',
        'cumulative-layout-shift',
        'total-blocking-time',
        'errors-in-console',
      ],
      blockedUrlPatterns: toBlock && toBlock.length > 0 ? [`*${toBlock}*`] : [],
    });
    responses.push(await processLighthouseReport(toBlock, lhr));

    if (!fs.existsSync('dist/reports')) {
      fs.mkdirSync('dist/reports');
    }

    fs.writeFile(`dist/${responses[0].reportUrl}`, lhr.report, () => {
      console.log(`Wrote to disk: dist/${responses[0].reportUrl}`);
    });
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
async function extractRequestsFromPage(
  browser: Browser,
  userAgent: string,
  url: string
) {
  const page = await browser.newPage();
  if (userAgent.length > 0) {
    await page.setUserAgent(userAgent);
  }
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
export function averageCrossReportMetrics(responses: LHResponse[]): LHResponse {
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

  const TBT = Math.round(
    responses.map(r => r.scores.TBT).reduce((r1, r2) => r1 + r2, 0) /
      responses.length
  );

  const consoleErrors = Math.round(
    responses.map(r => r.scores.consoleErrors).reduce((r1, r2) => r1 + r2, 0) /
      responses.length
  );

  return {
    id: responses[0].id,
    blockedURL: responses[0].blockedURL,
    reportUrl: responses[0].reportUrl,
    scores: {
      FCP: FCP,
      LCP: LCP,
      CLS: CLS,
      TBT: TBT,
      consoleErrors: consoleErrors,
    },
  };
}

/**
 * Extract relevant data from result return by the lighthouse library.
 * @param toBlock
 * @param lhr
 * @returns
 */
export function processLighthouseReport(
  toBlock: string,
  lhr: LHReport
): LHResponse {
  if (
    lhr.lhr.audits['first-contentful-paint']['scoreDisplayMode'] === 'error'
  ) {
    throw new Error(
      'Lighthouse did not return any metrics. The request may be blocked.'
    );
  }

  const reportId = uuidv4();

  const fcp = parseFloat(
    lhr.lhr.audits['first-contentful-paint'].displayValue.split(' ')[0]
  );
  const lcp = parseFloat(
    lhr.lhr.audits['largest-contentful-paint'].displayValue.split(' ')[0]
  );
  const cls = parseFloat(
    lhr.lhr.audits['cumulative-layout-shift'].displayValue
  );
  const tbt = lhr.lhr.audits['total-blocking-time'].numericValue;

  const consoleErrors =
    lhr.lhr.audits['errors-in-console'].details.items.length;
  return {
    id: reportId,
    blockedURL: toBlock,
    reportUrl: `reports/${reportId}.html`,
    scores: {
      FCP: fcp,
      LCP: lcp,
      CLS: cls,
      TBT: tbt,
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
async function generateReports(
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
    execution.results.push(
      await runLHForURL(browser, execution.url, b, execution.numberOfReports)
    );
  }

  await browser.close();
  console.log(`[${execution.id}] Completed`);
  execution.status =
    execution.status === 'running' ? 'complete' : execution.status;
}
