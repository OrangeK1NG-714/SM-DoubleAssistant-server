'use strict';

const Service = require('egg').Service;

class TeainfoService extends Service {
    async getTeaDetail() {
        const data = await this.ctx.model.Teacher.find()
        return { code: 200, data }
    }
    //老师选学生-即（修改学生选老师选项）
    async updateChoose(studentId, teacherId) {
        const choose = await this.ctx.model.Choose.findOne({ studentId, teacherId})
        if (choose) {
            choose.isChose = !choose.isChose
            await choose.save()
            return { code: 200, msg: '学生选老师选项已修改', data: choose }
        }
    }
}

module.exports = TeainfoService;
