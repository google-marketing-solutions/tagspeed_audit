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

import {Tag, Workspace} from '../models/tag-manager';

import {createTag, createWorkspace, deleteWorkspace, fetchTags, syncWorkspace} from './tagmanager-controller';

/**
 * @fileoverview Code related to the execution of the tagspeed tests
 */


/**
 * Runs a Tagspeed test for a set of tags.
 * This will be ran in a new workspace
 */
export async function runTestForTags(containerPath: string, tags: Tag[]) {
  try {
    //await createWorkspace(containerPath);
    const tagspeedWorkspaceString =
        localStorage.getItem('tagspeed-workspace') ?? '';
    const tagspeedWorkspace = JSON.parse(tagspeedWorkspaceString) as Workspace;
    await syncWorkspace(tagspeedWorkspace.path);
    for (let testTag of tags) {
      createTag(tagspeedWorkspace.path, testTag);
    }
    await fetchTags(tagspeedWorkspace.path);
    deleteWorkspace(tagspeedWorkspace.path);
  } catch (error) {
    console.log(error);
  }
}