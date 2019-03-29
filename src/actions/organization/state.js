const { ActionTransport } = require('@microfleet/core');
const { checkOrganizationExists } = require('../../utils/organization');
const { ORGANIZATIONS_ACTIVE_FLAG, ORGANIZATIONS_DATA } = require('../../constants');
const redisKey = require('../../utils/key');

/**
 * @api {amqp} <prefix>.state Update organization state
 * @apiVersion 1.0.0
 * @apiName state
 * @apiGroup Organizations
 *
 * @apiDescription This should be used to update organization state.
 *
 * @apiParam (Payload) {String} organizationId - organization id.
 * @apiParam (Payload) {Boolean} active=false - organization state.
 */
async function updateOrganizationState({ params }) {
  const { redis } = this;
  const { organizationId, active = false } = params;

  const organizationDataKey = redisKey(organizationId, ORGANIZATIONS_DATA);
  await redis.hset(organizationDataKey, ORGANIZATIONS_ACTIVE_FLAG, active);

  return {
    data: {
      id: organizationId,
      active,
    },
  };
}

updateOrganizationState.allowed = checkOrganizationExists;
updateOrganizationState.transports = [ActionTransport.amqp, ActionTransport.internal];
module.exports = updateOrganizationState;