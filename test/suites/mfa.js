/* global globalRegisterUser, globalAuthUser */
const crypto = require('crypto');
const assert = require('assert');
const { inspectPromise } = require('@makeomatic/deploy');
const authenticator = require('otplib/authenticator');
const request = require('request-promise').defaults({
  uri: 'http://ms-users.local:3000/users/_/me',
  json: true,
  gzip: true,
  simple: true,
});
const { USERS_MFA_FLAG } = require('../../src/constants');

authenticator.options = { crypto };

describe('#mfa.*', function activateSuite() {
  // actions supported by this
  const username = 'mfa@me.com';
  const generateRoute = 'mfa.generate-key';
  const attachRoute = 'mfa.attach';
  const verifyRoute = 'mfa.verify';
  const regenerateRoute = 'mfa.regenerate-codes';
  const detachRoute = 'mfa.detach';

  function topIsInvalid(error) {
    assert.equal(error.name, 'HttpStatusError');
    assert.equal(error.statusCode, 403);
    assert.equal(error.code, 'E_TOTP_INVALID');
    assert.ok(/TOTP invalid/.test(error.message), error.message);
  }

  before(global.startService);
  after(global.clearRedis);

  // registers user and pushes JWT to this.jwt
  before('register user', globalRegisterUser(username));
  before('auth user', globalAuthUser(username));

  let secret;
  let recoveryCodes;
  let regeneratedCodes;

  describe('#mfa.generate-key', function generateKeySuite() {
    it('generates key', async function test() {
      const data = await this.users
        .dispatch(generateRoute, { params: { username } });

      secret = data.secret;
    });
  });

  describe('#mfa.attach', function attachSuite() {
    it('doesn\'t allow to attach if provided totp is invalid', async function test() {
      const error = await this.users
        .dispatch(attachRoute, { params: { username, secret, totp: '123456' } })
        .reflect()
        .then(inspectPromise(false));

      topIsInvalid(error);
    });

    it('attaches secret to user account if provided totp is valid', async function test() {
      const { enabled, recoveryCodes: codes } = await this.users
        .dispatch(attachRoute, { params: { username, secret, totp: authenticator.generate(secret) } });

      assert.ok(enabled);
      assert.equal(codes.length, 10);

      // store for future use
      recoveryCodes = codes;
    });

    it('doesn\'t allow to attach if already attached', async function test() {
      const error = await this.users
        .dispatch(attachRoute, { params: { username, secret, totp: authenticator.generate(secret) } })
        .reflect()
        .then(inspectPromise(false));

      assert.equal(error.name, 'HttpStatusError');
      assert.equal(error.statusCode, 409);
      assert.ok(/MFA already enabled/.test(error.message), error.message);
    });

    it('returns mfa info inside user\'s metadata', async function test() {
      const res = await request.get({
        headers: { authorization: `JWT ${this.jwt}` },
      });

      assert.ok(res[USERS_MFA_FLAG]);
    });
  });

  describe('#mfa.verify', function verifySuite() {
    it('throws if invalid totp is provided', async function test() {
      const error = await this.users
        .dispatch(verifyRoute, { params: { username, totp: '123456' } })
        .reflect()
        .then(inspectPromise(false));

      topIsInvalid(error);
    });

    it('doesn\'t throw if valid totp is provided', async function test() {
      const { valid } = await this.users
        .dispatch(verifyRoute, { params: { username, totp: authenticator.generate(secret) } });

      assert.ok(valid);
    });

    it('doesn\'t throw if valid recovery code is provided', async function test() {
      const { valid } = await this.users
        .dispatch(verifyRoute, { params: { username, totp: recoveryCodes[0] } });

      assert.ok(valid);
    });

    it('throws if same recovery code provided one more time', async function test() {
      const error = await this.users
        .dispatch(verifyRoute, { params: { username, totp: recoveryCodes[0] } })
        .reflect()
        .then(inspectPromise(false));

      topIsInvalid(error);

      // finally remove used code
      recoveryCodes = recoveryCodes.slice(1);
    });
  });

  describe('#mfa.regenerate-codes', function regenerateSuite() {
    it('doesn\'t allow to regenerate codes if invalid totp is provided', async function test() {
      const error = await this.users
        .dispatch(regenerateRoute, { params: { username, totp: '123456' } })
        .reflect()
        .then(inspectPromise(false));

      topIsInvalid(error);
    });

    it('allows to regenerate codes if valid totp is provided', async function test() {
      const { regenerated, recoveryCodes: codes } = await this.users
        .dispatch(regenerateRoute, { params: { username, totp: authenticator.generate(secret) } });

      assert.ok(regenerated);
      assert.equal(codes.length, 10);

      // store new codes
      regeneratedCodes = codes;
    });

    it('throws if some old recovery code is provided', async function test() {
      const error = await this.users
        .dispatch(verifyRoute, { params: { username, totp: recoveryCodes[0] } })
        .reflect()
        .then(inspectPromise(false));

      topIsInvalid(error);
    });

    it('doesn\'t throw if new valid recovery is provided', async function test() {
      const { valid } = await this.users
        .dispatch(verifyRoute, { params: { username, totp: regeneratedCodes[0] } });

      assert.ok(valid);
      // remove used code
      regeneratedCodes = regeneratedCodes.slice(1);
    });
  });

  describe('#mfa.detach', function detachSuite() {
    it('doesn\'t allow to detach if invalid totp is provided', async function test() {
      const error = await this.users
        .dispatch(detachRoute, { params: { username, totp: '123456' } })
        .reflect()
        .then(inspectPromise(false));

      topIsInvalid(error);
    });

    it('allows to detach if valid totp is provided', async function test() {
      const { enabled } = await this.users
        .dispatch(detachRoute, { params: { username, totp: authenticator.generate(secret) } });

      assert.equal(enabled, false);
    });

    it('doesn\'t allow to detach if not attached', async function test() {
      const error = await this.users
        .dispatch(detachRoute, { params: { username, totp: authenticator.generate(secret) } })
        .reflect()
        .then(inspectPromise(false));

      assert.equal(error.name, 'HttpStatusError');
      assert.equal(error.statusCode, 412);
      assert.ok(/MFA disabled/.test(error.message), error.message);
    });

    it('removes mfa flag from metadata after detaching', async function test() {
      const res = await request.get({
        headers: { authorization: `JWT ${this.jwt}` },
      });

      assert.equal(res[USERS_MFA_FLAG], undefined);
    });
  });
});
