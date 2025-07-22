'use strict';

const Service = require('egg').Service;

class StdinfoService extends Service {
    //新增学生信息
    async writeUserMsg(name, gender, studentId, grade, classNum, phone, gpa, direction) {

        try {
            // 先查找是否存在该 studentId
            let student = await this.ctx.model.Student.findOne({ studentId });

            if (student) {
                // 存在则更新 data 字段
                student.data = { name, gender, studentId, grade, classNum, phone, gpa, direction };
                await student.save();
                return { code: 200, msg: '学生信息已更新', data: student };
            } else {
                // 不存在则新建
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
    async selectTeacher(studentId, teacherId, order, isChose, activityId, createTime) {
        // 先查询活动时间
        const activity = await this.ctx.model.Activity.findById(activityId);
        // console.log(activity)
        if (!activity) {
            return { code: 404, msg: '活动不存在' };
        }
        // 检查当前时间是否在选老师时间内
        const now = new Date(createTime);
        //将时间转化为新加坡时间
        const adjustedTime = new Date(createTime)
        adjustedTime.setHours(adjustedTime.getHours() + 8)
        if (now < Date(activity.stdChooseEndDate) && now > Date(activity.stdChooseStartDate)) {
            return { code: 400, msg: '不在选老师时间内' };
        }
        // 直接向Choose表写入数据
        const choose = await this.ctx.model.Choose.create({
            studentId: studentId,
            teacherId: teacherId,
            order: order,
            isChose: isChose,
            activityId: activityId,
            createTime: adjustedTime
        });
        return { code: 200, msg: '学生选老师选项已添加', data: choose };
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
}

module.exports = StdinfoService;
