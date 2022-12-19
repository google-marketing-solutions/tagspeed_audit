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
import {customElement} from 'lit/decorators.js';
import {map} from 'lit/directives/map.js';
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
  private tagList: Array<SelectableTag>;

  static styles = css`
    .tag-list-container {
      display: inline-grid;
      grid-template-columns: 20% auto;
      grid-template-areas: 'info tag-list';
    }

    .info-area {
      gird-area: info;
    }

    .tag-list {
      grid-area: tag-list;
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
    const tags = JSON.parse(
      localStorage.getItem('tags') ?? '{[]}'
    ) as Array<Tag>;
    this.tagList = [];
    for (const t of tags) {
      this.tagList.push(new SelectableTag(t));
    }
  }

  render() {
    return html`
      <div class="tag-list-container">
        <div class="info-area">
          <h3>${this.currentAccount.name}</h3>
          <strong>${this.currentContainer.name}</strong>
          <em>${this.currentWorkspace.name}</em>
        </div>
        <div class="tag-list">
          <table>
            <thead>
              <tr>
                <th>Selected</th>
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
                      <input type="checkbox" name="${t.tag.tagId}" checked />
                    </td>
                    <td>${t.tag.tagId}</td>
                    <td>${t.tag.name}</td>
                    <td>${t.tag.type}</td>
                    <td>${t.tag.paused}</td>
                  </tr>
                `
              )}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}
