'use strict';

const Service = require('egg').Service;

class LoginService extends Service {
    async Login(name,password) {
        return {
            name, 
            password
        }
    }
}

module.exports = LoginService;
