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
import path from 'path';
import {doAnalysis, identifyThirdParties} from './core';
import {AuditExecution} from './types';
import {v4 as uuidv4} from 'uuid';
import cors from 'cors';

const app = express();
const port = 3000;
const executions: AuditExecution[] = [];

app.use(express.static('dist'));
app.use(express.json()); // to support JSON-encoded bodies
app.use(cors());

/**
 * Static files.
 */
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
});

/**
 * Poll for the status of an execution.
 */
app.get('/status/:id', async (req, res) => {
  const execution = executions.find(e => e.id === req.params.id);
  if (execution) {
    res.send(execution);
  } else {
    res.sendStatus(404);
  }
});

/**
 * Cancel an execution which the should kill the
 * browser in the background with the next tests that would be run.
 */
app.get('/cancel/:id', (req, res) => {
  const execution = executions.find(e => e.id === req.params.id);
  if (execution) {
    execution.status = 'canceled';
    res.send(execution);
  } else {
    res.sendStatus(404);
  }
});

/**
 * Returns a list of 3rd parties identified given:
 * url: string;
 */
app.post('/analyse-urls', async (req, res) => {
  try {
    console.log(req.body);
    const execution = extractFromRequest(req.body);

    const identifiedThirdParties = await identifyThirdParties(execution);
    res.send({
      identifiedThirdParties: Array.from(identifiedThirdParties),
    });
  } catch (ex) {
    console.error(ex);
    res.send({error: ex.message});
  }
});

/**
 * Run analysys request containing:
 * url: string;
 * userAgent: string;
 * maxUrlsToTry?: number;
 * numberOfReports: number;
 * cookies?: string;
 * localStorage?: string;
 * blockAll?: boolean;
 * blockSpecificUrls?: string[]
 */
app.post('/test', async (req, res) => {
  try {
    console.log(req.body);
    const execution = extractFromRequest(req.body);
    const analysisResponse = await doAnalysis(execution);

    executions.push(execution);
    res.send(analysisResponse);
  } catch (ex) {
    console.error(ex);
    res.send({error: ex.message});
  }
});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});

/**
 * Extract an AuditExecution from a POST request.
 * @param body from a request
 */
function extractFromRequest(body: AuditExecution) {
  body.id = uuidv4();
  body.status = 'running';
  body.results = [];
  body.url = decodeURI(body.url);
  body.maxUrlsToTry = !body.maxUrlsToTry ? -1 : body.maxUrlsToTry;
  body.numberOfReports = !body.numberOfReports ? -1 : body.numberOfReports;
  body.userAgentOverride = body.userAgentOverride
    ? body.userAgentOverride.trim()
    : '';

  return body;
}
