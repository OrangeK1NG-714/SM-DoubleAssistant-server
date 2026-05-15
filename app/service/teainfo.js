'use strict';

const Service = require('egg').Service;

class TeainfoService extends Service {
    async getTeaDetail() {
        const data = await this.ctx.model.Teacher.find();
        return { code: 200, data };
    }

    async updateChoose(studentId, teacherId, activityId) {
        const choose = await this.ctx.model.Choose.findOne({ studentId, teacherId, activityId });
        if (!choose) {
            return { code: 404, msg: '选择记录不存在' };
        }
        choose.isChose = !choose.isChose;
        await choose.save();
        return { code: 200, msg: '学生选老师选项已修改', data: choose };
    }

    async selectStudent(studentId, teacherId, activityId, data, order) {
        const existing = await this.ctx.model.Final.findOne({ studentId, teacherId, activityId });
        if (existing) {
            return { code: 409, msg: '该学生已被选择，请勿重复操作' };
        }
        const choose = await this.ctx.model.Final.create({ studentId, teacherId, activityId, data, order });
        return { code: 200, msg: '老师已选学生', data: choose };
    }

    async cancelSelect(studentId, teacherId, activityId) {
        const res = await this.ctx.model.Final.deleteOne({ studentId, teacherId, activityId });
        return { code: 200, msg: '老师取消选择学生', data: res };
    }

    async getSelectList(teacherId, activityId, studentId) {
        const query = {};
        if (teacherId) query.teacherId = teacherId;
        if (activityId) query.activityId = activityId;
        if (studentId) query.studentId = studentId;
        return await this.ctx.model.Final.find(query);
    }

    async isInActivity(teacherId, activityId) {
        return await this.ctx.model.UserInActivity.findOne({ teacherId, activityId });
    }
}

module.exports = TeainfoService;
