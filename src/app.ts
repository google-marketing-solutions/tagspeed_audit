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
import express from 'express';
import lighthouse from 'lighthouse';
import puppeteer, {Browser, HTTPRequest} from 'puppeteer';
import {getEntity} from 'third-party-web';
import path from 'path';
import {URL} from 'url';
const app = express();
const port = 3000;

type LHResponse = {
  blockedURL: string;
  scores: {
    LCP: number;
    FID: number;
    CLS: number;
    consoleErrors: number;
  };
};

async function doAnalysis(url: string) {
  // Use Puppeteer to launch headful Chrome and don't use its default 800x600
  // viewport.
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
  });

  const page = await browser.newPage();
  const requests = new Array<HTTPRequest>();

  await page.setRequestInterception(true);

  page.on('request', request => {
    requests.push(request);
  });

  await page.goto(url, {
    waitUntil: 'networkidle0',
  });

  await page.close();

  const responses = new Array<LHResponse>();
  responses.push(await runLHForURL(browser, url, ''));

  // create list of blocking URLs
  const toBlock = new Set<string>();
  for (const r of requests) {
      const url = r.url();
      if (getEntity(url)) {
        toBlock.add(url);
      }
  }

  // Lighthouse will open the URL.
  // Puppeteer will observe `targetchanged` and inject our stylesheet.

  for (const b of toBlock) {
    responses.push(await runLHForURL(browser, url, b));
  }

  await browser.close();
  return responses;
}

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/test/:url', async (req, res) => {
  const url = decodeURI(req.params.url);
  console.log(`Testing ${url}`);
  const response = await doAnalysis(url);

  res.send(response);
});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});

async function runLHForURL(
  browser: Browser,
  url: string,
  toBlock: string
): Promise<LHResponse> {
  const {lhr} = await lighthouse(url, {
    port: new URL(browser.wsEndpoint()).port,
    output: 'json',
    logLevel: 'info',
    blockedUrlPatterns: [`*${toBlock}*`],
  });

  const response: LHResponse = {
    blockedURL: toBlock,
    scores: {
      FID: lhr.audits['first-contentful-paint'].displayValue,
      LCP: lhr.audits['largest-contentful-paint'].displayValue,
      CLS: lhr.audits['cumulative-layout-shift'].displayValue,
      consoleErrors: lhr.audits['errors-in-console'].displayValue
        ? lhr.audits['errors-in-console'].displayValue
        : 0,
    },
  };
  return response;
}
