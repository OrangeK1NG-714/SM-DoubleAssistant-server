'use strict';

const Controller = require('egg').Controller;

class AdminController extends Controller {
    async addActivity() {
        const { ctx, service } = this;
        const { name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
            secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate,
            stdChooseStartDate, stdChooseEndDate, firstChooseNum, secondChooseNum, thirdChooseNum,
            stdChooseNum } = ctx.request.body;
        const res = await service.admin.addActivity(name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
            secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate,
            stdChooseStartDate, stdChooseEndDate, firstChooseNum, secondChooseNum, thirdChooseNum,
            stdChooseNum);
        ctx.send([], res.code, res.msg);
    }
    async getActivityList() {
        const { ctx, service } = this;
        const res = await service.admin.getActivityList();
        ctx.body = res
    }
    //获取某一活动详情
    async getActivityDetail() {
        const { ctx, service } = this;
        const { id } = ctx.request.query
        const res = await service.admin.getActivityDetail(id);
        ctx.body = res
    }
    async deleteActivity() {
        const { ctx, service } = this;
        const { id } = ctx.request.body;
        const res = await service.admin.deleteActivity(id);
        ctx.send([], res.code, res.msg)
    }
    async updateActivity() {
        const { ctx, service } = this;
        const { id, name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
            secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate,
            stdChooseStartDate, stdChooseEndDate, firstChooseNum, secondChooseNum, thirdChooseNum,
            stdChooseNum } = ctx.request.body;
        const res = await service.admin.updateActivity(id, name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
            secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate,
            stdChooseStartDate, stdChooseEndDate, firstChooseNum, secondChooseNum, thirdChooseNum,
            stdChooseNum);
        ctx.send([], res.code, res.msg)
    }
    async addTeacherToActivity() {
        const { ctx, service } = this;
        const { activityId, teacherId } = ctx.request.body;
        console.log(activityId, teacherId);

        const res = await service.admin.addTeacherToActivity(activityId, teacherId);
        ctx.send([], res.code, res.msg)
    }
}

module.exports = AdminController;
