/* eslint-disable promise/always-return, no-prototype-builtins */
const { inspectPromise } = require('@makeomatic/deploy');
const Promise = require('bluebird');
const { expect } = require('chai');
const faker = require('faker');
const ld = require('lodash');

const simpleDispatcher = require('./../helpers/simpleDispatcher');

const { cleanUsers } = require('../../src/utils/inactiveUsers');
const { createOrganization } = require('../helpers/organization');

const delay = fn => Promise.delay(1000).then(fn);

describe('#inactive user', function registerSuite() {
  beforeEach(global.startService);
  afterEach(global.clearRedis);

  const regUser = {
    username: 'v@makeomatic.ru',
    audience: 'matic.ninja',
    alias: 'bondthebest',
    activate: false,
    metadata: {
      service: 'craft',
    },
    // eslint-disable-next-line max-len
    sso: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJtcy11c2VycyIsInByb2ZpbGUiOnsiZDEiOjEyLCJubSI6InBhaiJ9LCJpbnRlcm5hbHMiOnsidWlkIjoxNTE2MjM5MDIyfSwicHJvdmlkZXIiOiJmYWNlYm9vayIsInVpZCI6MTUxNjIzOTAyMiwidXNlcm5hbWUiOiJmb29AYmFyLmJheiJ9.QXLcP-86A3ly-teJt_C_XQo3hFUVC0pVALb84Eitozo',
  };

  const regUserNoAlias = {
    username: 'v2@makeomatic.ru',
    audience: 'matic.log',
    activate: false,
    metadata: {
      service: 'log',
    },
  };

  beforeEach(async function pretest() {
    this.users.config.deleteInactiveAccounts = 1;
    await createOrganization.call(this);
    await simpleDispatcher(this.users.router)('users.register', { ...regUser });
    return simpleDispatcher(this.users.router)('users.register', { ...regUserNoAlias });
  });

  it('deletes inactive user', function test() {
    return delay(() => {
      return cleanUsers.call(this.users)
        .then(async (res) => {
          expect(res).to.be.eq(2);

          const { username } = regUser;
          const dispatcher = simpleDispatcher(this.users.router);

          await dispatcher('users.getInternalData', { username })
            .reflect()
            .then(inspectPromise(false));
        });
    });
  });

  it('removes org member if user not passed activation', async function test() {
    const opts = {
      organizationId: this.organization.id,
      member: {
        email: regUser.username,
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
      },
    };

    await this.dispatch('users.organization.members.add', opts);

    return delay(() => {
      return cleanUsers.call(this.users)
        .then(() => {
          const dispatcher = simpleDispatcher(this.users.router);
          const reqOpts = {
            organizationId: this.organization.id,
          };

          return dispatcher('users.organization.members.list', reqOpts)
            .reflect()
            .then(inspectPromise(true))
            .then(({ data }) => {
              const { attributes } = data;
              const membersWithUsername = ld.filter(attributes, (record) => {
                return record.id === regUser.username;
              });
              expect(membersWithUsername.length).to.be.eq(0);
            });
        });
    });
  });
});
