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

const app = express();
const port = 3000;

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
