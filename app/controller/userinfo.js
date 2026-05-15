'use strict';

const Controller = require('egg').Controller;
const jwt = require('jsonwebtoken');

class UserinfoController extends Controller {
    async userRegister() {
        const { ctx, service } = this;
        const { username, password, role, name, teacherType } = ctx.request.body;
        ctx.validate({
            username: { type: 'registerUsername', tips: '账号格式不正确' },
            password: { type: 'registerUserPassword', tips: '密码需要6-20位的字母和数字' },
        }, ctx.request.body);
        if (role === 'teacher' && !name) {
            ctx.send([], 400, '教师注册必须填写姓名');
            return;
        }
        const res = await service.userinfo.userRegister(username, password, role, name, teacherType);
        ctx.send([], res.code, res.msg);
    }

    async userLogin() {
        const { ctx, service } = this;
        const { username, password } = ctx.request.body;
        ctx.validate({
            username: { type: 'registerUsername', tips: '账号格式不正确' },
            password: { type: 'registerUserPassword', tips: '密码需要6-20位的字母和数字' },
        }, ctx.request.body);
        const { data, msg, code } = await service.userinfo.userLogin(username, password);
        if (data.accessToken) {
            ctx.set('Authorization', `Bearer ${data.accessToken}`);
        }
        ctx.send(data, code, msg);
    }

    async getUserDetail() {
        const { ctx, service } = this;
        const { username, role } = ctx.query;
        if (!username || !role) {
            ctx.body = { code: 400, msg: '缺少参数' };
            return;
        }
        const res = await service.userinfo.getUserDetail(username, role);
        ctx.body = res;
    }

    async getChooseList() {
        const { ctx, service } = this;
        const { activityId } = ctx.query;
        if (!activityId) {
            ctx.body = { code: 400, msg: '缺少参数' };
            return;
        }
        const res = await service.userinfo.getChooseList(activityId);
        ctx.body = res;
    }

    async getChooseCount() {
        const { ctx, service } = this;
        const { teacherId, activityId } = ctx.query;
        if (!teacherId || !activityId) {
            ctx.body = { code: 400, msg: '缺少参数' };
            return;
        }
        const res = await service.userinfo.getChooseCount(teacherId, activityId);
        ctx.body = res;
    }

    async getChooseDetail() {
        const { ctx, service } = this;
        const { activityId, studentId } = ctx.query;
        if (!activityId || !studentId) {
            ctx.body = { code: 400, msg: '缺少参数' };
            return;
        }
        const res = await service.userinfo.getChooseDetail(activityId, studentId);
        ctx.body = res;
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

            const accessToken = ctx.generateToken(decoded.uid);
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
