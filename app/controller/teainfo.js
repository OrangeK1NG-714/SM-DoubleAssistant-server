'use strict';

const Controller = require('egg').Controller;

class TeainfoController extends Controller {
    //获取老师信息
    async getTeaDetail() {
        const { ctx, service } = this
        const res = await service.teainfo.getTeaDetail()
        console.log(res);

        ctx.body = res
    }
}

module.exports = TeainfoController;
