'use strict';

const Service = require('egg').Service;
const crypto = require('crypto')
class UserinfoService extends Service {
    //注册用户账号
    async userRegister(username, password, role = 'student', name = '') {
        //判断是否已存在用户
        const db = this.ctx.model.Userinfo
        const res = await db.find({ username })
        if (res.length > 0) {
            return { msg: '账号已经存在', code: 202 }
        } else {
            //创建哈希对象
            const hash = crypto.createHash('sha256').update(password)
            //生成哈希值
            const passwordHash = hash.digest('hex')
            await db.create({ username, password: passwordHash, role })

            // 根据 role 创建对应表
            if (role === 'student') {
                await this.ctx.model.Student.create({
                    studentId: username,
                    mentor: '',
                    data: {}
                });
            } else if (role === 'teacher') {
                await this.ctx.model.Teacher.create({
                    name: name || '',
                    teacherId: username,
                    msg: ''
                });
            }

            return { msg: 'success', code: 200 }
        }
    }
    //登录账号
    async userLogin(username, password) {
        //创建哈希对象
        const hash = crypto.createHash('sha256').update(password)
        //生成哈希值
        const passwordHash = hash.digest('hex')

        const db = this.ctx.model.Userinfo
        //lean()转化为普通的JS数据，否则会带MongoDB自带字段
        const res = await db.find({ username, password: passwordHash }).lean()
        if (res.length > 0) {
            const token = { token: this.ctx.generateToken(res[0]._id) }
            // console.log(token);
            return {
                data: { ...res[0], ...token },
                msg: 'success',
                code: 200
            }
        } else {
            return { data: [], msg: '账号或密码错误', code: 422 }
        }
    }
    //获取用户详细信息
    async getUserDetail(username, role) {
        if (role === 'student') {
            const data = await this.ctx.model.Student.findOne({ studentId: username });
            // console.log(data.data instanceof Object);
            const isEmpty = Object.keys(data.data).length
            return { code: 200, data, isEmpty };
        } else if (role === 'teacher') {
            const data = await this.ctx.model.Teacher.findOne({ teacherId: username });
            return { code: 200, data };
        } else {
            return { code: 200, msg: '管理员您好！' };
        }
    }
}

module.exports = UserinfoService;
