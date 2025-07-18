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
    //老师选学生-即（修改学生选老师选项）
    async updateChoose() {
        const { ctx, service } = this
        const { studentId, teacherId,activityId } = ctx.request.body
        const res = await service.teainfo.updateChoose(studentId, teacherId,activityId)

        ctx.send([], res.code, res.msg)
    }
    //老师选学生（新增到老师选学生表）
    async selectStudent() {
        const { ctx, service } = this
        const { studentId, teacherId,activityId,data,order } = ctx.request.body
        const res = await service.teainfo.selectStudent(studentId, teacherId,activityId,data,order)

        ctx.send([], res.code, res.msg)
    }
    //老师取消选择学生
    async cancelSelect() {
        const { ctx, service } = this
        const { studentId, teacherId,activityId } = ctx.request.query
        const res = await service.teainfo.cancelSelect(studentId, teacherId,activityId)        
        ctx.send([], res.code, res.msg)
    }
    //查看final表中某位老师选择的学生情况
    async getSelectList() {
        const { ctx, service } = this
        const { teacherId,activityId,studentId } = ctx.request.query
        const res = await service.teainfo.getSelectList(teacherId,activityId,studentId)

        ctx.body =res
    }
    
}

module.exports = TeainfoController;
