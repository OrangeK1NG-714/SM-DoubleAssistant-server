const jwt = require('jsonwebtoken');
const { hasValidIdentity } = require('../lib/access-control');
const { actionForRequest, recordUserActivity } = require('../lib/user-analytics');

module.exports = (options = { requiredRole: null }) => {
  return async (ctx, next) => {
    const authHeader = ctx.headers.authorization;
    if (!authHeader) {
      return ctx.send([], 401, '未提供 Token');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return ctx.send([], 401, 'Token 格式错误');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, ctx.app.config.jwt.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return ctx.send([], 401, 'Token 已过期');
      }
      return ctx.send([], 401, '无效 Token');
    }

    const auth = {
      uid: decoded.uid,
      role: decoded.role,
      username: decoded.username,
    };
    if (
      decoded.type !== 'access'
      || typeof decoded.uid !== 'string'
      || decoded.uid.length < 1
      || decoded.uid.length > 128
      || !hasValidIdentity(auth)
    ) {
      return ctx.send([], 401, '无效 Token');
    }

    if (options.requiredRole && auth.role !== options.requiredRole) {
      return ctx.send([], 403, '无权访问此资源');
    }

    ctx.auth = auth;

    try {
      await next();
    } finally {
      await recordUserActivity(ctx, {
        type: 'action',
        action: actionForRequest(ctx.method, ctx.path),
        status: ctx.status >= 200 && ctx.status < 400 ? 'success' : 'error',
      });
    }
  };
};
