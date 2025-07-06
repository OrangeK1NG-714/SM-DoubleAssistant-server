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
        const { studentId, teacherId} = ctx.request.body
        const res = await service.teainfo.updateChoose(studentId, teacherId)
        ctx.send([], res.code, res.msg)
    }
}

module.exports = TeainfoController;
