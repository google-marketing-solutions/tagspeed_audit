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

import {LitElement, html, css} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {map} from 'lit/directives/map.js';
import {Account, Container, Workspace} from '../models/tag-manager';
import {
  fetchAccounts,
  fetchContainers,
  fetchWorkspaces,
} from '../controllers/tagmanager-controller';
import {User} from '../models/user';
import {authoriseUser} from '../controllers/user-controller';

@customElement('selector-list')
export class SelectorList extends LitElement {
  @state() currentAccount: Account | null;
  @state() currentContainer: Container | null;
  @state() currentWorkspace: Workspace | null;
  @state() accountList: Array<Account>;
  @state() containerList: Array<Container>;
  @state() workspaceList: Array<Workspace>;

  static styles = css`
    .card {
      margin: 2%;
      padding: 2%;
      border: 2px #ccc solid;
      border-radius: 0.6em;
      background-color: white;
    }

    .selected {
      background-color: lightblue;
    }

    ul {
      list-style: none;
    }

    section {
      margin: 2%;
      padding: 2%;
      border: 2px #ccc solid;
      border-radius: 0.6em;
      background-color: white;
    }
  `;

  constructor() {
    super();
    this.currentAccount = null;
    this.currentContainer = null;
    this.currentWorkspace = null;
    this.accountList = [];
    this.containerList = [];
    this.workspaceList = [];
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.getAccounts(); // We show accounts as soon as the component connects.
  }

  async getAccounts() {
    try {
      await fetchAccounts();
    } catch {
      this.updateAuthorisation();
    }
    const accountString = localStorage.getItem('accounts') ?? '';
    this.accountList = JSON.parse(accountString) as Account[];
  }

  async getContainers(path: string) {
    this.currentContainer = null;
    this.currentWorkspace = null;
    this.containerList = [];
    this.workspaceList = [];
    try {
      await fetchContainers(path);
    } catch {
      this.updateAuthorisation();
    }
    const containerString = localStorage.getItem('containers') ?? '';
    this.containerList = JSON.parse(containerString) as Container[];
    this.renderRoot.querySelector('#container-list')?.scrollIntoView(true);
  }

  async getWorkspaces(path: string) {
    this.currentWorkspace = null;
    this.workspaceList = [];
    try {
      await fetchWorkspaces(path);
    } catch {
      this.updateAuthorisation();
    }
    const workspaceString = localStorage.getItem('containers') ?? '';
    this.workspaceList = JSON.parse(workspaceString) as Workspace[];
    this.renderRoot.querySelector('#workspace-list')?.scrollIntoView(true);
  }

  updateAuthorisation() {
    const userString = localStorage.getItem('logged-in') ?? '';
    if (!userString) {
      console.error('selector-list - USER WENT MISSING!');
    }
    const user = JSON.parse(userString) as User;
    authoriseUser(user);
  }

  accountListContent() {
    return html`
      <section id="acccount-list">
        <h3>Choose an account</h3>
        <ul>
          ${map(
            this.accountList,
            acc => html` <li>
              <div
                class="card ${acc === this.currentAccount ? 'selected' : ''}"
                @click=${() => {
                  this.currentAccount = acc;
                  this.getContainers(acc.path);
                }}
              >
                <span class="account-name">${acc.name}</span>
                <span>${acc.accountId}</span>
              </div>
            </li>`
          )}
        </ul>
      </section>
    `;
  }

  containerListContent() {
    if (this.currentAccount) {
      return html`
        <section id="container-list">
          <h3>Choose a container</h3>
          <ul>
            ${map(
              this.containerList,
              c => html` <li>
                <div
                  class="card ${c === this.currentContainer ? 'selected' : ''}"
                  @click=${() => {
                    this.currentContainer = c;
                    this.getWorkspaces(c.path);
                  }}
                >
                  ${c.name} ${c.publicId} ${c.notes}
                </div>
              </li>`
            )}
          </ul>
        </section>
      `;
    } else {
      return '';
    }
  }

  workspaceListContent() {
    if (this.currentContainer) {
      return html`
        <section id="workspace-list">
          <h3>Choose a workspace</h3>
          <ul>
            ${map(
              this.workspaceList,
              ws => html` <li>
                <div
                  class="card ${ws === this.currentWorkspace ? 'selected' : ''}"
                  @click=${() => {
                    this.currentWorkspace = ws;
                  }}
                >
                  ${ws.name} ${ws.description}
                </div>
              </li>`
            )}
          </ul>
          <button>Select Workspace</button>
        </section>
      `;
    } else {
      return '';
    }
  }

  render() {
    return html` ${this.accountListContent()} ${this.containerListContent()}
    ${this.workspaceListContent()}`;
  }
}
