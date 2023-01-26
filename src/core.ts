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
import {LHReport, LHResponse} from './types';

export async function doAnalysis(
  url: string,
  userAgent: string,
  maxUrlsToTry: number
) {
  // Use Puppeteer to launch headful Chrome and don't use its default 800x600
  // viewport.
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
  });

  const requests = await extractRequestsFromPage(browser, userAgent, url);

  const responses = new Array<LHResponse>();
  responses.push(await runLHForURL(browser, url, ''));

  // create list of blocking URLs
  const toBlock = new Set<string>();
  for (const r of requests) {
    const url = r.url();
    if (getEntity(url) && toBlock.size < maxUrlsToTry) {
      toBlock.add(url);
    }
  }

  // Lighthouse will open the URL.
  console.log(`Will block ${toBlock.size} URLs`);
  for (const b of toBlock) {
    console.log(`Blocking ${b}`);
    responses.push(await runLHForURL(browser, url, b));
  }

  await browser.close();
  return responses;
}

async function runLHForURL(
  browser: Browser,
  url: string,
  toBlock: string
): Promise<LHResponse> {
  const lhr: LHReport = await lighthouse(url, {
    port: new URL(browser.wsEndpoint()).port,
    output: 'html',
    logLevel: 'error',
    onlyCategories: ['performance', 'best-practices'],
    blockedUrlPatterns: [`*${toBlock}*`],
  });

  const response = await processLighthouseReport(toBlock, lhr);
  const reportUrl = `dist/${response.reportUrl}`;

  if (!fs.existsSync('dist/reports')) {
    fs.mkdirSync('dist/reports');
  }

  fs.writeFileSync(reportUrl, lhr.report);

  return response;
}

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

export async function processLighthouseReport(
  toBlock: string,
  lhr: LHReport
): Promise<LHResponse> {
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
  const consoleErrors = lhr.lhr.audits['errors-in-console'].displayValue
    ? lhr.lhr.audits['errors-in-console'].displayValue
    : 0;
  return {
    blockedURL: toBlock,
    reportUrl: `reports/${reportId}.html`,
    scores: {
      FCP: fcp,
      LCP: lcp,
      CLS: cls,
      consoleErrors: consoleErrors,
    },
  };
}
