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
import {doAnalysis} from './core';
import {AuditExecution} from './types';
import {v4 as uuidv4} from 'uuid';

const app = express();
const port = 3000;
const executions: AuditExecution[] = [];

app.use(express.static('dist'));

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/status/:id', async (req, res) => {
  const execution = executions.find(e => e.id === req.params.id);
  if (execution) {
    res.send(execution);
  } else {
    res.sendStatus(404);
  }
});

app.get('/cancel/:id', (req, res) => {
  const execution = executions.find(e => e.id === req.params.id);
  if (execution) {
    execution.status = 'canceled';
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.get('/test/:url', async (req, res) => {
  try {
    const url = decodeURI(req.params.url);
    console.log(`Testing ${url}`);
    const maxUrlsToTry = parseInt((req.query.maxUrlsToTry ?? '-1').toString());
    const numberOfReports = parseInt(
      (req.query.numberOfReports ?? '1').toString()
    );
    const userAgentOverride = req.query.userAgent
      ? req.query.userAgent.toString()
      : '';
    const execution: AuditExecution = {
      id: uuidv4(),
      url: url,
      numberOfReports: numberOfReports,
      userAgentOverride: userAgentOverride,
      maxUrlsToTry: maxUrlsToTry,
      results: [],
      status: 'running',
    };
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
