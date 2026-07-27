'use strict';

const crypto = require('node:crypto');

const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 365;
const MIN_TOKEN_BYTES = 32;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function parseRangeDays(value) {
  if (value === undefined || value === '') {
    return DEFAULT_RANGE_DAYS;
  }
  if (typeof value !== 'string' || !/^[1-9]\d{0,2}$/.test(value)) {
    return null;
  }
  const days = Number(value);
  return days <= MAX_RANGE_DAYS ? days : null;
}

function isLoopbackAddress(address) {
  if (typeof address !== 'string') {
    return false;
  }
  const normalized = address.toLowerCase();
  if (normalized === '::1') {
    return true;
  }
  const ipv4 = normalized.startsWith('::ffff:') ? normalized.slice(7) : normalized;
  return /^127(?:\.\d{1,3}){3}$/.test(ipv4);
}

function isLoopbackHostname(hostname) {
  if (typeof hostname !== 'string') {
    return false;
  }
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === 'localhost' || normalized === '::1' || /^127(?:\.\d{1,3}){3}$/.test(normalized);
}

function isInternalRequest(address, hostname) {
  return isLoopbackAddress(address) && isLoopbackHostname(hostname);
}

function isStrongToken(token) {
  return typeof token === 'string' && Buffer.byteLength(token, 'utf8') >= MIN_TOKEN_BYTES;
}

function tokenMatches(authorization, token) {
  if (!isStrongToken(token) || typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    return false;
  }
  const candidate = authorization.slice('Bearer '.length);
  const candidateBuffer = Buffer.from(candidate);
  const tokenBuffer = Buffer.from(token);
  return candidateBuffer.length === tokenBuffer.length && crypto.timingSafeEqual(candidateBuffer, tokenBuffer);
}

function assertCount(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`invalid aggregate count: ${label}`);
  }
  return value;
}

async function buildDashboardStats(models, rangeDays, now = new Date()) {
  if (!Number.isInteger(rangeDays) || rangeDays < 1 || rangeDays > MAX_RANGE_DAYS) {
    throw new TypeError('rangeDays must be an integer between 1 and 365');
  }
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError('now must be a valid Date');
  }

  const since = new Date(now.getTime() - rangeDays * MILLISECONDS_PER_DAY);
  const [
    activityTotal,
    activityActive,
    studentTotal,
    teacherTotal,
    submittedChoices,
    confirmedChoices,
  ] = await Promise.all([
    models.Activity.countDocuments({}),
    models.Activity.countDocuments({ startDate: { $lte: now }, endDate: { $gte: now } }),
    models.Student.countDocuments({}),
    models.Teacher.countDocuments({}),
    models.Choose.countDocuments({ isChose: true, createTime: { $gte: since } }),
    models.Final.countDocuments({}),
  ]);

  const total = assertCount(activityTotal, 'activities.total');
  const active = assertCount(activityActive, 'activities.active');
  if (active > total) {
    throw new TypeError('invalid aggregate count: activities.active');
  }

  return {
    ok: true,
    schemaVersion: 'sm-doubleassistant.dashboard.aggregate.v1',
    generatedAt: now.toISOString(),
    rangeDays,
    activities: {
      total,
      active,
    },
    participants: {
      students: assertCount(studentTotal, 'participants.students'),
      teachers: assertCount(teacherTotal, 'participants.teachers'),
    },
    choices: {
      submitted: assertCount(submittedChoices, 'choices.submitted'),
      confirmed: assertCount(confirmedChoices, 'choices.confirmed'),
    },
  };
}

module.exports = {
  MAX_RANGE_DAYS,
  MIN_TOKEN_BYTES,
  buildDashboardStats,
  isInternalRequest,
  isStrongToken,
  parseRangeDays,
  tokenMatches,
};
