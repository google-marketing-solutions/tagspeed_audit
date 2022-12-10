import {handleUserCredentialResponse} from './user-controller';
import {expect} from '@open-wc/testing';
import {User} from '../models/user';
import {InvalidTokenError} from 'jwt-decode';

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

  it('Does not throw when the credential is incomplete', async () => {
    handleUserCredentialResponse({credential: testJwtTokenNoEmail});
    const gotUserString = localStorage.getItem('logged-in') ?? '';
    const got = JSON.parse(gotUserString);
    expect(got).to.eql(testUserNoEmail);
  });
});

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

const testJwtTokenNoEmail =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiSm9obiBEb2UiLCJnaXZlbl9uYW1lIjoiSm9obiIsImZhbWlseV9uYW1lIjoiRG9lIiwicGljdHVyZSI6IjEyMzQzMjEifQ.SbX6ee2oqLjhZPDhlmnHAu-OZobnaEwcl-cRvuqwjYQ';

const testUserNoEmail = {
  id: '123',
  name: 'John Doe',
  given_name: 'John',
  family_name: 'Doe',
  picture: '1234321',
};
