'use strict';

const { strict: assert } = require('node:assert');
const { describe, it } = require('node:test');
const InternalController = require('../../app/controller/internal');
const {
  buildDashboardStats,
  isInternalRequest,
  isStrongToken,
  parseRangeDays,
  tokenMatches,
} = require('../../app/lib/internal-dashboard-stats');

function createModels(value = 0) {
  const model = { countDocuments: async () => value };
  return {
    Activity: model,
    Student: model,
    Teacher: model,
    Choose: model,
    Final: model,
    Userinfo: {
      countDocuments: async () => value,
      aggregate: async () => [{ metadata: [], items: [] }],
    },
    UserAnalyticsEvent: {
      countDocuments: async () => value,
      aggregate: async () => [{}],
    },
  };
}

function createContext({
  address = '127.0.0.1',
  authorization = '',
  days,
  hostname = '127.0.0.1',
  models = createModels(),
  token = 'dashboard-stats-token-that-is-long-enough',
} = {}) {
  const responseHeaders = {};
  return {
    app: {
      config: { internalDashboardStats: { token } },
      model: models,
    },
    service: {},
    req: { socket: { remoteAddress: address } },
    hostname,
    query: { days },
    logger: { error() {} },
    get(name) {
      return name.toLowerCase() === 'authorization' ? authorization : '';
    },
    set(name, value) {
      responseHeaders[name.toLowerCase()] = value;
    },
    responseHeaders,
  };
}

describe('internal dashboard stats contract', () => {
  it('accepts only the supported rolling-day range', () => {
    assert.equal(parseRangeDays(undefined), 30);
    assert.equal(parseRangeDays(''), 30);
    assert.equal(parseRangeDays('1'), 1);
    assert.equal(parseRangeDays('365'), 365);
    for (const value of [ '0', '01', '1.5', '366', '1e2', 'abc', 30 ]) {
      assert.equal(parseRangeDays(value), null);
    }
  });

  it('requires an exact loopback socket and loopback hostname', () => {
    assert.equal(isInternalRequest('127.0.0.1', '127.0.0.1'), true);
    assert.equal(isInternalRequest('::ffff:127.0.0.1', 'localhost'), true);
    assert.equal(isInternalRequest('::1', '::1'), true);
    assert.equal(isInternalRequest('10.0.0.8', '127.0.0.1'), false);
    assert.equal(isInternalRequest('127.0.0.1', 'www.richardq.tech'), false);
  });

  it('requires a strong independent bearer token and compares it exactly', () => {
    const token = 'dashboard-stats-token-that-is-long-enough';
    assert.equal(isStrongToken('short'), false);
    assert.equal(isStrongToken(token), true);
    assert.equal(tokenMatches(`Bearer ${token}`, token), true);
    assert.equal(tokenMatches(`Bearer ${token}x`, token), false);
    assert.equal(tokenMatches(`bearer ${token}`, token), false);
  });

  it('returns only the fixed aggregate schema with the expected filters', async () => {
    const calls = [];
    const countModel = (name, value) => ({
      async countDocuments(filter) {
        calls.push({ name, filter });
        return value;
      },
    });
    const models = {
      Activity: countModel('Activity', 4),
      Student: countModel('Student', 82),
      Teacher: countModel('Teacher', 17),
      Choose: countModel('Choose', 30),
      Final: countModel('Final', 24),
    };
    let activityCall = 0;
    models.Activity.countDocuments = async filter => {
      calls.push({ name: 'Activity', filter });
      activityCall += 1;
      return activityCall === 1 ? 4 : 1;
    };

    const now = new Date('2026-07-24T12:00:00.000Z');
    const result = await buildDashboardStats(models, 30, now);

    assert.deepEqual(result, {
      ok: true,
      schemaVersion: 'sm-doubleassistant.dashboard.aggregate.v1',
      generatedAt: '2026-07-24T12:00:00.000Z',
      rangeDays: 30,
      activities: { total: 4, active: 1 },
      participants: { students: 82, teachers: 17 },
      choices: { submitted: 30, confirmed: 24 },
    });
    assert.deepEqual(calls[1].filter, {
      startDate: { $lte: now },
      endDate: { $gte: now },
    });
    assert.deepEqual(calls[4].filter, {
      isChose: true,
      createTime: { $gte: new Date('2026-06-24T12:00:00.000Z') },
    });
  });

  it('rejects impossible model counts before returning a response', async () => {
    const model = value => ({ countDocuments: async () => value });
    const models = {
      Activity: model(-1),
      Student: model(0),
      Teacher: model(0),
      Choose: model(0),
      Final: model(0),
    };
    await assert.rejects(buildDashboardStats(models, 30), /activities\.total/);
  });

  it('hides the controller route from non-loopback hosts before authentication', async () => {
    const ctx = createContext({
      authorization: 'Bearer dashboard-stats-token-that-is-long-enough',
      hostname: 'www.richardq.tech',
    });
    await new InternalController(ctx).dashboardStats();
    assert.equal(ctx.status, 404);
    assert.deepEqual(ctx.body, { ok: false, code: 'not_found' });
  });

  it('fails closed for missing configuration, bad credentials, and invalid ranges', async () => {
    const unconfigured = createContext({ token: '' });
    await new InternalController(unconfigured).dashboardStats();
    assert.equal(unconfigured.status, 503);
    assert.deepEqual(unconfigured.body, { ok: false, code: 'dashboard_stats_unconfigured' });

    const unauthorized = createContext({ authorization: 'Bearer wrong-token-that-is-long-enough' });
    await new InternalController(unauthorized).dashboardStats();
    assert.equal(unauthorized.status, 401);
    assert.equal(unauthorized.responseHeaders['www-authenticate'], 'Bearer');

    const invalidRange = createContext({
      authorization: 'Bearer dashboard-stats-token-that-is-long-enough',
      days: '366',
    });
    await new InternalController(invalidRange).dashboardStats();
    assert.equal(invalidRange.status, 400);
    assert.deepEqual(invalidRange.body, { ok: false, code: 'invalid_range_days' });
  });

  it('returns the aggregate contract with no-store caching on an authorized request', async () => {
    const ctx = createContext({
      authorization: 'Bearer dashboard-stats-token-that-is-long-enough',
      days: '7',
    });
    await new InternalController(ctx).dashboardStats();
    assert.equal(ctx.status, 200);
    assert.equal(ctx.body.schemaVersion, 'sm-doubleassistant.dashboard.aggregate.v1');
    assert.equal(ctx.body.rangeDays, 7);
    assert.deepEqual(ctx.body.participants, { students: 0, teachers: 0 });
    assert.equal(ctx.responseHeaders['cache-control'], 'no-store');
  });

  it('returns bounded per-user analytics only through the same internal boundary', async () => {
    const ctx = createContext({
      authorization: 'Bearer dashboard-stats-token-that-is-long-enough',
      days: '7',
    });
    ctx.query = { days: '7', page: '1', pageSize: '20', role: 'student' };
    await new InternalController(ctx).userAnalytics();
    assert.equal(ctx.status, 200);
    assert.equal(ctx.body.schemaVersion, 'sm-doubleassistant.user-analytics.v1');
    assert.equal(ctx.body.rangeDays, 7);
    assert.deepEqual(ctx.body.users, { page: 1, pageSize: 20, total: 0, items: [] });
    assert.equal(ctx.responseHeaders['cache-control'], 'no-store');

    const invalid = createContext({
      authorization: 'Bearer dashboard-stats-token-that-is-long-enough',
    });
    invalid.query = { q: 'not-an-email@example.com' };
    await new InternalController(invalid).userAnalytics();
    assert.equal(invalid.status, 400);
    assert.deepEqual(invalid.body, { ok: false, code: 'invalid_user_analytics_query' });
  });
});
