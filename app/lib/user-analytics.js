'use strict';

const MAX_RANGE_DAYS = 365;
const MAX_PAGE_SIZE = 50;
const RETENTION_DAYS = 400;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const USERNAME_PATTERN = /^[A-Za-z0-9]{0,20}$/;
const ROLES = new Set([ 'admin', 'student', 'teacher' ]);
const ENGAGEMENT_FILTERS = new Set([ 'active', 'inactive', 'never' ]);
const CLIENTS = new Set([ 'mp-weixin', 'wechat-web', 'web', 'app', 'unknown' ]);

const EXACT_ACTIONS = new Map([
  [ 'GET /api/user/getMyActivities', 'browse_activities' ],
  [ 'GET /api/admin/getActivityList', 'browse_activities' ],
  [ 'GET /api/admin/getActivityDetail', 'browse_activities' ],
  [ 'GET /api/user/detail', 'view_profile' ],
  [ 'GET /api/student/getMsg', 'view_profile' ],
  [ 'GET /api/teacher/detail', 'view_profile' ],
  [ 'POST /api/user/writeMsg', 'update_profile' ],
  [ 'PUT /api/user/updateMsg', 'update_profile' ],
  [ 'POST /api/student/selectTeacher', 'submit_preferences' ],
  [ 'POST /api/student/submitTeacherChoices', 'submit_preferences' ],
  [ 'POST /api/teacher/selectStudent', 'confirm_student' ],
  [ 'POST /api/teacher/selectStudentAndUpdate', 'confirm_student' ],
  [ 'DELETE /api/teacher/cancelSelect', 'confirm_student' ],
  [ 'POST /api/teacher/cancelSelectAndUpdate', 'confirm_student' ],
  [ 'GET /api/student/recommendTeachers', 'ai_recommendation' ],
  [ 'POST /api/student/uploadResume', 'upload_resume' ],
  [ 'GET /api/student/getStudentResume', 'view_resume' ],
  [ 'POST /api/student/saveOpenid', 'bind_wechat' ],
]);

function parseInteger(value, fallback, minimum, maximum) {
  if (value === undefined || value === '') return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function parseUserAnalyticsQuery(query = {}) {
  const rangeDays = parseInteger(query.days, 30, 1, MAX_RANGE_DAYS);
  const page = parseInteger(query.page, 1, 1, 100000);
  const pageSize = parseInteger(query.pageSize, 20, 1, MAX_PAGE_SIZE);
  const role = typeof query.role === 'string' ? query.role : '';
  const engagement = typeof query.engagement === 'string' ? query.engagement : '';
  const search = typeof query.q === 'string' ? query.q.trim() : '';
  if (rangeDays === null || page === null || pageSize === null) return null;
  if (role && !ROLES.has(role)) return null;
  if (engagement && !ENGAGEMENT_FILTERS.has(engagement)) return null;
  if (!USERNAME_PATTERN.test(search)) return null;
  return { rangeDays, page, pageSize, role, engagement, search };
}

function clientForRequest(ctx) {
  const declared = String(ctx.get && ctx.get('x-client-platform') || '').toLowerCase();
  if (CLIENTS.has(declared)) return declared;
  const userAgent = String(ctx.get && ctx.get('user-agent') || '').toLowerCase();
  if (userAgent.includes('micromessenger')) return 'wechat-web';
  if (userAgent.includes('uni-app') || userAgent.includes('uniapp')) return 'app';
  return userAgent ? 'web' : 'unknown';
}

function actionForRequest(method, requestPath) {
  const key = `${String(method || '').toUpperCase()} ${String(requestPath || '')}`;
  if (EXACT_ACTIONS.has(key)) return EXACT_ACTIONS.get(key);
  if (key.includes('/api/admin/getUser') || key.includes('/api/admin/register') ||
        key.includes('/api/admin/deleteUser') || key.includes('/api/admin/reset')) {
    return key.startsWith('GET ') ? 'view_users' : 'manage_users';
  }
  if (key.includes('/api/admin/') && key.toLowerCase().includes('activity')) {
    return key.startsWith('GET ') ? 'browse_activities' : 'manage_activities';
  }
  if (key.includes('Choose') || key.includes('Selected') || key.includes('select')) {
    return key.startsWith('GET ') ? 'review_selection' : 'manage_selection';
  }
  if (key.includes('/api/teacher/getTeacherResume')) return 'view_resume';
  if (key.includes('/api/admin/') || key.includes('/api/teacher/uploadTeacherResume')) return 'admin_operation';
  return key.startsWith('GET ') ? 'read_data' : 'write_data';
}

async function recordUserActivity(ctx, { type, action, status = 'success', occurredAt = new Date() }) {
  const auth = ctx && ctx.auth;
  const models = ctx && ctx.model;
  if (!auth || !models || !models.Userinfo || !models.UserAnalyticsEvent) return false;
  if (!ROLES.has(auth.role) || ![ 'login', 'action' ].includes(type)) return false;

  const client = clientForRequest(ctx);
  const payload = {
    userId: auth.uid,
    username: auth.username,
    role: auth.role,
    type,
    action,
    client,
    status: status === 'success' ? 'success' : 'error',
    occurredAt,
  };
  const writes = [
    models.UserAnalyticsEvent.create(payload),
  ];
  if (type === 'login') {
    writes.push(models.Userinfo.updateOne(
      { _id: auth.uid, firstLoginAt: { $exists: false } },
      { $set: { firstLoginAt: occurredAt } }
    ));
    writes.push(models.Userinfo.updateOne(
      { _id: auth.uid },
      {
        $set: {
          lastLoginAt: occurredAt,
          lastSeenAt: occurredAt,
          lastAction: action,
          lastClient: client,
        },
        $inc: { loginCount: 1 },
      }
    ));
  } else {
    writes.push(models.Userinfo.updateOne(
      { _id: auth.uid },
      {
        $set: {
          lastSeenAt: occurredAt,
          lastAction: action,
          lastClient: client,
        },
        $inc: { activityCount: 1 },
      }
    ));
  }

  const results = await Promise.allSettled(writes);
  const failures = results.filter(result => result.status === 'rejected');
  if (failures.length > 0) {
    const logger = ctx.logger || console;
    logger.warn('user analytics write failed', {
      failures: failures.length,
      type,
      action,
    });
    return false;
  }
  return true;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildUserFilter(options, since) {
  const filter = {};
  if (options.role) filter.role = options.role;
  if (options.search) filter.username = { $regex: escapeRegExp(options.search), $options: 'i' };
  if (options.engagement === 'active') {
    filter.lastSeenAt = { $gte: since };
  } else if (options.engagement === 'inactive') {
    filter.lastLoginAt = { $exists: true };
    filter.$or = [
      { lastSeenAt: { $lt: since } },
      { lastSeenAt: { $exists: false } },
    ];
  } else if (options.engagement === 'never') {
    filter.lastLoginAt = { $exists: false };
  }
  return filter;
}

function normalizeFacetRows(rows, withUsers = false) {
  return (rows || []).map(row => ({
    key: String(row._id),
    events: Number(row.events) || 0,
    ...(withUsers ? { users: Number(row.users) || 0 } : {}),
  }));
}

function mergeDaily(activeRows, loginRows) {
  const byDay = new Map();
  for (const row of activeRows || []) {
    byDay.set(String(row._id), {
      day: String(row._id),
      events: Number(row.events) || 0,
      activeUsers: Number(row.users) || 0,
      logins: 0,
      loginUsers: 0,
    });
  }
  for (const row of loginRows || []) {
    const day = String(row._id);
    const item = byDay.get(day) || { day, events: 0, activeUsers: 0, logins: 0, loginUsers: 0 };
    item.logins = Number(row.events) || 0;
    item.loginUsers = Number(row.users) || 0;
    byDay.set(day, item);
  }
  return [ ...byDay.values() ].sort((a, b) => a.day.localeCompare(b.day));
}

async function buildUserAnalytics(models, options, now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new TypeError('now must be a valid Date');
  if (!options || !Number.isInteger(options.rangeDays)) throw new TypeError('invalid analytics options');
  const since = new Date(now.getTime() - options.rangeDays * MILLISECONDS_PER_DAY);
  const eventFilter = { occurredAt: { $gte: since, $lt: now } };
  const userFilter = buildUserFilter(options, since);
  const userPipeline = [
    { $match: userFilter },
    {
      $sort: {
        lastSeenAt: -1,
        lastLoginAt: -1,
        username: 1,
      },
    },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        items: [
          { $skip: (options.page - 1) * options.pageSize },
          { $limit: options.pageSize },
          {
            $project: {
              _id: 0,
              username: 1,
              role: 1,
              firstLoginAt: 1,
              lastLoginAt: 1,
              loginCount: { $ifNull: [ '$loginCount', 0 ] },
              lastSeenAt: 1,
              activityCount: { $ifNull: [ '$activityCount', 0 ] },
              lastAction: { $ifNull: [ '$lastAction', '' ] },
              lastClient: { $ifNull: [ '$lastClient', 'unknown' ] },
            },
          },
        ],
      },
    },
  ];
  const analyticsPipeline = [
    { $match: eventFilter },
    {
      $facet: {
        daily: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$occurredAt', timezone: '+08:00' } },
              events: { $sum: 1 },
              usernames: { $addToSet: '$username' },
            },
          },
          { $project: { events: 1, users: { $size: '$usernames' } } },
        ],
        dailyLogins: [
          { $match: { type: 'login', status: 'success' } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$occurredAt', timezone: '+08:00' } },
              events: { $sum: 1 },
              usernames: { $addToSet: '$username' },
            },
          },
          { $project: { events: 1, users: { $size: '$usernames' } } },
        ],
        actions: [
          { $match: { type: 'action' } },
          { $group: { _id: '$action', events: { $sum: 1 }, usernames: { $addToSet: '$username' } } },
          { $project: { events: 1, users: { $size: '$usernames' } } },
          { $sort: { events: -1, _id: 1 } },
          { $limit: 12 },
        ],
        clients: [
          { $group: { _id: '$client', events: { $sum: 1 } } },
          { $sort: { events: -1, _id: 1 } },
        ],
        roles: [
          { $group: { _id: '$role', events: { $sum: 1 }, usernames: { $addToSet: '$username' } } },
          { $project: { events: 1, users: { $size: '$usernames' } } },
          { $sort: { users: -1, _id: 1 } },
        ],
      },
    },
  ];

  const [
    totalUsers,
    activeUsers,
    loggedInUsers,
    neverLoggedIn,
    loginEvents,
    actionEvents,
    userResults,
    analyticsResults,
  ] = await Promise.all([
    models.Userinfo.countDocuments({}),
    models.Userinfo.countDocuments({ lastSeenAt: { $gte: since } }),
    models.Userinfo.countDocuments({ lastLoginAt: { $gte: since } }),
    models.Userinfo.countDocuments({ lastLoginAt: { $exists: false } }),
    models.UserAnalyticsEvent.countDocuments({ ...eventFilter, type: 'login', status: 'success' }),
    models.UserAnalyticsEvent.countDocuments({ ...eventFilter, type: 'action' }),
    models.Userinfo.aggregate(userPipeline),
    models.UserAnalyticsEvent.aggregate(analyticsPipeline),
  ]);

  const userFacet = userResults[0] || { metadata: [], items: [] };
  const analyticsFacet = analyticsResults[0] || {};
  return {
    ok: true,
    schemaVersion: 'sm-doubleassistant.user-analytics.v1',
    generatedAt: now.toISOString(),
    rangeDays: options.rangeDays,
    retentionDays: RETENTION_DAYS,
    summary: {
      totalUsers,
      activeUsers,
      loggedInUsers,
      neverLoggedIn,
      loginEvents,
      actionEvents,
    },
    daily: mergeDaily(analyticsFacet.daily, analyticsFacet.dailyLogins),
    breakdowns: {
      actions: normalizeFacetRows(analyticsFacet.actions, true),
      clients: normalizeFacetRows(analyticsFacet.clients),
      roles: normalizeFacetRows(analyticsFacet.roles, true),
    },
    users: {
      page: options.page,
      pageSize: options.pageSize,
      total: userFacet.metadata[0] ? Number(userFacet.metadata[0].total) || 0 : 0,
      items: userFacet.items || [],
    },
  };
}

module.exports = {
  MAX_PAGE_SIZE,
  RETENTION_DAYS,
  actionForRequest,
  buildUserAnalytics,
  clientForRequest,
  parseUserAnalyticsQuery,
  recordUserActivity,
};
