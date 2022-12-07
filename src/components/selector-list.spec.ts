import {SelectorList} from './selector-list';
import {expect, fixture, html} from '@open-wc/testing';
import {fake, replace, restore} from 'sinon';

describe('selector-list component', () => {
  it('should only show no account text without accounts', async () => {
    const selectorList = new SelectorList();
    const noAccountsText = await fixture(html` <h3>You have no GTM accounts</h3>
      <p>
        Please log in with an account with access to a GTM property or create a
        GTM property with this account to continue.
      </p>`);
    const accountList = await fixture(
      html`<section id="account-list"></section>`
    );
    const containerList = await fixture(
      html`<section id="container-list"></section>`
    );
    const workspaceList = await fixture(
      html`<section id="workspace-list"></section>`
    );

    const got = selectorList.render();

    expect(got).to.include(noAccountsText);
    expect(got).not.to.include(accountList);
    expect(got).not.to.include(containerList);
    expect(got).not.to.include(workspaceList);
  });

  it('should only show account list before an account is chosen', async () => {
    replace(localStorage, 'getItem', fake(fakeLocalStorage));
    const selectorList = new SelectorList();

    const accountList = await fixture(html`
      <section id="account-list">
        <h3>Choose an account</h3>
        <ul>
          <li>
            <div class="card">
              <span class="name">Account 1</span>
              <span class="id">account 1</span>
            </div>
          </li>
          <li>
            <span class="name">Account 2</span>
            <span class="id">account 2</span>
          </li>
        </ul>
      </section>
    `);
    const containerList = await fixture(
      html`<section id="container-list"></section>`
    );
    const workspaceList = await fixture(
      html`<section id="workspace-list"></section>`
    );

    const got = selectorList.render();

    expect(got).to.include(accountList);
    expect(got).not.to.include(containerList);
    expect(got).not.to.include(workspaceList);

    restore();
  });

  it('should show the accounts and containers once an account is chosen', async () => {
    replace(localStorage, 'getItem', fake(fakeLocalStorage));
    const selectorList = new SelectorList();
    selectorList.currentAccount = testAccounts[0];
    selectorList.accountList = testAccounts;

    const accountList = await fixture(templateSection);
    const containerList = await fixture(html`
      <section id="container-list>
        <h3>Choose a container</h3>
        <ul>
          <li>
            <div class="card">
              <span class="name">testContainer 1</span>
              <span class="id">container 1</span>
              <span class="note">notes 1</span>
            </div>
          </li>
          <li>
            <div class="card">
              <span class="name">testContainer 2</span>
              <span class="id">container 2</span>
              <span class="note">notes 2</span>
            </div>
          </li>
        </ul>
      </section>"
      `);
    const workspaceList = await fixture(
      html`<section id="workspace-list"></section>`
    );

    const got = selectorList.render();

    expect(got).to.include(accountList);
    expect(got).to.include(containerList);
    expect(got).not.to.include(workspaceList);

    restore();
  });

  it('shows all three sections when a container is selected', async () => {
    replace(localStorage, 'getItem', fake(fakeLocalStorage));
    const selectorList = new SelectorList();
    selectorList.currentAccount = testAccounts[0];
    selectorList.accountList = testAccounts;
    selectorList.currentContainer = testContainers[0];
    selectorList.containerList = testContainers;

    const accountList = await fixture(templateSection);
    const containerList = await fixture(templateSection);
    const workspaceList = await fixture(html`
      <section id="workspace-list">
        <h3>Choose a workspace</h3>
        <ul>
          <li>
            <div class="card">
              <span class="name">testWorkspace1</span>
              <span class="note">Test workspace number 1</span>
            </div>
          </li>
          <li>
            <div class="card">
              <span class="name">testWorkspace2</span>
              <span class="note">Test workspace number 2</span>
            </div>
          </li>
        </ul>
        <button>Select Workspace</button>
      </section>
    `);

    const got = selectorList.render();

    expect(got).to.include(accountList);
    expect(got).to.include(containerList);
    expect(got).to.include(workspaceList);

    restore();
  });
});

function fakeLocalStorage(key: string): string {
  switch (key) {
    case 'accounts':
      return JSON.stringify(testAccounts);
    case 'containers':
      return JSON.stringify(testContainers);
    case 'workspaces':
      return JSON.stringify(testWorkspaces);
    default:
      return '';
  }
}

const testAccounts = [
  {
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
  },
  {
    path: 'path',
    accountId: 'account 2',
    name: 'Account 2',
    shareData: true,
    fingerprint: 'abcd',
    tagManagerUrl: 'example.com',
    features: {
      supportUserPermissions: true,
      supportMultipleContainers: true,
    },
  },
];

const testContainers = [
  {
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
  },
  {
    path: 'path',
    accountId: 'account 1',
    containerId: 'container 2',
    name: 'testContainer 2',
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
    notes: 'notes 2',
    usageContext: ['abc'] as [string],
    fingerprint: 'abc',
    tagManagerUrl: 'example.com',
    taggingServerUrls: ['example.com'] as [string],
  },
];

const testWorkspaces = [
  {
    path: 'path',
    accountId: 'account 1',
    containerId: 'container 1',
    workspaceId: 'workspace 1',
    name: 'testWorkspace1',
    description: 'Test workspace number 1',
    fingerprint: 'abcd',
    tagManagerUrl: 'example.com',
  },
  {
    path: 'path',
    accountId: 'account 1',
    containerId: 'container 1',
    workspaceId: 'workspace 2',
    name: 'testWorkspace2',
    description: 'Test workspace number 2',
    fingerprint: 'abcd',
    tagManagerUrl: 'example.com',
  },
];

const templateSection = html`
  <section id="account-list">
    <h3></h3>
    <ul>
      <li><div class="card"></div></li>
      <li><div class="card"></div></li>
    </ul>
  </section>
`;
