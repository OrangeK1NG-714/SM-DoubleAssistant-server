'use strict';

const Service = require('egg').Service;

class AdminService extends Service {
    async addActivity(name, description, startDate, endDate) {
        const { ctx } = this;
        const res = await ctx.model.Activity.create({ name, description, startDate, endDate });
        return res;
    }
    async getActivityList() {
        const { ctx } = this;
        const res = await ctx.model.Activity.find();    
        return res;
    }
}

module.exports = AdminService;
