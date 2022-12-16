import {
  authoriseUser,
  handleUserCredentialResponse,
  isUserLoggedIn,
  logoutUser,
} from './user-controller';
import {expect} from '@open-wc/testing';
import {User} from '../models/user';
import {InvalidTokenError} from 'jwt-decode';
import {fake, replace, restore} from 'sinon';

describe('testing user-controller.handleUserCredentialResponse', () => {
  it('handleUserCredentialResponse saved a user to localstorage on success', async () => {
    handleUserCredentialResponse({credential: testJwtToken});
    const userString = localStorage.getItem('logged-in') ?? '';
    const got = JSON.parse(userString) as User;
    expect(got).to.eql(testUser);
  });

  it('throws an error when a bad token is passed', async () => {
    expect(() => handleUserCredentialResponse({credential: '12345'})).to.throw(
      InvalidTokenError
    );
  });

  // TODO(@notmariazoe) - is this the correct behavior?
  it('does not throw when the credential is incomplete', async () => {
    handleUserCredentialResponse({credential: testJwtTokenNoEmail});
    const gotUserString = localStorage.getItem('logged-in') ?? '';
    const got = JSON.parse(gotUserString);
    expect(got).to.eql(testUserNoEmail);
  });

  it('throws an error when the response contains no credential', async () => {
    // @ts-expect-error
    expect(() => handleUserCredentialResponse({error: 'Error'})).to.throw(
      InvalidTokenError
    );
  });
});

describe('testing user-controller.logoutUser', () => {
  it('removes the user and access token', async () => {
    localStorage.setItem('logged-in', 'Some user data');
    localStorage.setItem('access_token', 'Access Token');

    logoutUser();

    expect(localStorage.getItem('logged-in')).to.be.null;
    expect(localStorage.getItem('access_token')).to.be.null;
  });

  it('does not throw an error when the user is not logged in', async () => {
    logoutUser();
    expect(localStorage.getItem('logged-in')).to.be.null;
    expect(localStorage.getItem('access_token')).to.be.null;
  });
});

describe('testing user-controller.isUserLoggedIn', () => {
  it('returns false if there is no user in localStorage', async () => {
    const got = isUserLoggedIn();
    expect(got).to.be.false;
  });

  it('returns true when there is something in localStorage', () => {
    localStorage.setItem('logged-in', 'A test user');
    const got = isUserLoggedIn();
    expect(got).to.be.true;
    localStorage.clear();
  });
});

describe('testing user-controller.authoriseUser', () => {
  it('saves the access_token when provided', async () => {
    authoriseUser(testUser);
    const got = localStorage.getItem('access_token');
    expect(got).to.equal('12345');
    localStorage.clear();
  });

  it('adds nothing to localStorage when there is no access_token returned', async () => {
    googleBroken = true;
    const got = localStorage.getItem('access_token');
    expect(got).to.be.null;
    googleBroken = false;
  });
});

// a JWT token for the complete test user
const testJwtToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiSm9obiBEb2UiLCJnaXZlbl9uYW1lIjoiSm9obiIsImZhbWlseV9uYW1lIjoiRG9lIiwiZW1haWwiOiJqb2huZG9lQGV4YW1wbGUuY29tIiwicGljdHVyZSI6IjEyMzQzMjEifQ.2Yv4YO57L1qVS8XvhV1aGUVMxijg5i-pugt1TSUnurA';

const testUser = {
  id: '123',
  name: 'John Doe',
  given_name: 'John',
  family_name: 'Doe',
  email: 'johndoe@example.com',
  picture: '1234321',
};

// a JWT token for test user without an email address
const testJwtTokenNoEmail =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiSm9obiBEb2UiLCJnaXZlbl9uYW1lIjoiSm9obiIsImZhbWlseV9uYW1lIjoiRG9lIiwicGljdHVyZSI6IjEyMzQzMjEifQ.SbX6ee2oqLjhZPDhlmnHAu-OZobnaEwcl-cRvuqwjYQ';

const testUserNoEmail = {
  id: '123',
  name: 'John Doe',
  given_name: 'John',
  family_name: 'Doe',
  picture: '1234321',
};

// Fake GIS libarary for testing
let googleBroken = false;
window.google = {
  accounts: {
    id: {
      revoke: function () {},
      initialize: function () {},
      prompt: function () {},
      renderButton: function () {},
      disableAutoSelect: function () {},
      storeCredential: function () {},
      cancel: function () {},
    },
    oauth2: {
      revoke: function () {},
      initCodeClient: function (): any {},
      initTokenClient: function (config: any): any {
        if (googleBroken) {
          config.callback({error: 'Some Error'});
        } else {
          config.callback({access_token: '12345'});
        }
        return {
          requestAccessToken: function () {},
        };
      },
      hasGrantedAllScopes: function () {
        return true;
      },
      hasGrantedAnyScope: function () {
        return true;
      },
    },
  },
};
