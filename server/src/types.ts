// Copyright 2023 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy
// of the License at

//   http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

/**
 * Simplified response with only the fields required.
 */
export type AuditResponse = {
  id: string;
  blockedURL: string;
  reportUrl: string;
  scores: {
    LCP: number;
    FCP: number;
    CLS: number;
    TBT: number;
    consoleErrors: number;
  };
  deltaBaseline?: {
    LCP: number;
    FCP: number;
    CLS: number;
    TBT: number;
  };
  error?: string;
  screenshot?: string;
};

/**
 * Report with scores.
 */
export type Report = {
  lhr: {
    audits: object;
  };
  report: string;
};

/**
 * Represents an analysis request against an URL.
 */
export type AuditExecution = {
  id?: string;
  status?: string;
  url: string;
  userAgentOverride: string;
  maxUrlsToTry?: number;
  numberOfReports: number;
  results?: AuditResponse[];
  error?: string;
  cookies?: string;
  localStorage?: string;
  blockAll?: boolean;
  blockSpecificUrls?: string[];
};

/**
 * Holds response from backend when Generating a report.
 */
export type ExecutionResponse = {
  executionId?: string;
  error?: string;
  expectedResults?: number;
};
