/*
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {resolve} from 'dns';
import {finished} from 'stream';
import {compileFunction} from 'vm';
import {Metric} from 'web-vitals';
import {Container, ProtoTag, Tag, TestResult, Workspace} from '../models/tag-manager';
import {
  createTag,
  createTrigger,
  createWorkspace,
  deleteWorkspace,
  fetchTags,
  getTrigger,
  updateTag,
} from './tagmanager-controller';

/**
 * @fileoverview Code related to the execution of the tagspeed tests
 */

// TODO: Update this with the origin the app is deployed to
const DEPLOYMENT_ORIGIN = 'FIX_ME';

type TriggerMap = {[key: string | number]: string};

declare global {
  interface Window {
    currentResult: TestResult;
  }
}

/**
 * Creates a listener for messages from the window being tested.
 */
function createMessageListener(origin: string) {
  function messageEventListener(event: MessageEvent) {
    if (event.origin !== origin) return;
    if (event.data === 'test-completed') {
      const finishedEvent = new CustomEvent('test-finished');
      const testResults = document.getElementsByTagName('test-results')[0];
      testResults.dispatchEvent(finishedEvent);
    } else {
      const metric = JSON.parse(event.data) as Metric;
      window.currentResult[metric.name] = metric.value;
    }
  }
}

/**
 * Adds the GTM tag that sends the metrics to the app to the container.
 */
async function addTagspeedTag(workspace: Workspace) {
  const tagspeedTag: ProtoTag = {
    name: 'tagspeed-tag',
    path: workspace.path,
    type: 'html',
    consentSettings: {
      consentStatus: 'notNeeded',
    },
    priority: {
      type: 'integer',
      value: '700',
    },
    parameter: [
    {
      type: 'template',
      key: 'html',
      value: `<script src='${DEPLOYMENT_ORIGIN}/gtm_tag.js' async>`
    }],
  };
  await createTag(workspace.path, tagspeedTag);
}

/**
 * Runs a Tagspeed test for a set of tags.
 */
export async function runTestForTags(tags: Tag[], url: URL) {
  createMessageListener(url.origin);
  try {
    window.currentResult = {
      tagID: 'baseline',
      tagName: 'baseline',
      LCP: 0,
      FID: 0,
      CLS: 0,
      INP: 0,
      FCP: 0,
      TTFB: 0,
    };
    window.open(url);
    await waitForTestFinished();
    localStorage.setItem('baseline-result', JSON.stringify(window.currentResult));

    for (const t of tags) {
      window.currentResult = {
        tagID: t.tagId || 'broken_tag',
        tagName: t.name,
        LCP: 0,
        FID: 0,
        CLS: 0,
        INP: 0,
        FCP: 0,
        TTFB: 0,
      };
      t.paused = true;
      await updateTag(t);
      window.open(url, '_blank');
      await waitForTestFinished();
      const results = JSON.parse(
        localStorage.getItem('test-results') || '{}'
      ) as Map<string, TestResult>;
      results.set(t.tagId || 'broken_tag', window.currentResult);
      t.paused = false;
      await updateTag(t);
    }
  } catch (error) {
    console.log(error);
  }
}

/**
 * Returns a promise that resolves when the test-finished message arrives.
 */
function waitForTestFinished() {
  return new Promise<void>(resolve => {
    const listener = () => {
      document.removeEventListener('test-finished', listener);
      resolve();
    };
    document.addEventListener('test-finished', listener);
  });
}

//Workspace creation seems to fail without a specific error if the number of
//workspaces has reached 3 for non-360 accounts.
//TODO: Check logic behind this
export async function createWorkspaceForTest(
  testedWorkspace: Workspace,
  parentContainer: Container,
  tags: Tag[]
): Promise<Workspace> {
  const tagspeedWorkspace = await createWorkspace(parentContainer.path);
  setTimeout(async () => {
    await updateTriggersForTags(tagspeedWorkspace, testedWorkspace, tags);
    for (let testTag of tags) {
      let tag = await createTag(tagspeedWorkspace.path, testTag);
      console.log(tag.tagId);
    }
  }, 3000);

  return tagspeedWorkspace;
}

async function updateTriggersForTags(
  tagspeedWorkspace: Workspace,
  testedWorkspace: Workspace,
  tags: Tag[]
) {
  const tagMap: TriggerMap = {};
  for (let tag of tags) {
    let currentFiringTriggerIdList = tag.firingTriggerId || [];
    let currentBlockingTriggerIdList = tag.blockingTriggerId || [];
    updateTriggerListForTag(
      testedWorkspace,
      tagspeedWorkspace,
      tag,
      currentFiringTriggerIdList,
      tagMap
    );
    updateTriggerListForTag(
      testedWorkspace,
      tagspeedWorkspace,
      tag,
      currentBlockingTriggerIdList,
      tagMap
    );
  }
}

async function updateTriggerListForTag(
  testedWorkspace: Workspace,
  tagspeedWorkspace: Workspace,
  tag: Tag,
  triggerIdList: [string],
  tagMap: TriggerMap
) {
  for (let firingId of triggerIdList) {
    let idIndex = tag.firingTriggerId.indexOf(firingId);
    if (Object.keys(tagMap).includes(firingId)) {
      tag.firingTriggerId[idIndex] = tagMap[firingId];
    } else {
      let originalTriggerPath = testedWorkspace.path + '/triggers/' + firingId;
      let originalTrigger = await getTrigger(originalTriggerPath);
      let newTriggerInTagspeedWorkspace = await createTrigger(
        tagspeedWorkspace.path,
        originalTrigger
      );
      tagMap[firingId] = newTriggerInTagspeedWorkspace.triggerId;
      tag.firingTriggerId[idIndex] = tagMap[firingId];
    }
  }
}
