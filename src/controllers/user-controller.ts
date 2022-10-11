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

import jwtDecode from 'jwt-decode';
import { User } from '../models/user';

//Defined globally to simplify invocation
const localStorage = window.localStorage;

//Defined for decoupled use
let tokenClient:google.accounts.oauth2.TokenClient;

/**
 * Handles the response from GIS button, including JWT decoding
 */
export function handleUserCredentialResponse(response: any): void {
    // TODO: Error handling in case there's no credential
    const decodedUserdata:any = jwtDecode(response.credential);
    const user:User = {
        id: decodedUserdata.sub,
        given_name: decodedUserdata.given_name,
        family_name: decodedUserdata.family_name,
        name: decodedUserdata.name,
        email: decodedUserdata.email,
        picture: decodedUserdata.picture,
    }
    // To-do: Use localStorage wrapper? 
    const userJson = JSON.stringify(user);
    localStorage.setItem('logged-in', userJson);
    hideAuthenticationShowAuthorisation(user);
}

/**
 * Logs current user out, including token revokation
 */
export function logoutUser():void {
    localStorage.removeItem('logged-in');
    const accessToken = localStorage.getItem('access_token')!;
    if (accessToken !== null) {
        google.accounts.oauth2.revoke(accessToken, 
            () => {console.log('access token revoked')});
    }
    localStorage.removeItem('access_token');
}

/**
 * Checks whether there's a user currently logged in.
 * 
 * @returns {boolean}
 */
export function isUserLoggedIn():Boolean {
    return localStorage.getItem('logged-in') !== null;
}

/**
 * Handles the second step of the authentication and authorisation
 * process by removing the GIS auth button and displaying a step
 * that allows users to prompt authorisation to the APIs
 */
function hideAuthenticationShowAuthorisation(user:User):void {
    const bottomFlow = document.getElementById('bottom-flow')!;
    bottomFlow.innerHTML = "";
    const p = document.createElement('p');
    p.innerHTML = "Welcome " + user.name 
    + ", please authorise the app to continue. <br/>"
    + "You will have to do this only once. <br/>";

    const authorisationButton = document.createElement('button');
    authorisationButton.id = 'auth-button';
    authorisationButton.type = 'submit';
    authorisationButton.innerHTML = 'Authorize Tagspeed Audit'
    authorisationButton.onclick = () => authoriseUser(user);

    bottomFlow.appendChild(p);
    bottomFlow.appendChild(authorisationButton);
}

/**
 * Uses the GIS OAuth library to request an access token with the
 * required scopes for the app and active user, and then stores it
 * locally for further use.
 * 
 * It first initializes the client, and then requests a token.
 * Since the client initialization requires the user's email as hint
 * to match it with the logged-in user, we don't initialize the client
 * until this point.
 * 
 * Since we might have to request an access token independently from
 * initialisation, this has been encapsulated in a separate, exported
 * function.
 */
function authoriseUser(user:User):void {
    const clientId = '681592349170-8vulgnsvd5bhko6lc9veb41m0pqbi1ld.apps.googleusercontent.com';
    const scopes = 'https://www.googleapis.com/auth/tagmanager.readonly';

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scopes,
        hint: user.email,
        callback: (response) => {
            if (!response.access_token) {
                //TODO: Error handling
                console.log("failed");
            }
            console.log(response);
            localStorage.setItem('access_token', response.access_token);
        }
    });

    requestToken();
}


/**
 * Encapsulated the request to the token client to obtain a new
 * token in case that the current one has expired.
 * Handling the token itself is defined on the callback of the
 * token client's initialisation.
 */
export function requestToken() {
    tokenClient.requestAccessToken({prompt: ''});
}

module.exports = {
    handleUserCredentialResponse: handleUserCredentialResponse,
    isUserLoggedIn: isUserLoggedIn,
    logoutUser: logoutUser,
}
