'use strict';

const Service = require('egg').Service;

class TeainfoService extends Service {
    async getTeaDetail() {
        const data = await this.ctx.model.Teacher.find()
        return { code: 200, data }
    }
}

module.exports = TeainfoService;
