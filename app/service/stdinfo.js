'use strict';

const Service = require('egg').Service;

class StdinfoService extends Service {
    //新增学生信息
    async writeUserMsg(name, gender, studentId, grade, classNum, phone, gpa, direction) {
        try {
            let student = await this.ctx.model.Student.findOne({ studentId });
            if (student) {
                student.data = { name, gender, studentId, grade, classNum, phone, gpa, direction };
                await student.save();
                return { code: 200, msg: '学生信息已更新', data: student };
            } else {
                const newStudent = await this.ctx.model.Student.create({
                    studentId,
                    data: { name, gender, studentId, grade, classNum, phone, gpa, direction }
                });
                return { code: 200, msg: '学生信息新增成功', data: newStudent };
            }
        } catch (error) {
            this.ctx.logger.error(error);
            return { code: 500, msg: '服务器错误' };
        }
    }

    //更新学生信息
    async updateUserMsg(name, gender, studentId) {
        const student = await this.ctx.model.Student.findOne({ studentId });
        if (student) {
            student.data = { name, gender, studentId };
            await student.save();
            return { code: 200, msg: '学生信息已更新', data: student };
        }
    }

    //新增学生选老师选项
    async selectTeacher(studentId, teacherId, order, isChose, activityId, createTime, subscribeTemplateId = '', subscribeStatus = '') {
        const activity = await this.ctx.model.Activity.findById(activityId);
        if (!activity) {
            return { code: 404, msg: '活动不存在' };
        }
        const now = new Date(createTime);
        const adjustedTime = new Date(createTime);
        if (now < Date(activity.stdChooseEndDate) && now > Date(activity.stdChooseStartDate)) {
            return { code: 400, msg: '不在选老师时间内' };
        }
        const choose = await this.ctx.model.Choose.create({
            studentId,
            teacherId,
            order,
            isChose,
            activityId,
            createTime: adjustedTime,
            subscribeTemplateId,
            subscribeStatus,
        });
        return { code: 200, msg: '学生选老师选项已添加', data: choose };
    }

    //保存学生 openid
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

    //查询某活动的所有老师
    async getTeacherListInActivity(activityId) {
        const { ctx } = this;
        const res = await ctx.model.UserInActivity.find({ activityId: activityId, teacherId: { $exists: true } });
        return res;
    }

    //查询某学生是否在活动中
    async isInActivity(studentId, activityId) {
        const { ctx } = this;
        const res = await ctx.model.UserInActivity.findOne({ studentId: studentId, activityId: activityId });
        return res;
    }

    //查询学生信息
    async getStudentMsg(studentId) {
        const { ctx } = this;
        const res = await ctx.model.Student.findOne({ studentId });
        return res;
    }

    //新增学生上传简历
    async uploadResume(fileName, filePath, studentId) {
        const { ctx } = this;
        let res = await ctx.model.Resume.findOne({ studentId });
        console.log(res);
        if (!res) {
            res = new ctx.model.Resume({
                studentId: studentId,
                fileName: fileName,
                filePath: filePath,
            });
            await res.save();
            return { code: 200, msg: '学生简历已上传', data: res };
        } else {
            return { code: 201, msg: '学生简历已存在', data: res };
        }
    }
}

module.exports = StdinfoService;
