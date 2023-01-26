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

import {expect} from 'chai';
import 'mocha';
import {processLighthouseReport} from '../core';
import {LHReport} from '../types';

describe('core lighthouse report processing', () => {
  it('parse response from lighthouse and create data for UI', async () => {
    const report: LHReport = {
      report: '<html></html>',
      lhr: {
        audits: {
          'first-contentful-paint': {
            displayValue: '1 s',
            scoreDisplayMode: 'ok',
          },
          'largest-contentful-paint': {
            displayValue: '2 s',
            scoreDisplayMode: 'ok',
          },
          'cumulative-layout-shift': {
            displayValue: '0.1',
            scoreDisplayMode: 'ok',
          },
          'errors-in-console': {
            displayValue: undefined,
            scoreDisplayMode: 'ok',
          },
        },
      },
    };
    const response = await processLighthouseReport('http://test', report);
    expect(response.scores.FCP).to.equal(1.0);
    expect(response.scores.LCP).to.equal(2.0);
    expect(response.scores.CLS).to.equal(0.1);
    expect(response.scores.consoleErrors).to.equal(0);
  });
});
