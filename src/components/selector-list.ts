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
import {Account, Container, Tag, Workspace} from '../models/tag-manager';
import {
  fetchContainers,
  fetchWorkspaces,
  createTag,
  fetchTags,
} from '../controllers/tagmanager-controller';
import {User} from '../models/user';
import {authoriseUser} from '../controllers/user-controller';
import {create} from 'domain';
import {runTestForTags} from '../controllers/tagspeed-controller';

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

    .name {
      font-weight: bold;
    }

    .id {
      font-weight: lighter;
      font-style: italic;
    }

    .note {
      font-size: 0.8rem;
      font-weight: lighter;
    }
  `;

  constructor() {
    super();
    const accountString = localStorage.getItem('accounts') ?? '[]';
    this.accountList = JSON.parse(accountString) as Account[];
    this.currentAccount = null;
    this.currentContainer = null;
    this.currentWorkspace = null;
    this.containerList = [];
    this.workspaceList = [];
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
    const containerString = localStorage.getItem('containers') ?? '[]';
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
    const workspaceString = localStorage.getItem('workspaces') ?? '[]';
    this.workspaceList = JSON.parse(workspaceString) as Workspace[];
    this.renderRoot.querySelector('#workspace-list')?.scrollIntoView(true);
  }

  async getTags(path: string | undefined) {
    if (!path) {
      return;
    }
    localStorage.setItem(
      'current-account',
      JSON.stringify(this.currentAccount)
    );
    localStorage.setItem(
      'current-container',
      JSON.stringify(this.currentContainer)
    );
    localStorage.setItem(
      'current-workspace',
      JSON.stringify(this.currentWorkspace)
    );
    try {
      await fetchTags(path);
    } catch {
      this.updateAuthorisation();
    }
    document.location.href = '/dist/tag_list.html';
  }

  async createWorkspaceTest() {
    try {
      // const tagspeedWorkspace = 'accounts/6001351588/containers/31600204/workspaces/3';
      // const currentTagList: Tag[] = JSON.parse(localStorage.getItem('tags') ?? '') as Tag[];
      // const testTagToCopy:Tag = currentTagList[0];
      // await createTag(tagspeedWorkspace, testTagToCopy);
      await fetchTags(this.currentWorkspace!.path);
      const tagsString = localStorage.getItem('tags') ?? '[]';
      const tagList = JSON.parse(tagsString) as Tag[];
      runTestForTags(this.currentWorkspace!, this.currentContainer!, tagList);
    } catch (error) {
      console.log(error);
    }
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
    if (this.accountList.length === 0) {
      return html`
        <h3>You have no GTM accounts</h3>
        <p>
          Please log in with an account with access to a GTM property or create
          a GTM property with this account to continue.
        </p>
      `;
    }
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
                <span class="name">${acc.name}</span>
                <span class="id">(${acc.accountId})</span>
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
                  <span class="name">${c.name}</span>
                  <span class="id">${c.publicId}</span>
                  <span class="note">${c.notes}</span>
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
                  <span class="name">${ws.name}</span>
                  <span class="note">${ws.description}</span>
                </div>
              </li>`
            )}
          </ul>
          <button @click=${this.getTags(this.currentWorkspace?.path)}>
            Select Workspace
          </button>
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
