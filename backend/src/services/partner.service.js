const User = require('../models/User');

function isBusyWithPartner(user) {
  return user.partner_status !== 'none';
}

async function requestPartner(currentUserId, partnerEmail) {
  const requester = await User.findOne({ id: currentUserId });
  if (!requester) throw new Error('User not found');

  if (isBusyWithPartner(requester)) {
    throw new Error('You already have an active or pending partner relation');
  }

  const normalizedEmail = partnerEmail.trim().toLowerCase();
  const partner = await User.findOne({ email: normalizedEmail });
  if (!partner) throw new Error('Partner user not found');
  if (partner.id === requester.id) throw new Error('Cannot send partner request to yourself');

  // Auto-connect if partner already sent a pending request to current user.
  if (
    partner.partner_status === 'pending_sent' &&
    partner.partner_id === requester.id &&
    partner.partner_requested_by === partner.id
  ) {
    requester.partner_id = partner.id;
    requester.partner_status = 'connected';
    requester.partner_requested_by = null;

    partner.partner_id = requester.id;
    partner.partner_status = 'connected';
    partner.partner_requested_by = null;

    await requester.save();
    await partner.save();
    return { status: 'connected', partner };
  }

  if (isBusyWithPartner(partner)) {
    throw new Error('Selected partner already has an active or pending partner relation');
  }

  requester.partner_id = partner.id;
  requester.partner_status = 'pending_sent';
  requester.partner_requested_by = requester.id;

  partner.partner_id = requester.id;
  partner.partner_status = 'pending_received';
  partner.partner_requested_by = requester.id;

  await requester.save();
  await partner.save();

  return { status: 'pending_sent', partner };
}

async function respondToPartnerRequest(currentUserId, action) {
  const user = await User.findOne({ id: currentUserId });
  if (!user) throw new Error('User not found');

  if (user.partner_status !== 'pending_received' || !user.partner_id || !user.partner_requested_by) {
    throw new Error('No pending partner request to respond to');
  }

  const requester = await User.findOne({ id: user.partner_requested_by });
  if (!requester) throw new Error('Requesting partner not found');

  const shouldAccept = action === 'accept';
  if (!['accept', 'reject'].includes(action)) {
    throw new Error('Invalid action. Must be "accept" or "reject"');
  }

  if (shouldAccept) {
    user.partner_id = requester.id;
    user.partner_status = 'connected';
    user.partner_requested_by = null;

    requester.partner_id = user.id;
    requester.partner_status = 'connected';
    requester.partner_requested_by = null;
  } else {
    user.partner_id = null;
    user.partner_status = 'none';
    user.partner_requested_by = null;

    if (requester.partner_id === user.id && requester.partner_status === 'pending_sent') {
      requester.partner_id = null;
      requester.partner_status = 'none';
      requester.partner_requested_by = null;
    }
  }

  await user.save();
  await requester.save();
  return { status: user.partner_status };
}

async function getPartnerStatus(currentUserId) {
  const user = await User.findOne({ id: currentUserId });
  if (!user) throw new Error('User not found');

  let partner = null;
  if (user.partner_id) {
    const partnerUser = await User.findOne({ id: user.partner_id });
    if (partnerUser) {
      partner = {
        id: partnerUser.id,
        first_name: partnerUser.first_name,
        last_name: partnerUser.last_name,
        email: partnerUser.email || null,
      };
    }
  }

  return {
    user_id: user.id,
    status: user.partner_status,
    requested_by: user.partner_requested_by,
    partner,
  };
}

module.exports = {
  requestPartner,
  respondToPartnerRequest,
  getPartnerStatus,
};
