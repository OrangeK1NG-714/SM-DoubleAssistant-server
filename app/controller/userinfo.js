'use strict';

const Controller = require('egg').Controller;

class UserinfoController extends Controller {
    //注册用户账号
    async userRegister() {
        const { ctx, service } = this
        const { username, password, role } = ctx.request.body
        ctx.validate({
            username: { type: 'registerUsername', tips: '账号格式不正确' },
            password: { type: 'registerUserPassword', tips: '密码需要6-20位的字母和数字' }
        }, ctx.request.body)
        // ctx.validate({ phone: { type: 'adminPhone', tips: '手机格式不正确' } }, ctx.request.body)
        const res = await service.userinfo.userRegister(username, password, role)
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
        ctx.send(data, code, msg)
    }
    // 获取用户详细信息
    async getUserDetail() {
        const { ctx, service } = this;
        const { username, role } = ctx.query;
        console.log(username, role);
        console.log(111111111);

        if (!username || !role) {
            ctx.body = { code: 400, msg: '缺少参数' };
            return;
        }
        const res = await service.userinfo.getUserDetail(username, role);
        console.log('----------');
        console.log(res);
        
        ctx.body = res;
    }
}

module.exports = UserinfoController;
