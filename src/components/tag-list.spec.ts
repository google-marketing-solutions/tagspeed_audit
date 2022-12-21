import {expect, fixture, html} from '@open-wc/testing';
import {TagList} from './tag-list';

describe('tag-list compontent', () => {
  it('shows the current account, container, and workspace', async () => {
    localStorage.setItem('current-account', JSON.stringify(testAccount));
    localStorage.setItem('current-container', JSON.stringify(testContainer));
    localStorage.setItem('current-workspace', JSON.stringify(testWorkspace));
    const want = await fixture(html`
      <div class="info-area">
        <h3>${testAccount.name}</h3>
        <strong>${testContainer.name}</strong>
        <br />
        <em>${testWorkspace.name}</em>
      </div>
    `);

    const tagList = new TagList();
    const got = tagList.render();

    expect(got).to.include(want);

    localStorage.clear();
  });

  it('shows the error message when there are no tags', async () => {
    localStorage.setItem('current-account', JSON.stringify(testAccount));
    localStorage.setItem('current-container', JSON.stringify(testContainer));
    localStorage.setItem('current-workspace', JSON.stringify(testWorkspace));
    const want = await fixture(html` <p>This workspace has no tags.</p> `);

    const tagList = new TagList();
    const got = tagList.render();

    expect(got).to.include(want);

    localStorage.clear();
  });

  it('shows a table with the tags when present', async () => {
    localStorage.setItem('current-account', JSON.stringify(testAccount));
    localStorage.setItem('current-container', JSON.stringify(testContainer));
    localStorage.setItem('current-workspace', JSON.stringify(testWorkspace));
    localStorage.setItem('tags', JSON.stringify(testTags));
    const want = await fixture(html`
      <table>
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
          <tr>
            <td>
              <input type="checkbox" name="${testTags[0].tagId}" checked />
            </td>
            <td>${testTags[0].tagId}</td>
            <td>${testTags[0].name}</td>
            <td>${testTags[0].type}</td>
            <td>${testTags[0].paused ? 'yes' : 'no'}</td>
          </tr>
          <tr>
            <td>
              <input type="checkbox" name="${testTags[1].tagId}" checked />
            </td>
            <td>${testTags[1].tagId}</td>
            <td>${testTags[1].name}</td>
            <td>${testTags[1].type}</td>
            <td>${testTags[1].paused ? 'yes' : 'no'}</td>
          </tr>
          <tr>
            <td>
              <input type="checkbox" name="${testTags[2].tagId}" checked />
            </td>
            <td>${testTags[2].tagId}</td>
            <td>${testTags[2].name}</td>
            <td>${testTags[2].type}</td>
            <td>${testTags[2].paused ? 'yes' : 'no'}</td>
          </tr>
        </tbody>
      </table>
    `);

    const tagList = new TagList();
    const got = tagList.render();

    expect(got).to.include(want);

    localStorage.clear();
  });

  it('does shows an error when workspace info is missing', async () => {
    const want = await fixture(html` <p>
      The workspace is not properly selected.
      <a href="./index.html">Please start from the beginning.</a>
    </p>`);
    const tagList = new TagList();

    // Nothing is set
    let got = await tagList.render();
    expect(got).to.include(want);

    // One item is set
    localStorage.setItem('current-account', JSON.stringify(testAccount));
    expect(got).to.include(want);
    localStorage.clear();

    localStorage.setItem('current-container', JSON.stringify(testContainer));
    expect(got).to.include(want);
    localStorage.clear();

    localStorage.setItem('current-workspace', JSON.stringify(testWorkspace));
    expect(got).to.include(want);
    localStorage.clear();

    // Two items are set
    localStorage.setItem('current-account', JSON.stringify(testAccount));
    localStorage.setItem('current-container', JSON.stringify(testContainer));
    expect(got).to.include(want);
    localStorage.clear();

    localStorage.setItem('current-container', JSON.stringify(testContainer));
    localStorage.setItem('current-workspace', JSON.stringify(testWorkspace));
    expect(got).to.include(want);
    localStorage.clear();

    localStorage.setItem('current-account', JSON.stringify(testAccount));
    localStorage.setItem('current-workspace', JSON.stringify(testWorkspace));
    expect(got).to.include(want);
    localStorage.clear();
  });
});

const testAccount = {
  path: 'path',
  accountId: 'account 1',
  name: 'Account 1',
  shareData: true,
  fingerprint: 'abcd',
  tagManagerUrl: 'example.com',
  features: {
    supportUserPermissions: true,
    supportMultipleContainers: true,
  },
};

const testContainer = {
  path: 'path',
  accountId: 'account 1',
  containerId: 'container 1',
  name: 'testContainer 1',
  domainName: ['example.com'] as [string],
  publicId: 'pubid 1',
  tagIds: ['abc'] as [string],
  features: {
    supportUserPermissions: true,
    supportEnvironments: true,
    supportWorkspaces: true,
    supportGtagConfigs: true,
    supportBuiltInVariables: true,
    supportClients: true,
    supportFolders: true,
    supportTags: true,
    supportTemplates: true,
    supportTriggers: true,
    supportVariables: true,
    supportVersions: true,
    supportZones: true,
  },
  notes: 'notes 1',
  usageContext: ['abc'] as [string],
  fingerprint: 'abc',
  tagManagerUrl: 'example.com',
  taggingServerUrls: ['example.com'] as [string],
};

const testWorkspace = {
  path: 'path',
  accountId: 'account 1',
  containerId: 'container 1',
  workspaceId: 'workspace 1',
  name: 'testWorkspace1',
  description: 'Test workspace number 1',
  fingerprint: 'abcd',
  tagManagerUrl: 'example.com',
};

const testTags = [
  {
    path: 'accounts/1/containers/1/workspaces/1/tags/1',
    accountId: '1',
    containerId: '1',
    workspaceId: '1',
    tagId: '1',
    name: 'Tag 1',
    type: 'html',
    parameter: [
      {
        type: 'template',
        key: 'html',
        value: '<script src="https://example.com/tag.js"></script>',
      },
      {type: 'boolean', key: 'supportDocumentWrite', value: 'false'},
    ],
    fingerprint: '1234567890',
    firingTriggerId: ['0987654321'],
    tagFiringOption: 'oncePerEvent',
    tagManagerUrl:
      'https://tagmanager.google.com/#/container/accounts/1/containers/1/workspaces/1/tags/1?apiLink=tag',
    monitoringMetadata: {type: 'map'},
    consentSettings: {consentStatus: 'notSet'},
    paused: false,
  },
  {
    path: 'accounts/1/containers/1/workspaces/1/tags/2',
    accountId: '1',
    containerId: '1',
    workspaceId: '1',
    tagId: '2',
    name: 'Tag 2',
    type: 'html',
    parameter: [
      {
        type: 'template',
        key: 'html',
        value: '<script src="https://example.com/tag.js"></script>',
      },
      {type: 'boolean', key: 'supportDocumentWrite', value: 'false'},
    ],
    fingerprint: '1234567890',
    firingTriggerId: ['0987654321'],
    tagFiringOption: 'oncePerEvent',
    tagManagerUrl:
      'https://tagmanager.google.com/#/container/accounts/1/containers/1/workspaces/1/tags/2?apiLink=tag',
    monitoringMetadata: {type: 'map'},
    consentSettings: {consentStatus: 'notSet'},
    paused: true,
  },
  {
    path: 'accounts/1/containers/1/workspaces/1/tags/3',
    accountId: '1',
    containerId: '1',
    workspaceId: '1',
    tagId: '3',
    name: 'Tag 3',
    type: 'html',
    parameter: [
      {
        type: 'template',
        key: 'html',
        value: '<script src="https://example.com/tag.js"></script>',
      },
      {type: 'boolean', key: 'supportDocumentWrite', value: 'false'},
    ],
    fingerprint: '1234567890',
    firingTriggerId: ['0987654321'],
    tagFiringOption: 'oncePerEvent',
    tagManagerUrl:
      'https://tagmanager.google.com/#/container/accounts/1/containers/1/workspaces/1/tags/3?apiLink=tag',
    monitoringMetadata: {type: 'map'},
    consentSettings: {consentStatus: 'notSet'},
    paused: false,
  },
];
