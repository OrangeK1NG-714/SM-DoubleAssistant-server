'use strict';

const Controller = require('egg').Controller;

class UserinfoController extends Controller {
    //注册用户账号
    async userRegister() {
        const { ctx, service } = this
        const { username, password, role, name } = ctx.request.body
        ctx.validate({
            username: { type: 'registerUsername', tips: '账号格式不正确' },
            password: { type: 'registerUserPassword', tips: '密码需要6-20位的字母和数字' }
        }, ctx.request.body)
        if (role === 'teacher' && !name) {
            ctx.send([], 400, '教师注册必须填写姓名')
            return
        }
        const res = await service.userinfo.userRegister(username, password, role, name)
        ctx.send([], res.code, res.msg)
    }
    //登录账号post
    async userLogin() {
        const { ctx, service } = this
        const { username, password } = ctx.request.body
        ctx.validate({
            username: { type: 'registerUsername', tips: '账号格式不正确' },
            password: { type: 'registerUserPassword', tips: '密码需要6-20位的字母和数字' }
        }, ctx.request.body)
        const { data, msg, code } = await service.userinfo.userLogin(username, password)
        console.log(data, code, msg);
        // 设置Authorization头
        ctx.set('Authorization', `Bearer ${data.token}`);
        ctx.send(data, code, msg)
    }
    // 获取用户详细信息
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
    //根据活动id去查询所有学生的选择情况
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
    //查询已选学生数(通过老师id+活动id)
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
    //查询一个学生的选择情况(根据活动id+学生id)
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
}

module.exports = UserinfoController;
