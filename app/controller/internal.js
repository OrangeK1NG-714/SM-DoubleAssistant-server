'use strict';

const Controller = require('egg').Controller;
const {
  buildDashboardStats,
  isInternalRequest,
  isStrongToken,
  parseRangeDays,
  tokenMatches,
} = require('../lib/internal-dashboard-stats');
const {
  buildUserAnalytics,
  parseUserAnalyticsQuery,
} = require('../lib/user-analytics');

function authorizeInternalRequest(app, ctx) {
  ctx.set('Cache-Control', 'no-store');
  const remoteAddress = ctx.req.socket && ctx.req.socket.remoteAddress;
  if (!isInternalRequest(remoteAddress, ctx.hostname)) {
    ctx.status = 404;
    ctx.body = { ok: false, code: 'not_found' };
    return false;
  }

  const token = app.config.internalDashboardStats && app.config.internalDashboardStats.token;
  if (!isStrongToken(token)) {
    ctx.status = 503;
    ctx.body = { ok: false, code: 'dashboard_stats_unconfigured' };
    return false;
  }
  if (!tokenMatches(ctx.get('authorization'), token)) {
    ctx.set('WWW-Authenticate', 'Bearer');
    ctx.status = 401;
    ctx.body = { ok: false, code: 'unauthorized' };
    return false;
  }
  return true;
}

class InternalController extends Controller {
  async dashboardStats() {
    const { app, ctx } = this;
    if (!authorizeInternalRequest(app, ctx)) return;

    const rangeDays = parseRangeDays(ctx.query.days);
    if (rangeDays === null) {
      ctx.status = 400;
      ctx.body = { ok: false, code: 'invalid_range_days' };
      return;
    }

    try {
      ctx.body = await buildDashboardStats(app.model, rangeDays);
      ctx.status = 200;
    } catch (error) {
      ctx.logger.error('internal dashboard stats aggregation failed', error);
      ctx.status = 503;
      ctx.body = { ok: false, code: 'dashboard_stats_unavailable' };
    }
  }

  async userAnalytics() {
    const { app, ctx } = this;
    if (!authorizeInternalRequest(app, ctx)) return;

    const options = parseUserAnalyticsQuery(ctx.query);
    if (!options) {
      ctx.status = 400;
      ctx.body = { ok: false, code: 'invalid_user_analytics_query' };
      return;
    }

    try {
      ctx.body = await buildUserAnalytics(app.model, options);
      ctx.status = 200;
    } catch (error) {
      ctx.logger.error('internal user analytics aggregation failed', error);
      ctx.status = 503;
      ctx.body = { ok: false, code: 'user_analytics_unavailable' };
    }
  }
}

module.exports = InternalController;
