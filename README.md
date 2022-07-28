Copyright 2022 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

# Tagspeed Audit

## Introduction
Tagspeed Audit is a tool to help measure the impact tags deployed via Google Tag
Manager are having on pagespeed. 

Third-party JavaScript, much of which is delivered via a tag management system,
is a well known culprit when it comes to poor page performance. Although tag
management systems make it easy for non-technical people to deploy complex
measurement features to websites, they don't often provide any insights into
what impact those features are having on overall performance. This can lead to
tens of megabytes of JavaScript being added to sites, resulting in slower
load times and poor interactivity. 

Tagspeed Audit provides a way for non-technical users to measure the performance
impact of individual tags on a page, based on the [Core Web
Vitals](https://web.dev/vitals/) metrics. 

## Building and Deploying
*TBD*

## Architecture
- single page application
- requires a URL with GTM deployed on it
- requires the user to authenticate with an account that has access to the GTM
  container deployed on the page
- uses OAuth2 for authentication
- uses window.pushMessage() to send CWV data back to the opener (i.e. the tool)
- deploys and additional tag to the page being tested to facilitate the
  measurement
- uses the page as is as a baseline and then turns off tags one at a time and
  measures improvements
