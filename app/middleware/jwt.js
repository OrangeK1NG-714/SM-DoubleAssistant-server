const jwt = require('jsonwebtoken');

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

        if (options.requiredRole && decoded.role !== options.requiredRole) {
            return ctx.send([], 403, '无权访问此资源');
        }

        ctx.auth = {
            uid: decoded.uid,
            role: decoded.role,
        };

        await next();
    };
};
