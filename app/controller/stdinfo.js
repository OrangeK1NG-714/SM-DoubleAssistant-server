'use strict';

const Controller = require('egg').Controller;

class StdinfoController extends Controller {
    //写入学生信息
    async writeUserMsg() {
        const { ctx, service } = this
        // console.log(ctx, service );

        const { name, gender, studentId, grade, classNum, phone, gpa, direction } = ctx.request.body
        // console.log(name, gender, studentId);

        const res = await service.stdinfo.writeUserMsg(name, gender, studentId, grade, classNum, phone, gpa, direction)
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
        const { studentId, teacherId, order, isChose, activityId, createTime } = ctx.request.body
        const res = await service.stdinfo.selectTeacher(studentId, teacherId, order, isChose, activityId, createTime)
        ctx.send([], res.code, res.msg)
    }
    //查询某活动的所有老师
    async getTeacherListInActivity() {
        const { ctx, service } = this
        const { activityId } = ctx.request.query
        const res = await service.stdinfo.getTeacherListInActivity(activityId)
        ctx.body = res
    }

    //查询某学生是否在活动中
    async isInActivity() {
        const { ctx, service } = this
        const { studentId, activityId } = ctx.request.query
        const res = await service.stdinfo.isInActivity(studentId, activityId)
        if(res){
            ctx.send([], 200, '学生在活动中')
        }else{
            ctx.send([], 201, '学生未在活动中')
        }
    }

    //查询学生信息
    async getStudentMsg() {
        const { ctx, service } = this
        const { studentId } = ctx.request.query
        const res = await service.stdinfo.getStudentMsg(studentId)
        console.log(res);
        ctx.body = res
    }

}

module.exports = StdinfoController;
