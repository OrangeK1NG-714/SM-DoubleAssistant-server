'use strict';

const Controller = require('egg').Controller;

class AdminController extends Controller {
    async addActivity() {
        const { ctx, service } = this;
        const { name, description, startDate, endDate } = ctx.request.body;
        const res = await service.admin.addActivity(name, description, startDate, endDate);
        ctx.send([], res.code, res.msg);
    }
    async getActivityList() {
        const { ctx, service } = this;
        const res = await service.admin.getActivityList();
        ctx.body = res
    }
}

module.exports = AdminController;
