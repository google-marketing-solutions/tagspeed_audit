/*
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an AS IS BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Type declaration for Account model
 */

 export interface Account {
  path: string,
  accountId: string,
  name: string,
  shareData: boolean,
  fingerprint: string,
  tagManagerUrl: string,
  features: {
    supportUserPermissions: boolean,
    supportMultipleContainers: boolean,
  },
}

export interface Container {
  path: string,
  accountId: string,
  containerId: string,
  name: string,
  domainName: [
    string
  ],
  publicId: string,
  tagIds: [
    string
  ],
  features: {
    supportUserPermissions: boolean,
    supportEnvironments: boolean,
    supportWorkspaces: boolean,
    supportGtagConfigs: boolean,
    supportBuiltInVariables: boolean,
    supportClients: boolean,
    supportFolders: boolean,
    supportTags: boolean,
    supportTemplates: boolean,
    supportTriggers: boolean,
    supportVariables: boolean,
    supportVersions: boolean,
    supportZones: boolean,
  },
  notes: string,
  usageContext: [
    string
  ],
  fingerprint: string,
  tagManagerUrl: string,
  taggingServerUrls: [
    string
  ]
}

export interface Workspace {
  path: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  name: string,
  description: string,
  fingerprint: string,
  tagManagerUrl: string,
}

export interface Tag {
  path: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tagId: string,
  name: string,
  type: string,
  firingRuleId: [
    string
  ],
  blockingRuleId: [
    string
  ],
  liveOnly: boolean,
  priority: {
    type: string,
    key: string,
    value: string,
    list: [
      (any)
    ],
    map: [
      (any)
    ]
  },
  notes: string,
  scheduleStartMs: number,
  scheduleEndMs: number,
  any: [
    {
      type: string,
      key: string,
      value: string,
      list: [
        (any)
      ],
      map: [
        (any)
      ]
    }
  ],
  fingerprint: string,
  firingTriggerId: [
    string
  ],
  blockingTriggerId: [
    string
  ],
  setupTag: [
    {
      tagName: string,
      stopOnSetupFailure: boolean
    }
  ],
  teardownTag: [
    {
      tagName: string,
      stopTeardownOnFailure: boolean
    }
  ],
  parentFolderId: string,
  tagFiringOption: string,
  tagManagerUrl: string,
  paused: boolean,
  monitoringMetadata: {
    type: string,
    key: string,
    value: string,
    list: [
      (any)
    ],
    map: [
      (any)
    ],
  },
  monitoringMetadataTagNameKey: string,
  consentSettings: {
    consentStatus: string,
    consentType: {
      type: string,
      key: string,
      value: string,
      list: [
        (any)
      ],
      map: [
        (any)
      ],
    }
  }
}