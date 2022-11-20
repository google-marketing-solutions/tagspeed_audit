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
 * @fileoverview Code related to user flow management: Authentication,
 * authoriszation, logout, user change, and JWT token decoding
 */

import {Account, Container, Workspace} from '../models/tag-manager';

// Defined globally to simplify invocation
const localStorage = window.localStorage;

/**
 * Lists all GTM Accounts that a user has access to via the GTM API.
 *
 * @return Promise<void> Resolves whenever the API request has finished
 * and the response has been stored into localStorage
 */
export async function listAccounts() {
  await authorizedXhr('https://www.googleapis.com/tagmanager/v2/accounts')
    .then((xhr: any) => {
      const responseJson = JSON.parse(xhr.responseText);
      localStorage.setItem('accounts', JSON.stringify(responseJson.account));
    })
    .catch((xhr: any) => {
      console.log('failed ' + xhr.status);
    });
}

/**
 * Lists all containers that belong to a GTM Account via the GTM API.
 *
 * @return Promise<void> Resolves whenever the API request has finished
 * and the response has been stored into localStorage
 */
export async function listContainers(parentPath: string) {
  await authorizedXhr(
    'https://www.googleapis.com/tagmanager/v2/' + parentPath + '/containers'
  )
    .then((xhr: any) => {
      console.log();
      const responseJson = JSON.parse(xhr.responseText);
      localStorage.setItem(
        'containers',
        JSON.stringify(responseJson.container)
      );
    })
    .catch((xhr: any) => {
      console.log('failed ' + xhr.status);
    });
}

/**
 * Lists all Workspaces that belong to a GTM Container via the GTM API.
 *
 * @return Promise<void> Resolves whenever the API request has finished
 * and the response has been stored into localStorage
 */
export async function listWorkspaces(parentPath: string) {
  await authorizedXhr(
    'https://www.googleapis.com/tagmanager/v2/' + parentPath + '/workspaces'
  )
    .then((xhr: any) => {
      const responseJson = JSON.parse(xhr.responseText);
      localStorage.setItem(
        'workspaces',
        JSON.stringify(responseJson.workspace)
      );
    })
    .catch((xhr: any) => {
      console.log('failed ' + xhr.status);
    });
}

/**
 * Lists all GTM Tags of a Container via the GTM API.
 *
 * @return Promise<void> Resolves whenever the API request has finished
 * and the response has been stored into localStorage
 */
export async function listTags(parentPath: string) {
  await authorizedXhr(
    'https://www.googleapis.com/tagmanager/v2/' + parentPath + '/tags'
  )
    .then((xhr: any) => {
      const responseJson = JSON.parse(xhr.responseText);
      localStorage.setItem('tags', JSON.stringify(responseJson.tag));
    })
    .catch((xhr: any) => {
      console.log('failed ' + xhr.status);
    });
}

/**
 * Handles network requests with authentication, which is obtained from
 * localStorage as an access token and used as an Authorization Bearer header.
 *
 * @return Promise<XMLHttpRequest> Resolves with the fulfilled request if
 *     successful, and rejects with the status and error message whenever
 *     there's been a failure.
 */
function authorizedXhr(endpoint: string) {
  return new Promise((resolve, reject) => {
    const accessToken = localStorage.getItem('access_token')!;
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        resolve(this);
      } else if (this.readyState === 4 && /^4|5/.test(String(this.status))) {
        reject({
          status: this.status,
          statusText: this.statusText,
        });
      }
    };
    xhr.open('GET', endpoint);
    xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
    xhr.send();
  });
}

/**
 * This function exemplifies the chained usage of the above functions,
 * used for development, meant to be deleted.
 */
function requestGtmObjects() {
  listAccounts()
    .then(() => {
      const accountsStr = localStorage.getItem('accounts');
      const accounts: Account[] = JSON.parse(accountsStr!);
      listContainers(accounts[0].path).then(() => {
        console.log(localStorage.getItem('containers'));
        const containerStr = localStorage.getItem('containers');
        const containers: Container[] = JSON.parse(containerStr!);
        listWorkspaces(containers[0].path).then(() => {
          console.log(localStorage.getItem('workspaces'));
          const workspacesStr = localStorage.getItem('workspaces');
          const workspaces: Workspace[] = JSON.parse(workspacesStr!);
          listTags(workspaces[0].path).then(() => {
            console.log(localStorage.getItem('tags'));
          });
        });
      });
    })
    .catch(reason => {
      console.log(reason);
    });
}

module.exports = {
  listAccounts,
  listContainers,
  listWorkspaces,
  listTags,
};
