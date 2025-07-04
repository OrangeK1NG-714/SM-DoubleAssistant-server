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
}

module.exports = StdinfoService;
