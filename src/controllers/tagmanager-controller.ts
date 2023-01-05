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

/**
 * @fileoverview Code related accessing the Google Tag Manager API
 */

import { resolve } from 'path';
import {Account, Container, Tag, Trigger, Workspace} from '../models/tag-manager';

// Defined globally to simplify invocation
const localStorage = window.localStorage;

// GTM Read functions

/**
 * Lists all GTM Accounts that a user has access to via the GTM API.
 *
 * @return Promise<void> Resolves whenever the API request has finished
 * and the response has been stored into localStorage
 */
export async function fetchAccounts() {
  await authorizedXhr('https://www.googleapis.com/tagmanager/v2/accounts').then(
    xhr => {
      const responseJson = JSON.parse(xhr.responseText);
      localStorage.setItem('accounts', JSON.stringify(responseJson.account));
    }
  );
}

/**
 * Lists all containers that belong to a GTM Account via the GTM API.
 *
 * @return Promise<void> Resolves whenever the API request has finished
 * and the response has been stored into localStorage
 */
export async function fetchContainers(parentPath: string) {
  await authorizedXhr(
    'https://www.googleapis.com/tagmanager/v2/' + parentPath + '/containers'
  ).then(xhr => {
    console.log();
    const responseJson = JSON.parse(xhr.responseText);
    localStorage.setItem('containers', JSON.stringify(responseJson.container));
  });
}

/**
 * Lists all Workspaces that belong to a GTM Container via the GTM API.
 *
 * @return Promise<void> Resolves whenever the API request has finished
 * and the response has been stored into localStorage
 */
export async function fetchWorkspaces(containerPath: string) {
  await authorizedXhr(
    'https://www.googleapis.com/tagmanager/v2/' + containerPath + '/workspaces'
  ).then(xhr => {
    const responseJson = JSON.parse(xhr.responseText);
    localStorage.setItem('workspaces', JSON.stringify(responseJson.workspace));
  });
}

/**
 * Lists all GTM Triggers of a Container via the GTM API.
 *
 * @return Promise<void> Resolves whenever the API request has finished
 * and the response has been stored into localStorage
 */
export async function fetchTriggers(workspacePath: string) {
  await authorizedXhr(
    'https://www.googleapis.com/tagmanager/v2/' + workspacePath + '/tags'
  ).then(xhr => {
    const responseJson = JSON.parse(xhr.responseText);
    localStorage.setItem('tags', JSON.stringify(responseJson.tag));
  });
}

/**
 * Lists all GTM Tags of a Container via the GTM API.
 *
 * @return Promise<void> Resolves whenever the API request has finished
 * and the response has been stored into localStorage
 */
export async function fetchTags(workspacePath: string) {
  await authorizedXhr(
    'https://www.googleapis.com/tagmanager/v2/' + workspacePath + '/tags'
  ).then(xhr => {
    const responseJson = JSON.parse(xhr.responseText);
    localStorage.setItem('tags', JSON.stringify(responseJson.tag));
  });
}

// GTM Write functions
export async function createWorkspace(containerPath: string) {
  const body = {name: 'tagspeed'};
  const bodyString = JSON.stringify(body);
  await authorizedXhr(
    `https://www.googleapis.com/tagmanager/v2/${containerPath}/workspaces`,
    bodyString
  ).then(xhr => {
    const responseJson = JSON.parse(xhr.responseText);
    localStorage.setItem('tagspeed-workspace', JSON.stringify(responseJson));
  });
}

// API reference wants this to be a POST, but without body
export async function syncWorkspace(workspacePath: string) {
  await authorizedXhr(
    `https://www.googleapis.com/tagmanager/v2/${workspacePath}:sync`,
    '{}'
  ).then(xhr => {
    console.log(xhr);
  });
}

export async function createTrigger(workspacePath: string, trigger: Trigger) {
  const bodyJson = JSON.stringify(trigger);
  await authorizedXhr(
    `https://www.googleapis.com/tagmanager/v2/${workspacePath}/triggers`,
    bodyJson
  ).then(xhr => {
    console.log(xhr);
  });
}

export async function createTag(workspacePath: string, tag: Tag) {
  const bodyJson = JSON.stringify(tag);
  await authorizedXhr(
    `https://www.googleapis.com/tagmanager/v2/${workspacePath}/tags`,
    bodyJson
  ).then(xhr => {
    console.log(xhr);
  });
}

// GTM Delete functions
export async function deleteWorkspace(workspacePath: string) {
  await authorizedXhr(
    `https://www.googleapis.com/tagmanager/v2/${workspacePath}`,
    undefined,
    true
  ).then(xhr => {
    console.log(xhr);
  });
}


// Underlying XHR Helper

/**
 * Handles network requests with authentication, which is obtained from
 * localStorage as an access token and used as an Authorization Bearer header.
 *
 * It uses an optional parameter to include a body in case of being a POST request.
 * Following the MDN specification for XMLHttpRequest, if the body is empty,
 * it sends a null value.
 *
 * @return Promise<XMLHttpRequest> Resolves with the fulfilled request if
 *     successful, and rejects with the status and error message whenever
 *     there's been a failure.
 */
function authorizedXhr(endpoint: string, body?: string, deleteMethod?:boolean): Promise<XMLHttpRequest> {
  let method = 'GET';
  if (body) {
    method = 'POST';
  } else if (deleteMethod) {
    method = 'DELETE';
  } else {
    body = undefined;
  }
  return new Promise((resolve, reject) => {
    const accessToken = localStorage.getItem('access_token')!;
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        resolve(this);
      } else if (this.readyState === 4 && /^4|5/.test(String(this.status))) {
        const error = JSON.parse(this.responseText);
        reject({
          code: this.status,
          message: error.message,
          status: error.status,
        });
      }
    };
    xhr.open(method, endpoint);
    xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
    xhr.send(body);
  });
}

module.exports = {
  fetchAccounts,
  fetchContainers,
  fetchWorkspaces,
  fetchTags,
  createWorkspace,
  syncWorkspace,
  deleteWorkspace,
  createTag,
};
