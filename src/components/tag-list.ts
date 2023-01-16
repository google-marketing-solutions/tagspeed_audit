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
 * @fileoverview A component to display a list of the tags in the workspace
 * selected and allow the user to select a set of them.
 */

import {css, html, LitElement} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {map} from 'lit/directives/map.js';
import {createWorkspaceForTest} from '../controllers/tagspeed-controller';
import {Account, Container, Tag, Workspace} from '../models/tag-manager';

class SelectableTag {
  selected: boolean = true;
  tag: Tag;

  constructor(tag: Tag) {
    this.tag = tag;
  }
}

@customElement('tag-list')
export class TagList extends LitElement {
  private currentAccount: Account;
  private currentContainer: Container;
  private currentWorkspace: Workspace;
  private tagList: Array<SelectableTag> = [];
  @state() testWorkspace: Workspace | null;

  static styles = css`
    .tag-list-container {
      display: grid;
      grid-template-columns: 30% auto;
      grid-template-areas: 'info tag-list';
    }

    .info-area {
      gird-area: info;
      padding-left: 2em;
      border-right: thin solid gainsboro;
    }

    .tag-list {
      grid-area: tag-list;
      margin-left: 1em;
      margin-right: 1em;
    }

    .run-button {
      margin-left: 4em;
      margin-top: 2vh;
    }

    table {
      border-collapse: collapse;
    }

    th,
    td {
      padding: 20px;
    }

    tbody tr:nth-child(even) {
      background-color: #d5e2f7;
    }
  `;

  constructor() {
    super();
    this.currentAccount = JSON.parse(
      localStorage.getItem('current-account') ?? '{}'
    ) as Account;
    this.currentContainer = JSON.parse(
      localStorage.getItem('current-container') ?? '{}'
    ) as Container;
    this.currentWorkspace = JSON.parse(
      localStorage.getItem('current-workspace') ?? '{}'
    ) as Workspace;
    try {
      const tags = JSON.parse(
        localStorage.getItem('tags') ?? '{[]}'
      ) as Array<Tag>;
      this.tagList = [];
      for (const t of tags) {
        this.tagList.push(new SelectableTag(t));
      }
    } catch (error) {
      console.error('Selected workspace has no tags.');
    }

    this.testWorkspace = null;
  }

  async startTest() {
    const tags = new Array<Tag>();
    for (const t of this.tagList) {
      if (t.selected) {
        tags.push(t.tag);
      }
    }
    document.location.href = '/dist/test_results.html';
    // this.testWorkspace = await createWorkspaceForTest(
    //   this.currentWorkspace,
    //   this.currentContainer,
    //   tags
    // );
    // console.log(`Got the test workspace: ${this.testWorkspace}`);
    // this.requestUpdate();
  }

  render() {
    if (
      !(
        this.currentAccount.name &&
        this.currentContainer.name &&
        this.currentWorkspace.name
      )
    ) {
      return html`<p>
        The workspace is not properly selected.
        <a href="./index.html">Please start from the beginning.</a>
      </p>`;
    }
    let tagTable;
    if (this.tagList.length === 0) {
      tagTable = html`<p>This workspace has no tags.</p>`;
    } else {
      tagTable = html` <table>
        <thead>
          <tr>
            <th>In Test</th>
            <th>Tag ID</th>
            <th>Tag Name</th>
            <th>Type</th>
            <th>Paused</th>
          </tr>
        </thead>
        <tbody>
          ${map(
            this.tagList,
            t => html`
              <tr>
                <td>
                  <input
                    type="checkbox"
                    name="${t.tag.tagId}"
                    checked
                    @click=${() => {t.selected = !t.selected}}
                  />
                </td>
                <td>${t.tag.tagId}</td>
                <td>${t.tag.name}</td>
                <td>${t.tag.type}</td>
                <td>${t.tag.paused ? 'yes' : 'no'}</td>
              </tr>
            `
          )}
        </tbody>
      </table>`;
    }

    return html`<div class="tag-list-container">
      <div class="info-area">
        <h3>Account: ${this.currentAccount.name}</h3>
        <strong>Container: ${this.currentContainer.name}</strong>
        <br />
        <em>Workspace: ${this.currentWorkspace.name}</em>
        <br /><br />
        <lable for="test-url" size=80>URL where the test container is deployed: </lable>
        <input id="test-url" size="80" />
        <button class="run-button" @click=${() => {this.startTest();}}>
          Start Test
        </button>
      </div>
      <div class="tag-list">${tagTable}</div>
    </div>`;
  }
}
