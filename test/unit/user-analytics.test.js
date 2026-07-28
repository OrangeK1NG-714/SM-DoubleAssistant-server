'use strict';

const { strict: assert } = require('node:assert');
const { describe, it } = require('node:test');
const {
  actionForRequest,
  buildUserAnalytics,
  clientForRequest,
  parseUserAnalyticsQuery,
  recordUserActivity,
} = require('../../app/lib/user-analytics');

describe('user analytics telemetry', () => {
  it('accepts bounded filters and rejects unsafe query values', () => {
    assert.deepEqual(parseUserAnalyticsQuery({}), {
      rangeDays: 30,
      page: 1,
      pageSize: 20,
      role: '',
      engagement: '',
      search: '',
    });
    assert.deepEqual(parseUserAnalyticsQuery({
      days: '90',
      page: '2',
      pageSize: '50',
      role: 'student',
      engagement: 'active',
      q: '202401',
    }), {
      rangeDays: 90,
      page: 2,
      pageSize: 50,
      role: 'student',
      engagement: 'active',
      search: '202401',
    });
    for (const query of [
      { days: '0' },
      { days: '366' },
      { pageSize: '51' },
      { role: 'owner' },
      { engagement: 'online' },
      { q: 'name@example.com' },
    ]) {
      assert.equal(parseUserAnalyticsQuery(query), null);
    }
  });

  it('classifies routes and clients without retaining raw URLs or user agents', () => {
    assert.equal(actionForRequest('POST', '/api/student/selectTeacher'), 'submit_preferences');
    assert.equal(actionForRequest('POST', '/api/student/submitTeacherChoices'), 'submit_preferences');
    assert.equal(actionForRequest('GET', '/api/admin/getUserList'), 'view_users');
    assert.equal(actionForRequest('DELETE', '/api/admin/deleteUser'), 'manage_users');
    assert.equal(actionForRequest('GET', '/api/teacher/unknown'), 'read_data');
    assert.equal(clientForRequest({ get: name => (name === 'x-client-platform' ? 'mp-weixin' : '') }), 'mp-weixin');
    assert.equal(clientForRequest({ get: name => (name === 'user-agent' ? 'MicroMessenger/8.0' : '') }), 'wechat-web');
  });

  it('records only the fixed telemetry payload and updates login counters', async () => {
    const created = [];
    const updates = [];
    const ctx = {
      auth: { uid: '507f1f77bcf86cd799439011', username: '20240101', role: 'student' },
      get(name) {
        return name === 'x-client-platform' ? 'mp-weixin' : '';
      },
      logger: { warn() {} },
      model: {
        UserAnalyticsEvent: {
          async create(value) {
            created.push(value);
          },
        },
        Userinfo: {
          async updateOne(filter, update) {
            updates.push({ filter, update });
          },
        },
      },
    };
    const occurredAt = new Date('2026-07-24T12:00:00.000Z');
    assert.equal(await recordUserActivity(ctx, {
      type: 'login',
      action: 'login',
      occurredAt,
    }), true);
    assert.deepEqual(Object.keys(created[0]).sort(), [
      'action', 'client', 'occurredAt', 'role', 'status', 'type', 'userId', 'username',
    ]);
    assert.equal(created[0].client, 'mp-weixin');
    assert.equal(updates.length, 2);
    assert.equal(updates[1].update.$inc.loginCount, 1);
    assert.equal('password' in created[0], false);
  });

  it('builds range summaries, breakdowns and a password-free user page', async () => {
    const userPipelines = [];
    const eventPipelines = [];
    const models = {
      Userinfo: {
        async countDocuments(filter) {
          if (filter.lastSeenAt) return 3;
          if (filter.lastLoginAt && filter.lastLoginAt.$gte) return 2;
          if (filter.lastLoginAt && filter.lastLoginAt.$exists === false) return 7;
          return 10;
        },
        async aggregate(pipeline) {
          userPipelines.push(pipeline);
          return [{
            metadata: [{ total: 1 }],
            items: [{
              username: '20240101',
              role: 'student',
              loginCount: 4,
              activityCount: 12,
              lastAction: 'submit_preferences',
              lastClient: 'mp-weixin',
              lastLoginAt: new Date('2026-07-24T10:00:00.000Z'),
              lastSeenAt: new Date('2026-07-24T10:05:00.000Z'),
            }],
          }];
        },
      },
      UserAnalyticsEvent: {
        async countDocuments(filter) {
          return filter.type === 'login' ? 5 : 17;
        },
        async aggregate(pipeline) {
          eventPipelines.push(pipeline);
          return [{
            daily: [{ _id: '2026-07-24', events: 22, users: 3 }],
            dailyLogins: [{ _id: '2026-07-24', events: 5, users: 2 }],
            actions: [{ _id: 'submit_preferences', events: 7, users: 2 }],
            clients: [{ _id: 'mp-weixin', events: 22 }],
            roles: [{ _id: 'student', events: 22, users: 3 }],
          }];
        },
      },
    };

    const result = await buildUserAnalytics(models, {
      rangeDays: 30,
      page: 1,
      pageSize: 20,
      role: 'student',
      engagement: 'active',
      search: '2024',
    }, new Date('2026-07-24T12:00:00.000Z'));

    assert.equal(result.schemaVersion, 'sm-doubleassistant.user-analytics.v1');
    assert.deepEqual(result.summary, {
      totalUsers: 10,
      activeUsers: 3,
      loggedInUsers: 2,
      neverLoggedIn: 7,
      loginEvents: 5,
      actionEvents: 17,
    });
    assert.deepEqual(result.daily, [{
      day: '2026-07-24',
      events: 22,
      activeUsers: 3,
      logins: 5,
      loginUsers: 2,
    }]);
    assert.equal(result.breakdowns.actions[0].key, 'submit_preferences');
    assert.equal(result.users.items[0].username, '20240101');
    const serializedPipeline = JSON.stringify(userPipelines[0]);
    assert.equal(serializedPipeline.includes('password'), false);
    assert.equal(serializedPipeline.includes('2024'), true);
    assert.equal(eventPipelines.length, 1);
  });
});
