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
 * @fileoverview A component to display a simple list that you can select one
 * option from.
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators';
import { map } from 'lit/directives/map';

interface Account {
  path: string;
  accountId: string;
  name: string;
  shareData: boolean;
  fingerprint: string;
  tagManagerUrl: string;
  features: {
    supportUserPermissions: boolean;
    supportMultipleContainers: boolean;
  }
};

interface Container {
  path: string;
  accountId: string;
  containerId: string;
  name: string;
  domainName: [string];
  publicId: string;
  tagIds: [string];
  features: {
    supportUserPermissions: boolean;
    supportEnvironments: boolean;
    supportWorkspaces: boolean;
    supportGtagConfigs: boolean;
    supportBuiltInVariables: boolean;
    supportClients: boolean;
    supportFolders: boolean;
    supportTags: boolean;
    supportTemplates: boolean;
    supportTriggers: boolean;
    supportVariables: boolean;
    supportVersions: boolean;
    supportZones: boolean;
  };
  notes: string;
  usageContext: [string];
  fingerprint: string;
  tagManagerUrl: string;
  taggingServerUrls: [string];
};

interface Workspace {
  path: string;
  accountId: string;
  containerId: string;
  workspaceId: string;
  name: string;
  description: string;
  fingerprint: string;
  tagManagerUrl: string;
};

@customElement('selector-list')
export class SelectorList extends LitElement {

  @state() currentAccount = '';
  @state() currentContainer = '';
  @state() currentWorkspace = '';

  static styles = css`
    .card {
      margin: .75em;
      padding: .75em;
      border-radius: 3px;
      border: 2px #ccc solid;
      border-radius: .6em;
      background-color: white;
    }
`;

  accountList() {
    const accountString = localStorage.getItem('accounts') ?? '';
    const accounts = JSON.parse(accountString) as Account[];

    return html`
      <ul>
      ${map(accounts, (acc) => html`
        <li>
          <div class="card" @click=${this.fetchContainers(acc.path)}>
            <span class="account-name">${acc.name}</span>
            <span>${acc.accountId}</span>
          </div>
        </li>`)}
      </ul>
    `;
  }

  constainerList() {
    const containerString = localStorage.getItem('containers') ?? '';
    const containers = JSON.parse(containerString) as Container[];

    return html`
      <ul>
        ${map(containers, (c) => html`
          <li>
            <div class="card" @click=${this.fetchWorkspaces(c.path)}>
              ${c.name} ${c.publicId} ${c.notes}
            </div>
          </li>`)}
      </ul>
    `;
  }

  workspaceList() {
    const workspaceString = localStorage.getItem('workspaces') ?? '';
    const workspaces = JSON.parse(workspaceString) as Workspace[];

    return html`
      <ul>
        ${map(workspaces, (ws) => html`
          <li>
            <div class="card" @click=${this.currentWorkspace = ws.workspaceId}>
            ${ws.name} ${ws.description}
            </div>
          </li>
        `)}
      </ul>
      <button>Select Workspace</button>
    `;


  }



  render() {

  }
}
