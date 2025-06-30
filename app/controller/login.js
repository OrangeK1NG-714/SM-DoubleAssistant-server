'use strict';

const Controller = require('egg').Controller;

class LoginController extends Controller {
  async Login() {
    const {ctx,service} =this
    const res = await service.login.Login('sss',123)
    ctx.body={
        name:res.name,
        password:res.password
    }
  }
}

module.exports = LoginController;
