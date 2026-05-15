'use strict';

const Service = require('egg').Service;

class StdinfoService extends Service {
    async writeUserMsg(name, gender, studentId, grade, classNum, phone, gpa, direction) {
        try {
            let student = await this.ctx.model.Student.findOne({ studentId });
            if (student) {
                student.data = { name, gender, studentId, grade, classNum, phone, gpa, direction };
                await student.save();
                return { code: 200, msg: '学生信息已更新', data: student };
            }
            const newStudent = await this.ctx.model.Student.create({
                studentId,
                data: { name, gender, studentId, grade, classNum, phone, gpa, direction },
            });
            return { code: 200, msg: '学生信息新增成功', data: newStudent };
        } catch (error) {
            this.ctx.logger.error(error);
            return { code: 500, msg: '服务器错误' };
        }
    }

    async updateUserMsg(name, gender, studentId) {
        const student = await this.ctx.model.Student.findOne({ studentId });
        if (!student) {
            return { code: 404, msg: '学生不存在' };
        }
        Object.assign(student.data, { name, gender, studentId });
        student.markModified('data');
        await student.save();
        return { code: 200, msg: '学生信息已更新', data: student };
    }

    async selectTeacher(studentId, teacherId, order, isChose, activityId, createTime, subscribeTemplateId = '', subscribeStatus = '') {
        const activity = await this.ctx.model.Activity.findById(activityId);
        if (!activity) {
            return { code: 404, msg: '活动不存在' };
        }
        const now = new Date(createTime);
        if (isNaN(now.getTime())) {
            return { code: 400, msg: 'createTime 不是有效时间' };
        }
        const startDate = new Date(activity.stdChooseStartDate);
        const endDate = new Date(activity.stdChooseEndDate);
        if (now < startDate || now > endDate) {
            return { code: 400, msg: '不在选老师时间内' };
        }
        const choose = await this.ctx.model.Choose.create({
            studentId,
            teacherId,
            order,
            isChose,
            activityId,
            createTime: now,
            subscribeTemplateId,
            subscribeStatus,
        });
        return { code: 200, msg: '学生选老师选项已添加', data: choose };
    }

    async saveOpenid(code, studentId) {
        try {
            const openid = await this.service.wechat.getOpenid(code);
            const student = await this.ctx.model.Student.findOne({ studentId });
            if (!student) {
                return { code: 404, msg: '学生不存在' };
            }
            student.openid = openid;
            await student.save();
            return { code: 200, msg: 'openid 保存成功' };
        } catch (error) {
            this.ctx.logger.error('[saveOpenid] 错误:', error);
            return { code: 500, msg: error.message || '服务器错误' };
        }
    }

    async getTeacherListInActivity(activityId) {
        const { ctx } = this;
        return await ctx.model.UserInActivity.find({ activityId, teacherId: { $exists: true } });
    }

    async isInActivity(studentId, activityId) {
        const { ctx } = this;
        return await ctx.model.UserInActivity.findOne({ studentId, activityId });
    }

    async getStudentMsg(studentId) {
        const { ctx } = this;
        return await ctx.model.Student.findOne({ studentId });
    }

    async uploadResume(fileName, filePath, studentId) {
        const { ctx } = this;
        let res = await ctx.model.Resume.findOne({ studentId });
        if (!res) {
            res = new ctx.model.Resume({ studentId, fileName, filePath });
            await res.save();
            return { code: 200, msg: '学生简历已上传', data: res };
        }
        return { code: 409, msg: '学生简历已存在', data: res };
    }
}

module.exports = StdinfoService;
