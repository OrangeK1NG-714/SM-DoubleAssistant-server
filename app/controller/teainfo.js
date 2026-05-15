'use strict';

const Controller = require('egg').Controller;

class TeainfoController extends Controller {
    async getTeaDetail() {
        const { ctx, service } = this;
        try {
            const res = await service.teainfo.getTeaDetail();
            ctx.send(res.data, 200, 'success');
        } catch (err) {
            ctx.logger.error('getTeaDetail error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async updateChoose() {
        const { ctx, service } = this;
        try {
            const { studentId, teacherId, activityId } = ctx.request.body;
            if (!studentId || !teacherId || !activityId) {
                return ctx.send([], 400, '缺少必填参数 studentId/teacherId/activityId');
            }
            const res = await service.teainfo.updateChoose(studentId, teacherId, activityId);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('updateChoose error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async selectStudent() {
        const { ctx, service } = this;
        try {
            const { studentId, teacherId, activityId, data, order } = ctx.request.body;
            if (!studentId || !teacherId || !activityId || !data || order === undefined || order === null) {
                return ctx.send([], 400, '缺少必填参数');
            }
            const res = await service.teainfo.selectStudent(studentId, teacherId, activityId, data, order);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('selectStudent error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async cancelSelect() {
        const { ctx, service } = this;
        try {
            const { studentId, teacherId, activityId } = ctx.request.query;
            if (!studentId || !teacherId || !activityId) {
                return ctx.send([], 400, '缺少必填参数 studentId/teacherId/activityId');
            }
            const res = await service.teainfo.cancelSelect(studentId, teacherId, activityId);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('cancelSelect error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getSelectList() {
        const { ctx, service } = this;
        try {
            const { teacherId, activityId, studentId } = ctx.request.query;
            const res = await service.teainfo.getSelectList(teacherId, activityId, studentId);
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getSelectList error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async isInActivity() {
        const { ctx, service } = this;
        try {
            const { teacherId, activityId } = ctx.request.query;
            if (!teacherId || !activityId) {
                return ctx.send([], 400, '缺少参数 teacherId 或 activityId');
            }
            const res = await service.teainfo.isInActivity(teacherId, activityId);
            if (res) {
                ctx.send(res, 200, '导师在活动中');
            } else {
                ctx.send([], 404, '导师未在活动中');
            }
        } catch (err) {
            ctx.logger.error('isInActivity error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }
}

module.exports = TeainfoController;
