'use strict';

const Controller = require('egg').Controller;

class StdinfoController extends Controller {
    //写入学生信息
    async writeUserMsg() {
        const { ctx, service } = this
        // console.log(ctx, service );

        const { name, gender, studentId } = ctx.request.body
        // console.log(name, gender, studentId);

        const res = await service.stdinfo.writeUserMsg(name, gender, studentId)
        console.log(res);
        ctx.send([], res.code, res.msg)
    }
    //更新学生信息
    async updateUserMsg() {
        const { ctx, service } = this
        const { name, gender, studentId } = ctx.request.body
        const res = await service.stdinfo.updateUserMsg(name, gender, studentId)
        ctx.send([], res.code, res.msg)
    }
    //新增学生选老师选项
    async selectTeacher() {
        const { ctx, service } = this
        const { studentId, teacherId, order, isChose, activityId,createTime } = ctx.request.body
        const res = await service.stdinfo.selectTeacher(studentId, teacherId, order, isChose, activityId,createTime)
        ctx.send([], res.code, res.msg)
    }
    //查询某活动的所有老师
    async getTeacherListInActivity() {
        const { ctx, service } = this
        const { activityId } = ctx.request.query
        const res = await service.stdinfo.getTeacherListInActivity(activityId)
        ctx.body = res
    }
}

module.exports = StdinfoController;
