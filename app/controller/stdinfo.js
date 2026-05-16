'use strict';

const Controller = require('egg').Controller;

class StdinfoController extends Controller {
    async writeUserMsg() {
        const { ctx, service } = this;
        try {
            if (ctx.auth.role !== 'student' && ctx.auth.role !== 'admin') {
                return ctx.send([], 403, '仅学生或管理员可操作');
            }
            const { name, gender, studentId, grade, classNum, phone, gpa, direction, qq, wechat } = ctx.request.body;
            if (!studentId) {
                return ctx.send([], 400, '缺少必填参数 studentId');
            }
            if (ctx.auth.role === 'student' && ctx.auth.username !== studentId) {
                return ctx.send([], 403, '无权操作他人信息');
            }
            const res = await service.stdinfo.writeUserMsg(name, gender, studentId, grade, classNum, phone, gpa, direction, qq, wechat);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('writeUserMsg error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async updateUserMsg() {
        const { ctx, service } = this;
        try {
            if (ctx.auth.role !== 'student' && ctx.auth.role !== 'admin') {
                return ctx.send([], 403, '仅学生或管理员可操作');
            }
            const { name, gender, studentId } = ctx.request.body;
            if (!studentId) {
                return ctx.send([], 400, '缺少必填参数 studentId');
            }
            if (ctx.auth.role === 'student' && ctx.auth.username !== studentId) {
                return ctx.send([], 403, '无权操作他人信息');
            }
            const res = await service.stdinfo.updateUserMsg(name, gender, studentId);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('updateUserMsg error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async selectTeacher() {
        const { ctx, service } = this;
        try {
            if (ctx.auth.role !== 'student' && ctx.auth.role !== 'admin') {
                return ctx.send([], 403, '仅学生或管理员可操作');
            }
            const { studentId, teacherId, order, isChose, activityId, subscribeTemplateId, subscribeStatus } = ctx.request.body;
            if (!studentId || !teacherId || !activityId || order === undefined || order === null) {
                return ctx.send([], 400, '缺少必填参数');
            }
            if (ctx.auth.role === 'student' && ctx.auth.username !== studentId) {
                return ctx.send([], 403, '无权代替他人选课');
            }
            if (!ctx.isValidObjectId(activityId)) {
                return ctx.send([], 400, 'activityId 格式不正确');
            }
            const res = await service.stdinfo.selectTeacher(studentId, teacherId, order, isChose, activityId, subscribeTemplateId, subscribeStatus);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('selectTeacher error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getTeachersForActivity() {
        const { ctx, service } = this;
        try {
            const { activityId } = ctx.request.query;
            if (!activityId) {
                return ctx.send([], 400, '缺少参数 activityId');
            }
            const res = await service.stdinfo.getTeachersForActivity(activityId);
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getTeachersForActivity error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getTeacherListInActivity() {
        const { ctx, service } = this;
        try {
            const { activityId } = ctx.request.query;
            if (!activityId) {
                return ctx.send([], 400, '缺少参数 activityId');
            }
            const res = await service.stdinfo.getTeacherListInActivity(activityId);
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getTeacherListInActivity error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async isInActivity() {
        const { ctx, service } = this;
        try {
            const { studentId, activityId } = ctx.request.query;
            if (!studentId || !activityId) {
                return ctx.send([], 400, '缺少参数 studentId 或 activityId');
            }
            const res = await service.stdinfo.isInActivity(studentId, activityId);
            if (res) {
                ctx.send(res, 200, '学生在活动中');
            } else {
                ctx.send([], 404, '学生未在活动中');
            }
        } catch (err) {
            ctx.logger.error('isInActivity error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getStudentMsg() {
        const { ctx, service } = this;
        try {
            const { studentId } = ctx.request.query;
            if (!studentId) {
                return ctx.send([], 400, '缺少参数 studentId');
            }
            const res = await service.stdinfo.getStudentMsg(studentId);
            if (!res) {
                return ctx.send([], 404, '学生信息不存在');
            }
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getStudentMsg error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async saveOpenid() {
        const { ctx, service } = this;
        try {
            if (ctx.auth.role !== 'student' && ctx.auth.role !== 'admin') {
                return ctx.send([], 403, '仅学生或管理员可操作');
            }
            const { code, studentId } = ctx.request.body;
            if (!code || !studentId) {
                return ctx.send([], 400, '缺少参数 code 或 studentId');
            }
            if (ctx.auth.role === 'student' && ctx.auth.username !== studentId) {
                return ctx.send([], 403, '无权操作他人信息');
            }
            const res = await service.stdinfo.saveOpenid(code, studentId);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('saveOpenid error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async uploadResume() {
        const { ctx, service } = this;
        try {
            if (ctx.auth.role !== 'student' && ctx.auth.role !== 'admin') {
                return ctx.send([], 403, '仅学生或管理员可操作');
            }
            const { filePath, fileName, studentId } = ctx.request.body;
            if (!studentId) {
                return ctx.send([], 400, '学生ID不能为空');
            }
            if (ctx.auth.role === 'student' && ctx.auth.username !== studentId) {
                return ctx.send([], 403, '无权操作他人信息');
            }
            if (!fileName) {
                return ctx.send([], 400, '文件名称不能为空');
            }
            if (!filePath) {
                return ctx.send([], 400, '文件路径不能为空');
            }
            const res = await service.stdinfo.uploadResume(fileName, filePath, studentId);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('uploadResume error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }
}

module.exports = StdinfoController;
