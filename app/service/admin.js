'use strict';

const Service = require('egg').Service;

class AdminService extends Service {
    async addActivity(name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate, secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate, stdChooseStartDate, stdChooseEndDate, firstChooseCount, secondChooseCount, thirdChooseCount, stdChooseCount) {
        const { ctx } = this;
        const res = await ctx.model.Activity.create({ name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate, secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate, stdChooseStartDate, stdChooseEndDate, firstChooseCount, secondChooseCount, thirdChooseCount, stdChooseCount });
        return res;
    }
    async getActivityList() {
        const { ctx } = this;
        const res = await ctx.model.Activity.find();
        return res;
    }
    //获取某一活动详情
    async getActivityDetail(id) {
        const { ctx } = this;
        const res = await ctx.model.Activity.findById(id);
        return res;
    }
    
    async updateActivity(id, name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate, secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate, stdChooseStartDate, stdChooseEndDate, firstChooseCount, secondChooseCount, thirdChooseCount, stdChooseCount) {
        const { ctx } = this;        
        const res = await ctx.model.Activity.findByIdAndUpdate(id, { name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate, secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate, stdChooseStartDate, stdChooseEndDate, firstChooseCount, secondChooseCount, thirdChooseCount, stdChooseCount });
        return res;
    }
    async deleteActivity(id) {
        const { ctx } = this;
        const res = await ctx.model.Activity.findByIdAndDelete(id);
        return res;
    }
    async addTeacherToActivity(activityId, teacherId) {
        const { ctx } = this;
        // //先查询活动是否存在
        // const activity = await ctx.model.Activity.findById(activityId);
        // if (!activity) {
        //     return { code: 400, msg: '活动不存在' };
        // }
        // //再查询老师是否存在
        // const teacher = await ctx.model.Teacher.findById(teacherId);
        // if (!teacher) {
        //     return { code: 400, msg: '老师不存在' };
        // }
        const res = await ctx.model.UserInActivity.create({ activityId: activityId, teacherId: teacherId });
        return res;
    }
}

module.exports = AdminService;
