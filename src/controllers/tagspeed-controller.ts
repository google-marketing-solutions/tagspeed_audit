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

import {Container, Tag, Workspace} from '../models/tag-manager';
import {
  createTag,
  createTrigger,
  createWorkspace,
  deleteWorkspace,
  fetchTags,
  getTrigger,
} from './tagmanager-controller';

/**
 * @fileoverview Code related to the execution of the tagspeed tests
 */

type TriggerMap = {[key: string | number]: string};

/**
 * Runs a Tagspeed test for a set of tags.
 * This will be ran in a new workspace
 */
export async function runTestForTags(
  testedWorkspace: Workspace,
  parentContainer: Container,
  tags: Tag[]
) {
  try {
    const tagspeedWorkspace = await createWorkspaceForTest(
      testedWorkspace,
      parentContainer,
      tags
    );
    const tagspeedTagList = await fetchTags(tagspeedWorkspace.path);
    
    deleteWorkspace(tagspeedWorkspace.path);
  } catch (error) {
    console.log(error);
  }
}

//Workspace creation seems to fail without a specific error if the number of workspaces has reached a certain limit.
//TODO: Check logic behind this
async function createWorkspaceForTest(
  testedWorkspace: Workspace,
  parentContainer: Container,
  tags: Tag[]
): Promise<Workspace> {
  const tagspeedWorkspace = await createWorkspace(parentContainer.path);
  await updateTriggersForTags(tagspeedWorkspace, testedWorkspace, tags);
  for (let testTag of tags) {
    let tag = await createTag(tagspeedWorkspace.path, testTag);
    console.log(tag.tagId);
  }
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
