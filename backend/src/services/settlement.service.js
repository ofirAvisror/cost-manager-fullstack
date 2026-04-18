const Cost = require('../models/Cost');
const User = require('../models/User');

function getMonthRange(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

async function getMonthlySettlement(currentUserId, year, month) {
  const me = await User.findOne({ id: currentUserId });
  if (!me) throw new Error('User not found');
  if (me.partner_status !== 'connected' || !me.partner_id) {
    throw new Error('No connected partner');
  }

  const partner = await User.findOne({ id: me.partner_id });
  if (!partner) throw new Error('Partner not found');

  const yearNum = parseInt(year, 10);
  const monthNum = parseInt(month, 10);
  const { start, end } = getMonthRange(yearNum, monthNum);

  const costs = await Cost.find({
    is_shared: true,
    schedule_only: { $ne: true },
    created_at: { $gte: start, $lte: end },
    $or: [
      { paid_by_userid: me.id, shared_with_userid: partner.id },
      { paid_by_userid: partner.id, shared_with_userid: me.id },
      { owner_userid: me.id, shared_with_userid: partner.id },
      { owner_userid: partner.id, shared_with_userid: me.id },
    ],
  }).sort({ created_at: -1 });

  let mePaid = 0;
  let partnerPaid = 0;
  let meShare = 0;
  let partnerShare = 0;

  const breakdown = costs.map((cost) => {
    const mode = cost.shared_split_mode || 'half_half';
    const selfPct = mode === 'manual' ? (cost.shared_split?.self_percentage ?? 50) : 50;
    const partnerPct = mode === 'manual' ? (cost.shared_split?.partner_percentage ?? 50) : 50;
    const myPercent = cost.paid_by_userid === me.id ? selfPct : partnerPct;
    const partnerPercent = cost.paid_by_userid === me.id ? partnerPct : selfPct;

    const myShareAmount = (cost.sum * myPercent) / 100;
    const partnerShareAmount = (cost.sum * partnerPercent) / 100;

    if (cost.paid_by_userid === me.id) {
      mePaid += cost.sum;
      partnerPaid += 0;
    } else {
      partnerPaid += cost.sum;
      mePaid += 0;
    }
    meShare += myShareAmount;
    partnerShare += partnerShareAmount;

    return {
      id: cost._id,
      description: cost.description,
      amount: cost.sum,
      currency: cost.currency,
      paid_by_userid: cost.paid_by_userid,
      split_mode: mode,
      my_share_amount: myShareAmount,
      partner_share_amount: partnerShareAmount,
      created_at: cost.created_at,
    };
  });

  const myNet = mePaid - meShare;
  const partnerNet = partnerPaid - partnerShare;

  let whoOwesWhom = {
    from_userid: null,
    to_userid: null,
    amount: 0,
  };
  if (myNet < 0) {
    whoOwesWhom = {
      from_userid: me.id,
      to_userid: partner.id,
      amount: Math.abs(myNet),
    };
  } else if (partnerNet < 0) {
    whoOwesWhom = {
      from_userid: partner.id,
      to_userid: me.id,
      amount: Math.abs(partnerNet),
    };
  }

  return {
    year: yearNum,
    month: monthNum,
    user: { id: me.id, email: me.email },
    partner: { id: partner.id, email: partner.email },
    totals: {
      me_paid: mePaid,
      me_share: meShare,
      me_net: myNet,
      partner_paid: partnerPaid,
      partner_share: partnerShare,
      partner_net: partnerNet,
    },
    who_owes_whom: whoOwesWhom,
    breakdown,
  };
}

module.exports = {
  getMonthlySettlement,
};
