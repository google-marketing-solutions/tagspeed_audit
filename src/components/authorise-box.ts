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
 * @fileoverview A component to display the elements needed to show the Google
 * Identity Service (GIS) login with Google button, and then a button to trigger
 * authorising the page for use with Google Analytics.
 *
 * The authorisation is performed via the functions in the user-controller.
 *
 * Triggering the change from GIS button to authorise button is done via a
 * listener for a gis-logged-in event attached to the component. This event must
 * be fired for the component to know it shoud update.
 */

import {LitElement, html, css} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {
  handleUserCredentialResponse,
  isUserLoggedIn,
  authoriseUser,
} from '../controllers/user-controller';
import {fetchAccounts} from '../controllers/tagmanager-controller';
import {User} from '../models/user';

// The event type used to signal that the user has been logged in.
declare global {
  interface HTMLElementEventMap {
    'gis-logged-in': CustomEvent<{detail: User}>;
    'gis-authorised': CustomEvent<{detail: User}>;
  }
}

@customElement('authorise-box')
export class AuthoriseBox extends LitElement {
  _user: User | null = null;
  @state() private _isLoggedIn = false;

  static styles = css`
    .authorise {
      text-align: center;
    }
  `;

  constructor() {
    super();
    this.addEventListener('gis-logged-in', this.handleGISLoggedIn);
    this.addEventListener('gis-authorised', this.handleGISAuthorised);
  }

  /**
   * Called when the component is connected to the DOM.
   *
   * The load event listener is needed, as the GIS button requires the div it
   * renders the login button in to be present.
   */
  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('load', this.renderGISButton);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('load', this.renderGISButton);
  }

  /**
   * Renders the Google Identity Services login button. This cannot be called
   * until a div with the ID gis-button-div is present in the DOM. Otherwise the
   * one-tap toast may be shown, but the button itself will not be rendered.
   */
  renderGISButton(): void {
    google.accounts.id.initialize({
      client_id:
        '681592349170-8vulgnsvd5bhko6lc9veb41m0pqbi1ld.apps.googleusercontent.com',
      callback: handleUserCredentialResponse,
    });
    const gisButtonDiv = document.getElementById('gis-button-div');

    if (gisButtonDiv) {
      google.accounts.id.renderButton(
        gisButtonDiv,
        {theme: 'outline', size: 'large', type: 'standard'} // customization attributes
      );
      google.accounts.id.prompt();
    }
  }

  /**
   * Event handler for the gis-logged-in event.
   *
   * The CustomEvent detail is assumed to contain a User object or null. An
   * update for the component is requested to change the state if the user
   * really did log in.
   *
   * @param event The event that is being handled.
   */
  handleGISLoggedIn(event: CustomEvent): void {
    this._user = event.detail as User;
    this._isLoggedIn = isUserLoggedIn();
    if (this._isLoggedIn) {
      this.requestUpdate();
    }
  }

  async handleGISAuthorised() {
    await fetchAccounts();
    document.location.href = '/dist/account_list.html';
  }

  /**
   * Authorises the app to use GA4 if the user is set.
   */
  authorise() {
    if (this._user) {
      authoriseUser(this._user);
    }
  }

  /**
   * The html rendered depends on the logged in state of the user. Before the
   * user is logged in, a slot for the GIS button is rendered. Once the user is
   * logged in, some welcome text and a button for authorising the app is
   * rendered. In the event of an error, some error text is rendered.
   */
  render() {
    if (!this._isLoggedIn) {
      return html`<slot></slot>`;
    } else if (this._isLoggedIn) {
      return html`
        <p class="authorise">
          Thanks, ${this._user?.name}! Please click the button to authorise
          Tagspeed Audit for your GA properties.<br /><br />
          <button @click=${this.authorise}>Authorise Tagspeed Audit</button>
        </p>
      `;
    } else {
      return html`
        <p>There seems to have been an error. Please refresh the page.</p>
      `;
    }
  }
}
