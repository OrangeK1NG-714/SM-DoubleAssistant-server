const jwt = require('jsonwebtoken');

module.exports = (options = { requiredRole: null }) => { // 支持传入需要的角色
  return async (ctx, next) => {
    // 1. 获取 Token
    const authHeader = ctx.headers.authorization;
    if (!authHeader) {
      return ctx.send([], 401, '未提供 Token');
    }

    // 提取 Bearer Token
    const token = authHeader.split(' ')[1]; // 格式: "Bearer <token>"
    if (!token) {
      return ctx.send([], 401, 'Token 格式错误');
    }

    // 2. 验证 Token
    let decoded;
    try {
      decoded = jwt.verify(token, ctx.app.config.jwt.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return ctx.send([], 401, 'Token 已过期');
      }
      return ctx.send([], 401, '无效 Token');
    }

    // 3. 检查角色权限（如果配置了 requiredRole）
    if (options.requiredRole && decoded.role !== options.requiredRole) {
      return ctx.send([], 403, '无权访问此资源');
    }

    // 4. 附加用户信息到 ctx
    ctx.auth = {
      uid: decoded.uid,
      role: decoded.role // 确保 Token 中包含 role 字段
    };

    await next();
  };
};