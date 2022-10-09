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
 * logout, user change and JWT token decoding
 */

import jwtDecode from 'jwt-decode';

/**
 * Handles the response from GIS button, including JWT decoding
 */
export function handleUserCredentialResponse(response: any): void {
    const decodedUserdata:any = jwtDecode(response.credential);
    console.log(decodedUserdata);
    const userName:string = decodedUserdata.name;
    const element = document.createElement('div');
    element.innerHTML = userName;
    document.body.appendChild(element);
}

function loginUser(){}

function isUserLoggedIn(): Boolean {

    return false;
}

module.exports = {
    handleUserCredentialResponse: handleUserCredentialResponse,
}
