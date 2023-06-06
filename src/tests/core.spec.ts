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
/* eslint prefer-arrow-callback: "off" */

import {assert} from 'chai';
import 'mocha';
import {
  averageCrossReportMetrics,
  extractRequestsFromPage,
  generateReports,
  doAnalysis,
  splitOutData,
} from '../core';
import {AuditExecution, AuditResponse} from '../types';
import puppeteer, {Browser} from 'puppeteer';
import {createServer} from 'http';

describe('analysis should work end to end', function () {
  this.timeout(10000);
  const server = createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(
      '<html><head><title>test</title></head><body><p>test</p><br/>test<script>for (var i = 0; i < 100; i++) document.getElementsByTagName("p")[0].style.marginTop=i+"px"</script></body></html>'
    );
  });
  let browser: Browser;

  before(async function () {
    server.listen(8181);
    browser = await puppeteer.launch({
      headless: 'new',
      defaultViewport: null,
    });
  });

  after(function () {
    server.close();
    browser.close();
  });

  it('should return results', async function () {
    const toBlock = new Set<string>(['test']);
    const limit = 1;
    const execution: AuditExecution = {
      id: 'test',
      url: 'http://localhost:8181',
      userAgentOverride: '',
      numberOfReports: 1,
      status: 'running',
      results: [],
    };
    await generateReports(browser, toBlock, limit, execution);
    assert.equal(execution.status, 'complete');
    assert.equal(execution.results.length, 1);
  });

  it('should run audit asynchronously', async function () {
    const execution: AuditExecution = {
      id: 'test',
      url: 'http://localhost:8181',
      userAgentOverride: '',
      numberOfReports: 1,
      status: 'running',
      results: [],
    };
    
    await doAnalysis(execution);
    assert.equal(execution.status, 'running');
    await new Promise(resolve => {
      setTimeout(() => {
        assert.equal(execution.status, 'complete');
        resolve(null);
      }, 4000);
    });
  });
});

describe('extract requests from URL and identify 3rd party', function () {
  this.timeout(10000);

  const server = createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<html></html>');
  });

  let browser: Browser;

  before(async function () {
    server.listen(8181);
    browser = await puppeteer.launch({
      headless: 'new',
      defaultViewport: null,
    });
  });

  after(function () {
    server.close();
    browser.close();
  });

  it('should extract requests from a page', async () => {
    const requests = await extractRequestsFromPage(
      browser,
      '',
      'http://localhost:8181'
    );
    assert.equal(requests.length, 2);
  });
});

describe('process results of having run analysis', () => {
  it('should average stats from multiple reports', () => {
    const response1: AuditResponse = {
      id: 'test1',
      blockedURL: '',
      reportUrl: '',
      scores: {
        LCP: 3,
        FCP: 3,
        CLS: 3,
        consoleErrors: 0,
      },
    };
    const response2: AuditResponse = {
      id: 'test2',
      blockedURL: '',
      reportUrl: '',
      scores: {
        LCP: 5,
        FCP: 3,
        CLS: 3,
        consoleErrors: 0,
      },
    };
    const result = averageCrossReportMetrics([response1, response2]);
    assert.equal(result.scores.LCP, 4);
    assert.equal(result.scores.FCP, 3);
    assert.equal(result.scores.CLS, 3);
    assert.equal(result.scores.consoleErrors, 0);
  });
});

describe('handle cookies and localstorage', () => {
  it('should parse input from UI correctly', () => {
    const test = splitOutData('a=2;b=4');

    assert.equal(test['a'], '2');
    assert.equal(test['b'], '4');
  });

  it('should parse input from UI when "" are used', () => {
    const test = splitOutData('a="2";b="4"');

    assert.equal(test['a'], '2');
    assert.equal(test['b'], '4');
  });

  it('should parse input from UI when "" encoded are used', () => {
    const test = splitOutData('a="%22test%22";b="4"');
    console.log(test);
    assert.equal(test['a'], '"test"');
    assert.equal(test['b'], '4');
  });

  it('should parse input from UI when ; are used', () => {
    const test = splitOutData('a="test;test2";b="test;test3"');

    assert.equal(test['a'], 'test;test2');
    assert.equal(test['b'], 'test;test3');
  });

  it('should parse when all casess are used at same time', () => {
    const test = splitOutData('a= "test; test2";b = "%22test;test3%22"');

    assert.equal(test['a'], 'test; test2');
    assert.equal(test['b'], '"test;test3"');
  });
});
