const chai = require('chai');
const sinon = require('sinon');
const stub = sinon.stub.bind(sinon);
const { expect } = chai;
const MockServer = require('ioredis/test/helpers/mock_server.js');
const Errors = require('common-errors');

// make sure we have stack
chai.config.includeStack = true;

const config = {
  amqp: {
    connection: {
      host: process.env.RABBITMQ_PORT_5672_TCP_ADDR || '127.0.0.1',
      port: process.env.RABBITMQ_PORT_5672_TCP_PORT || 5672,
    },
  },
  redis: {
    hosts: [
      {
        host: process.env.REDIS_1_PORT_6379_TCP_ADDR || '127.0.0.1',
        port: process.env.REDIS_1_PORT_6379_TCP_PORT || 30001,
      },
      {
        host: process.env.REDIS_2_PORT_6379_TCP_ADDR || '127.0.0.1',
        port: process.env.REDIS_2_PORT_6379_TCP_PORT || 30002,
      },
      {
        host: process.env.REDIS_3_PORT_6379_TCP_ADDR || '127.0.0.1',
        port: process.env.REDIS_3_PORT_6379_TCP_PORT || 30003,
      },
    ],
  },
};

describe('Users suite', function UserClassSuite() {
  const Users = require('../src');

  describe('configuration suite', function ConfigurationSuite() {
    beforeEach(function startup() {
      const slotTable = [
        [0, 5460, ['127.0.0.1', 30001]],
        [5461, 10922, ['127.0.0.1', 30002]],
        [10923, 16383, ['127.0.0.1', 30003]],
      ];

      function argvHandler(argv) {
        if (argv[0] === 'cluster' && argv[1] === 'slots') {
          return slotTable;
        }
      }

      this.server_1 = new MockServer(30001, argvHandler);
      this.server_2 = new MockServer(30002, argvHandler);
      this.server_3 = new MockServer(30003, argvHandler);
    });

    it('must throw on invalid configuration', function test() {
      expect(function throwOnInvalidConfiguration() {
        return new Users();
      }).to.throw(Errors.ValidationError);
    });

    it('must be able to connect to and disconnect from amqp', function test() {
      const users = new Users(config);
      return users._connectAMQP().tap(() => {
        return users._closeAMQP();
      });
    });

    it('must be able to connect to and disconnect from redis', function test() {
      const users = new Users(config);
      return users._connectRedis().tap(() => {
        return users._closeRedis();
      });
    });

    it('must be able to initialize and close service', function test() {
      const users = new Users(config);
      return users.connect().tap(() => {
        return users.close();
      });
    });

    afterEach(function tearDown() {
      this.server_1.disconnect();
      this.server_2.disconnect();
      this.server_3.disconnect();
    });
  });

  describe('unit tests', function UnitSuite() {
    describe('#register', function registerSuite() {
      it('must reject invalid registration params and return detailed error');
      it('must be able to create user without validations and return user object and jwt token');
      it('must be able to create user with validation and return success');
      it('must reject more than 3 registration a day per ipaddress if it is specified');
      it('must reject registration for an already existing user');
      it('must reject registration for disposable email addresses');
      it('must reject registration for a domain name, which lacks MX record');
    });

    describe('#challenge', function challengeSuite() {
      it('must fail to send a challenge for a non-existing user');
      it('must be able to send challenge email');
      it('must fail to send challenge email more than once in an hour per user');
      it('must validate MX record for a domain before sending an email');
    });

    describe('#activate', function activateSuite() {
      it('must reject activation when challenge token is invalid');
      it('must reject activation when challenge token is expired');
      it('must activate account when challenge token is correct and not expired');
      it('must activate account when no challenge token is specified as a service action');
    });

    describe('#login', function loginSuite() {
      it('must reject login on a non-existing username');
      it('must reject login on an invalid password');
      it('must reject login on an inactive account');
      it('must reject login on a banned account');
      it('must login on a valid account with correct credentials');
      it('must return User object and JWT token on login similar to #register+activate');
      it('must reject lock account for authentication after 3 invalid login attemps');
      it('must reset authentication attemps after resetting password');
    });

    describe('#logout', function logoutSuite() {
      it('must reject logout on an invalid JWT token');
      it('must delete JWT token from pool of valid tokens');
    });

    describe('#verify', function verifySuite() {
      it('must reject on an invalid JWT token');
      it('must reject on an expired JWT token');
      it('must return user object on a valid JWT token');
      it('must return user object and associated metadata on a valid JWT token with default audience');
      it('must return user object and associated metadata on a valid JWT token with provided audiences');
    });

    describe('#getMetadata', function getMetadataSuite() {
      it('must reject to return metadata on a non-existing username');
      it('must return metadata for a default audience of an existing user');
      it('must return metadata for default and passed audiences of an existing user');
    });

    describe('#updateMetadata', function getMetadataSuite() {
      it('must reject updating metadata on a non-existing user');
      it('must be able to add metadata for a single audience of an existing user');
      it('must be able to remove metadata for a single audience of an existing user');
      it('must be able to perform batch add/remove operations for a single audience of an existing user');
    });

    describe('#requestPassword', function requestPasswordSuite() {
      it('must reject for a non-existing user');
      it('must send challenge email for an existing user');
      it('must reject sending reset password emails for an existing user more than once in 3 hours');
    });

    describe('#updatePassword', function updatePasswordSuite() {
      it('must reject updating password for a non-existing user');
      it('must reject updating password for an invalid challenge token');
      it('must update password passed with a valid challenge token');
      it('must fail to update password with a valid challenge token, when it doesn\'t conform to password requirements');
      it('must reset login attemts for a user after resetting password');
    });

    describe('#ban', function banSuite() {
      it('must reject banning a non-existing user');
      it('must reject (un)banning a user without action being implicitly set');
      it('must ban an existing user');
      it('must unban an existing user');
      it('must fail to unban not banned user');
      it('must fail to ban already banned user');
    });
  });

  describe('integration tests', function integrationSuite() {
    describe('#register', function registerSuite() {
      it('must reject invalid registration params and return detailed error');
      it('must be able to create user without validations and return user object and jwt token');
      it('must be able to create user with validation and return success');
      it('must reject more than 3 registration a day per ipaddress if it is specified');
      it('must reject registration for an already existing user');
      it('must reject registration for disposable email addresses');
      it('must reject registration for a domain name, which lacks MX record');
    });

    describe('#challenge', function challengeSuite() {
      it('must fail to send a challenge for a non-existing user');
      it('must be able to send challenge email');
      it('must fail to send challenge email more than once in an hour per user');
      it('must validate MX record for a domain before sending an email');
    });

    describe('#activate', function activateSuite() {
      it('must reject activation when challenge token is invalid');
      it('must reject activation when challenge token is expired');
      it('must activate account when challenge token is correct and not expired');
      it('must activate account when no challenge token is specified as a service action');
    });

    describe('#login', function loginSuite() {
      it('must reject login on a non-existing username');
      it('must reject login on an invalid password');
      it('must reject login on an inactive account');
      it('must reject login on a banned account');
      it('must login on a valid account with correct credentials');
      it('must return User object and JWT token on login similar to #register+activate');
      it('must reject lock account for authentication after 3 invalid login attemps');
      it('must reset authentication attemps after resetting password');
    });

    describe('#logout', function logoutSuite() {
      it('must reject logout on an invalid JWT token');
      it('must delete JWT token from pool of valid tokens');
    });

    describe('#verify', function verifySuite() {
      it('must reject on an invalid JWT token');
      it('must reject on an expired JWT token');
      it('must return user object on a valid JWT token');
      it('must return user object and associated metadata on a valid JWT token with default audience');
      it('must return user object and associated metadata on a valid JWT token with provided audiences');
    });

    describe('#getMetadata', function getMetadataSuite() {
      it('must reject to return metadata on a non-existing username');
      it('must return metadata for a default audience of an existing user');
      it('must return metadata for default and passed audiences of an existing user');
    });

    describe('#updateMetadata', function getMetadataSuite() {
      it('must reject updating metadata on a non-existing user');
      it('must be able to add metadata for a single audience of an existing user');
      it('must be able to remove metadata for a single audience of an existing user');
      it('must be able to perform batch add/remove operations for a single audience of an existing user');
    });

    describe('#requestPassword', function requestPasswordSuite() {
      it('must reject for a non-existing user');
      it('must send challenge email for an existing user');
      it('must reject sending reset password emails for an existing user more than once in 3 hours');
    });

    describe('#updatePassword', function updatePasswordSuite() {
      it('must reject updating password for a non-existing user');
      it('must reject updating password for an invalid challenge token');
      it('must update password passed with a valid challenge token');
      it('must fail to update password with a valid challenge token, when it doesn\'t conform to password requirements');
      it('must reset login attemts for a user after resetting password');
    });

    describe('#ban', function banSuite() {
      it('must reject banning a non-existing user');
      it('must reject (un)banning a user without action being implicitly set');
      it('must ban an existing user');
      it('must unban an existing user');
      it('must fail to unban not banned user');
      it('must fail to ban already banned user');
    });
  });
});