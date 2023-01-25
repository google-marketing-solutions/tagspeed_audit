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

async function doAnalysis(
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

  const page = await browser.newPage();
  console.log(userAgent);
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

app.use(express.static('dist'));

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/test/:url', async (req, res) => {
  try {
    const url = decodeURI(req.params.url);
    console.log(`Testing ${url}`);
    const maxUrlsToTry = parseInt((req.query.maxUrlsToTry ?? '10').toString());
    const userAgentOverride = req.query.userAgent
      ? req.query.userAgent.toString()
      : '';
    const response = await doAnalysis(url, userAgentOverride, maxUrlsToTry);
    res.send(response);
  } catch (ex) {
    console.error(ex);
    res.send({error: ex.message});
  }
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
    logLevel: 'error',
    onlyCategories: ['performance', 'best-practices'],
    blockedUrlPatterns: [`*${toBlock}*`],
  });

  if (lhr.audits['first-contentful-paint']['scoreDisplayMode'] === 'error') {
    throw new Error(
      'Lighthouse did not return any metrics. The request may be blocked.'
    );
  }

  const fcp = parseFloat(
    lhr.audits['first-contentful-paint'].displayValue.split(' ')[0]
  );
  const lcp = parseFloat(
    lhr.audits['largest-contentful-paint'].displayValue.split(' ')[0]
  );
  const cls = parseFloat(lhr.audits['cumulative-layout-shift'].displayValue);
  const consoleErrors = lhr.audits['errors-in-console'].displayValue
    ? lhr.audits['errors-in-console'].displayValue
    : 0;
  const response: LHResponse = {
    blockedURL: toBlock,
    scores: {
      FCP: fcp,
      LCP: lcp,
      CLS: cls,
      consoleErrors: consoleErrors,
    },
  };
  return response;
}
