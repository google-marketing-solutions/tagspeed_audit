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
import puppeteer, {Browser} from 'puppeteer';
import {getEntity} from 'third-party-web';
const path = require('path');
const {URL} = require('url');
const request_client = require('request-promise-native');
const app = express();
const port = 3000;

type Result = {
  url: string;
};

type LHResponse = {
  blockedURL: string;
  scores: {
    LCP: number;
    FID: number;
    CLS: number;
    consoleErrors: number;
  };
};

async function doAnalysis(url) {
  // Use Puppeteer to launch headful Chrome and don't use its default 800x600
  // viewport.
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
  });

  const page = await browser.newPage();
  const result: Result[] = new Array<Result>();

  await page.setRequestInterception(true);

  page.on('request', request => {
    request_client({
      uri: request.url(),
      resolveWithFullResponse: true,
    })
      .then(_ => {
        const request_url = request.url();

        result.push({
          url: request_url,
        });

        request.continue();
      })
      .catch(error => {
        console.error(error);
        request.abort();
      });
  });

  await page.goto(url, {
    waitUntil: 'networkidle0',
  });

  await page.close();

  const responses = new Array<LHResponse>();
  responses.push(await runLHForURL(browser, url, ''));

  // create list of blocking URLs
  const toBlock = new Set<string>();
  for (const r of result) {
    if (getEntity(r.url)) {
      toBlock.add(r.url);
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
