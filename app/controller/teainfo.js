'use strict';

const Controller = require('egg').Controller;

class TeainfoController extends Controller {
    async getTeaDetail() {
        const { ctx, service } = this;
        const res = await service.teainfo.getTeaDetail();
        ctx.body = res;
    }

    async updateChoose() {
        const { ctx, service } = this;
        const { studentId, teacherId, activityId } = ctx.request.body;
        const res = await service.teainfo.updateChoose(studentId, teacherId, activityId);
        ctx.send([], res.code, res.msg);
    }

    async selectStudent() {
        const { ctx, service } = this;
        const { studentId, teacherId, activityId, data, order } = ctx.request.body;
        const res = await service.teainfo.selectStudent(studentId, teacherId, activityId, data, order);
        ctx.send([], res.code, res.msg);
    }

    async cancelSelect() {
        const { ctx, service } = this;
        const { studentId, teacherId, activityId } = ctx.request.query;
        const res = await service.teainfo.cancelSelect(studentId, teacherId, activityId);
        ctx.send([], res.code, res.msg);
    }

    async getSelectList() {
        const { ctx, service } = this;
        const { teacherId, activityId, studentId } = ctx.request.query;
        const res = await service.teainfo.getSelectList(teacherId, activityId, studentId);
        ctx.body = res;
    }

    async isInActivity() {
        const { ctx, service } = this;
        const { teacherId, activityId } = ctx.request.query;
        const res = await service.teainfo.isInActivity(teacherId, activityId);
        if (res) {
            ctx.send([], 200, '导师在活动中');
        } else {
            ctx.send([], 404, '导师未在活动中');
        }
    }
}

module.exports = TeainfoController;
