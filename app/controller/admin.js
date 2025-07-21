'use strict';

const Controller = require('egg').Controller;

class AdminController extends Controller {
    async getUserList() {
        const { ctx, service } = this;
        const res = await service.admin.getUserList();
        console.log(res);
        
        ctx.body = res
    }


    
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
        const { _id, name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
            secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate,
            stdChooseStartDate, stdChooseEndDate, firstChooseNum, secondChooseNum, thirdChooseNum,
            stdChooseNum } = ctx.request.body;
        const res = await service.admin.updateActivity(_id, name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
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

    //查询用户信息
    async getUserInfo() {
        const { ctx, service } = this;
        const {username,role} =ctx.query
        const res = await service.admin.getUserInfo(username,role);
        ctx.body = res;
    }
    //重置密码
    async resetPassword() {
        const { ctx, service } = this;
        const { username, password } = ctx.request.body;
        const res = await service.admin.resetPassword(username, password);
        ctx.send([], res.code, res.msg);
    }
    //重置所有选中用户密码
    async resetSelectedPassword() {
        const { ctx, service } = this;
        const { selectedUsers, password } = ctx.request.body;
        const res = await service.admin.resetSelectedPassword(selectedUsers, password);
        ctx.send([], res.code, res.msg);
    }
}

module.exports = AdminController;
