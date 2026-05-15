'use strict';

const Controller = require('egg').Controller;

class StdinfoController extends Controller {
    async writeUserMsg() {
        const { ctx, service } = this;
        const { name, gender, studentId, grade, classNum, phone, gpa, direction } = ctx.request.body;
        const res = await service.stdinfo.writeUserMsg(name, gender, studentId, grade, classNum, phone, gpa, direction);
        ctx.send([], res.code, res.msg);
    }

    async updateUserMsg() {
        const { ctx, service } = this;
        const { name, gender, studentId } = ctx.request.body;
        const res = await service.stdinfo.updateUserMsg(name, gender, studentId);
        ctx.send([], res.code, res.msg);
    }

    async selectTeacher() {
        const { ctx, service } = this;
        const { studentId, teacherId, order, isChose, activityId, createTime, subscribeTemplateId, subscribeStatus } = ctx.request.body;
        const res = await service.stdinfo.selectTeacher(studentId, teacherId, order, isChose, activityId, createTime, subscribeTemplateId, subscribeStatus);
        ctx.send([], res.code, res.msg);
    }

    async getTeacherListInActivity() {
        const { ctx, service } = this;
        const { activityId } = ctx.request.query;
        const res = await service.stdinfo.getTeacherListInActivity(activityId);
        ctx.body = res;
    }

    async isInActivity() {
        const { ctx, service } = this;
        const { studentId, activityId } = ctx.request.query;
        const res = await service.stdinfo.isInActivity(studentId, activityId);
        if (res) {
            ctx.send([], 200, '学生在活动中');
        } else {
            ctx.send([], 404, '学生未在活动中');
        }
    }

    async getStudentMsg() {
        const { ctx, service } = this;
        const { studentId } = ctx.request.query;
        const res = await service.stdinfo.getStudentMsg(studentId);
        ctx.body = res;
    }

    async saveOpenid() {
        const { ctx, service } = this;
        const { code, studentId } = ctx.request.body;
        if (!code || !studentId) {
            return ctx.send([], 400, '缺少参数 code 或 studentId');
        }
        const res = await service.stdinfo.saveOpenid(code, studentId);
        ctx.send([], res.code, res.msg);
    }

    async uploadResume() {
        const { ctx, service } = this;
        const { filePath, fileName, studentId } = ctx.request.body;
        if (!studentId) {
            return ctx.send([], 400, '学生ID不能为空');
        }
        if (!fileName) {
            return ctx.send([], 400, '文件名称不能为空');
        }
        if (!filePath) {
            return ctx.send([], 400, '文件路径不能为空');
        }
        const res = await service.stdinfo.uploadResume(fileName, filePath, studentId);
        ctx.send([], res.code, res.msg);
    }
}

module.exports = StdinfoController;
