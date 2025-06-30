'use strict';

const Controller = require('egg').Controller;

class UserinfoController extends Controller {
    //注册用户账号
    async userRegister() {
        const { ctx, service } = this
        const { username, password } = ctx.request.body
        ctx.validate({
            username: { type: 'adminPhone', tips: '手机格式不正确' },
            password: { type: 'adminPassword', tips: '密码需要6-8位的字母和数字' }
        }, ctx.request.body)
        // ctx.validate({ phone: { type: 'adminPhone', tips: '手机格式不正确' } }, ctx.request.body)
        const res = await service.userinfo.userRegister(username, password)
        ctx.send([], res.code, res.msg)
    }
    //登录账号post
    async userLogin() {
        const { ctx, service } = this
        const { username, password } = ctx.request.body
        ctx.validate({
            username: { type: 'adminPhone', tips: '手机格式不正确' },
            password: { type: 'adminPassword', tips: '密码需要6-8位的字母和数字' }
        }, ctx.request.body)
        const { data, msg, code } = await service.userinfo.userLogin(username, password)
        ctx.send(data, code, msg)
    }
}

module.exports = UserinfoController;
