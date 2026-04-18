const Cost = require('../models/Cost');
const Report = require('../models/Report');
const { logger } = require('../config/logger');

/**
 * Next occurrence strictly after `fromDate` (calendar-aware for month/year).
 * @param {Date} fromDate
 * @param {string} frequency - daily | weekly | monthly | yearly
 * @returns {Date}
 */
function computeNextOccurrence(fromDate, frequency) {
  const d = new Date(fromDate.getTime());
  const freq = (frequency || 'monthly').toLowerCase();

  if (freq === 'daily') {
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (freq === 'weekly') {
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (freq === 'yearly') {
    const day = d.getDate();
    d.setFullYear(d.getFullYear() + 1);
    if (d.getDate() !== day) {
      d.setDate(0);
    }
    return d;
  }
  // monthly (default)
  const day = d.getDate();
  d.setMonth(d.getMonth() + 1);
  if (d.getDate() !== day) {
    d.setDate(0);
  }
  return d;
}

function endOfToday() {
  const x = new Date();
  x.setHours(23, 59, 59, 999);
  return x;
}

function stripTime(d) {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}

async function invalidateReportCachesForMonth(userid, dateInMonth) {
  const y = dateInMonth.getFullYear();
  const m = dateInMonth.getMonth() + 1;
  await Report.deleteMany({ userid, year: y, month: m });
}

/**
 * Materialize due recurring schedules (catch-up: may create multiple per template).
 */
async function processDueRecurringSchedules() {
  const cutoff = endOfToday();
  const templates = await Cost.find({
    schedule_only: true,
    'recurring.enabled': true,
    'recurring.next_date': { $lte: cutoff },
  });

  let created = 0;
  for (const template of templates) {
    const frequency = template.recurring.frequency || 'monthly';
    let nextRun = new Date(template.recurring.next_date);

    while (stripTime(nextRun) <= stripTime(cutoff)) {
      const occurrenceDate = new Date(nextRun);
      occurrenceDate.setHours(12, 0, 0, 0);

      const occurrence = new Cost({
        type: template.type,
        description: template.description,
        category: template.category,
        userid: template.userid,
        owner_userid: template.owner_userid,
        paid_by_userid: template.paid_by_userid,
        is_shared: template.is_shared,
        shared_with_userid: template.shared_with_userid,
        shared_split_mode: template.shared_split_mode,
        shared_split: template.shared_split
          ? {
              self_percentage: template.shared_split.self_percentage,
              partner_percentage: template.shared_split.partner_percentage,
            }
          : { self_percentage: 50, partner_percentage: 50 },
        sum: template.sum,
        created_at: occurrenceDate,
        currency: template.currency,
        payment_method: template.payment_method,
        tags: Array.isArray(template.tags) ? [...template.tags] : [],
        recurring: { enabled: false },
        schedule_only: false,
      });

      await occurrence.save();
      created += 1;
      await invalidateReportCachesForMonth(template.userid, occurrenceDate);

      nextRun = computeNextOccurrence(nextRun, frequency);
    }

    template.recurring.next_date = nextRun;
    await template.save();
    logger.info(`Recurring schedule ${template._id} advanced; next at ${nextRun.toISOString()}`);
  }

  if (created > 0) {
    logger.info(`processDueRecurringSchedules: created ${created} occurrence(s)`);
  }
  return { processed: templates.length, occurrencesCreated: created };
}

function startRecurringSchedulesRunner() {
  const HOUR_MS = 60 * 60 * 1000;
  processDueRecurringSchedules().catch((err) => logger.error({ err }, 'recurring startup run failed'));
  setInterval(() => {
    processDueRecurringSchedules().catch((err) => logger.error({ err }, 'recurring interval run failed'));
  }, HOUR_MS);
}

module.exports = {
  computeNextOccurrence,
  processDueRecurringSchedules,
  startRecurringSchedulesRunner,
};
