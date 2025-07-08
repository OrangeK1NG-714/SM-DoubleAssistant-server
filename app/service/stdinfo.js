'use strict';

const Service = require('egg').Service;

class StdinfoService extends Service {
    //新增学生信息
    async writeUserMsg(name, gender, studentId) {
        try {
            // 先查找是否存在该 studentId
            let student = await this.ctx.model.Student.findOne({ studentId });

            if (student) {
                // 存在则更新 data 字段
                student.data = { name, gender, studentId };
                await student.save();
                return { code: 200, msg: '学生信息已更新', data: student };
            } else {
                // 不存在则新建
                const newStudent = await this.ctx.model.Student.create({
                    studentId,
                    data: { name, gender, studentId }
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
    async selectTeacher(studentId, teacherId, order, isChose, activityId) {

        // 直接向Choose表写入数据
        const choose = await this.ctx.model.Choose.create({
            studentId: studentId,
            teacherId: teacherId,
            order: order,
            isChose: isChose,
            activityId: activityId
        });
        return { code: 200, msg: '学生选老师选项已添加', data: choose };
    }

    //查询某活动的所有老师
    async getTeacherListInActivity(activityId) {
        const { ctx } = this;
        const res = await ctx.model.UserInActivity.find({ activityId: activityId });
        return res;
    }
}

module.exports = StdinfoService;
