/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Loaded by GTM on the page to be analysed to send Core Web
 * Vitals metrics to the opener.
 *
 * The [web-vitals library](https://github.com/GoogleChrome/web-vitals) must be
 * loaded before this tag is.
 *
 */

import {onTTFB, onFCP, onLCP, onFID, onCLS, Metric} from 'web-vitals';

// this needs to be provided, as opener.origin isn't available
// TODO (b/238839377): find a way to fill in the platform's origin
const PLATFORM_ORIGIN = 'FILL ME IN';

/**
   postToAnalysisPlatform uses postMessage to send the given metric to the
   analysis platform.

   It is assumed that the analysis platform is the page's opener.

   @param metric The metric to send.
 */
function postToAnalysisPlatform(metric: Metric) {
  const data = JSON.stringify(metric);
  window.opener.postMessage(data, PLATFORM_ORIGIN);
}

// set up webVitals to send all metrics to the analysis platform
onTTFB(postToAnalysisPlatform);
onFCP(postToAnalysisPlatform);
onLCP(postToAnalysisPlatform);
onFID(postToAnalysisPlatform);
onCLS(postToAnalysisPlatform);
