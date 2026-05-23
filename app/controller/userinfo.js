'use strict';

const Controller = require('egg').Controller;
const jwt = require('jsonwebtoken');

class UserinfoController extends Controller {
    async userRegister() {
        const { ctx, service } = this;
        try {
            const { username, password, role, name, teacherType } = ctx.request.body;
            ctx.validate({
                username: { type: 'registerUsername', tips: '账号格式不正确' },
                password: { type: 'registerUserPassword', tips: '密码需要6-20位的字母和数字' },
            }, ctx.request.body);
            if (role === 'teacher' && !name) {
                return ctx.send([], 400, '教师注册必须填写姓名');
            }
            const res = await service.userinfo.userRegister(username, password, role, name, teacherType);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            if (err.status === 422) throw err;
            ctx.logger.error('userRegister error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async userLogin() {
        const { ctx, service } = this;
        try {
            const { username, password } = ctx.request.body;
            ctx.validate({
                username: { type: 'registerUsername', tips: '账号格式不正确' },
                password: { type: 'registerUserPassword', tips: '密码需要6-20位的字母和数字' },
            }, ctx.request.body);
            const result = await service.userinfo.userLogin(username, password);
            if (result.data && result.data.accessToken) {
                ctx.set('Authorization', `Bearer ${result.data.accessToken}`);
            }
            ctx.send(result.data, result.code, result.msg);
        } catch (err) {
            if (err.status === 422) throw err;
            ctx.logger.error('userLogin error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getUserDetail() {
        const { ctx, service } = this;
        try {
            const { username, role } = ctx.query;
            if (!username || !role) {
                return ctx.send([], 400, '缺少参数 username 或 role');
            }
            const res = await service.userinfo.getUserDetail(username, role);
            ctx.send(res.data || [], res.code, res.msg || 'success');
            if (res.isEmpty !== undefined) {
                ctx.body.isEmpty = res.isEmpty;
            }
        } catch (err) {
            ctx.logger.error('getUserDetail error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getChooseList() {
        const { ctx, service } = this;
        try {
            const { activityId } = ctx.query;
            if (!activityId) {
                return ctx.send([], 400, '缺少参数 activityId');
            }
            const res = await service.userinfo.getChooseList(activityId);
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getChooseList error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getChooseCount() {
        const { ctx, service } = this;
        try {
            const { teacherId, activityId } = ctx.query;
            if (!teacherId || !activityId) {
                return ctx.send([], 400, '缺少参数 teacherId 或 activityId');
            }
            const res = await service.userinfo.getChooseCount(teacherId, activityId);
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getChooseCount error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getChooseDetail() {
        const { ctx, service } = this;
        try {
            const { activityId, studentId } = ctx.query;
            if (!activityId || !studentId) {
                return ctx.send([], 400, '缺少参数 activityId 或 studentId');
            }
            const res = await service.userinfo.getChooseDetail(activityId, studentId);
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getChooseDetail error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async selfResetPassword() {
        const { ctx, service } = this;
        try {
            const { username, oldPassword, newPassword } = ctx.request.body;
            if (!username || !oldPassword || !newPassword) {
                return ctx.send([], 400, '缺少必填参数');
            }
            ctx.validate({
                username: { type: 'registerUsername', tips: '账号格式不正确' },
                newPassword: { type: 'registerUserPassword', tips: '密码需要6-20位的字母和数字' },
            }, { username, newPassword });
            const res = await service.userinfo.selfResetPassword(username, oldPassword, newPassword);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            if (err.status === 422) throw err;
            ctx.logger.error('selfResetPassword error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getMyActivities() {
        const { ctx, service } = this;
        try {
            const { username, role } = ctx.auth;
            const res = await service.userinfo.getMyActivities(username, role);
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getMyActivities error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async refreshToken() {
        const { ctx } = this;
        const { refreshToken } = ctx.request.body;
        if (!refreshToken) {
            return ctx.send([], 401, '未提供refresh token');
        }
        try {
            const decoded = jwt.verify(refreshToken, ctx.app.config.jwt.refreshSecret);
            if (decoded.type !== 'refresh') {
                return ctx.send([], 401, '无效的refresh token');
            }
            const accessToken = ctx.generateToken(decoded.uid, decoded.role, decoded.username);
            ctx.send({ accessToken }, 200, 'token刷新成功');
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return ctx.send([], 401, 'refresh token已过期');
            }
            return ctx.send([], 401, '无效的refresh token');
        }
    }
}

module.exports = UserinfoController;
