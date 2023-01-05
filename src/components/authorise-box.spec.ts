import {AuthoriseBox} from './authorise-box';
import {expect, fixture, html} from '@open-wc/testing';
import {fake, replace, restore} from 'sinon';

describe('authorise-box component', () => {
  it('should return a slot if the user is not logged in', async () => {
    const authBox = new AuthoriseBox();
    const want = html`<slot></slot>`;
    const got = authBox.render();

    expect(got).to.eql(want);
  });

  it('should return the authorise paragraph if user logged in', async () => {
    const fakeLocalStorage = fake.returns('true');
    replace(localStorage, 'getItem', fakeLocalStorage);
    const authBox = new AuthoriseBox();
    const fakeUser = {
      name: 'Bart Simpson',
      email: 'bart@google.com',
      family_name: 'Simpson',
      given_name: 'Bart',
      id: '1',
      picture: '123abc',
    };
    replace(authBox, '_user', fakeUser);
    const got = authBox.render();
    const want = await fixture(html`<p class="authorise"></p>`);

    expect(got).to.include(want);

    restore();
  });
});
