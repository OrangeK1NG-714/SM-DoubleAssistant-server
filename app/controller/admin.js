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
        const { activityId, teacherId, studentId } = ctx.request.body;
        console.log(activityId, teacherId, studentId);


        const res = await service.admin.addTeacherToActivity(activityId, teacherId, studentId);
        ctx.send([], res.code, res.msg)
    }

    //查询用户信息
    async getUserInfo() {
        const { ctx, service } = this;
        const { username, role } = ctx.query
        const res = await service.admin.getUserInfo(username, role);
        ctx.body = res;
    }
    //重置密码
    async resetPassword() {
        const { ctx, service } = this;
        const { username, password } = ctx.request.body;
        ctx.validate({
            username: { type: 'registerUsername', tips: '账号格式不正确' },
            password: { type: 'registerUserPassword', tips: '密码需要6-20位的字母和数字' }
        }, ctx.request.body)
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
    //查询某活动的所有用户
    async getUserListInActivity() {
        const { ctx, service } = this;
        const { activityId, username, role } = ctx.request.query;
        const res = await service.admin.getUserListInActivity(activityId, username, role);
        ctx.body = res
    }
    //删除某活动的某一用户
    async deleteUserInActivity() {
        const { ctx, service } = this;
        const { _id } = ctx.request.body;
        const res = await service.admin.deleteUserInActivity(_id);
        ctx.send([], res.code, res.msg);
    }
    //查询选择志愿列表
    async getSelectedList() {
        const { ctx, service } = this;
        const { studentId, activityId } = ctx.request.query;
        const res = await service.admin.getSelectedList(studentId, activityId);
        ctx.body = res
    }
    //删除某项选择志愿
    async deleteSelected() {
        const { ctx, service } = this;
        const { _id } = ctx.request.body;
        const res = await service.admin.deleteSelected(_id);
        ctx.send([], res.code, res.msg);
    }
    //查询最终志愿
    async getFinalList() {
        const { ctx, service } = this;
        const { studentId, teacherId, activityId } = ctx.request.query;
        const res = await service.admin.getFinalList(studentId, teacherId, activityId);
        ctx.body = res
    }
    //查询某活动的所有导师
    async getTeacherListInActivity() {
        const { ctx, service } = this;
        const { activityId } = ctx.request.query;
        const res = await service.admin.getTeacherListInActivity(activityId);
        ctx.body = res
    }
    //查询某活动的所有学生
    async getStudentListInActivity() {
        const { ctx, service } = this;
        const { activityId } = ctx.request.query;
        const res = await service.admin.getStudentListInActivity(activityId);
        ctx.body = res
    }
    //重置志愿
    async resetVolunteer() {
        const { ctx, service } = this;
        const { activityId, studentId } = ctx.request.body;
        const res = await service.admin.resetVolunteer(activityId, studentId);
        ctx.send([], res.code, res.msg);
    }
}

module.exports = AdminController;
