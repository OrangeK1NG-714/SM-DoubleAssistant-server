'use strict';

const Service = require('egg').Service;
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 10;

function isSha256Hash(str) {
    return /^[a-f0-9]{64}$/.test(str);
}

class UserinfoService extends Service {
    async userRegister(username, password, role = 'student', name = '', teacherType = '') {
        const db = this.ctx.model.Userinfo;
        const res = await db.find({ username });
        if (res.length > 0) {
            return { msg: '账号已经存在', code: 409 };
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await db.create({ username, password: passwordHash, role });

        if (role === 'student') {
            await this.ctx.model.Student.create({
                studentId: username,
                mentor: '',
                data: {},
            });
        } else if (role === 'teacher') {
            await this.ctx.model.Teacher.create({
                name: name || '',
                teacherId: username,
                msg: '',
                teacherType,
            });
        }

        return { msg: 'success', code: 200 };
    }

    async userLogin(username, password) {
        const db = this.ctx.model.Userinfo;
        const user = await db.findOne({ username });
        if (!user) {
            return { data: [], msg: '账号或密码错误', code: 422 };
        }

        let passwordValid = false;

        if (isSha256Hash(user.password)) {
            const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
            if (sha256Hash === user.password) {
                passwordValid = true;
                const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
                user.password = newHash;
                await user.save();
            }
        } else {
            passwordValid = await bcrypt.compare(password, user.password);
        }

        if (!passwordValid) {
            return { data: [], msg: '账号或密码错误', code: 422 };
        }

        const accessToken = this.ctx.generateToken(user._id, user.role);
        const refreshToken = this.ctx.generateRefreshToken(user._id);

        return {
            data: {
                _id: user._id,
                username: user.username,
                role: user.role,
                accessToken,
                refreshToken,
            },
            msg: 'success',
            code: 200,
        };
    }

    async getUserDetail(username, role) {
        if (role === 'student') {
            const data = await this.ctx.model.Student.findOne({ studentId: username });
            if (!data) {
                return { code: 404, msg: '学生信息不存在' };
            }
            const isEmpty = Object.keys(data.data || {}).length;
            return { code: 200, data, isEmpty };
        } else if (role === 'teacher') {
            const data = await this.ctx.model.Teacher.findOne({ teacherId: username });
            if (!data) {
                return { code: 404, msg: '教师信息不存在' };
            }
            return { code: 200, data };
        }
        return { code: 200, msg: '管理员您好！' };
    }

    async getChooseList(activityId) {
        const res = await this.ctx.model.Choose.find({ activityId });
        return res;
    }

    async getChooseCount(teacherId, activityId) {
        const res = await this.ctx.model.Choose.find({ teacherId, activityId });
        return res;
    }

    async getChooseDetail(activityId, studentId) {
        const res = await this.ctx.model.Choose.find({ activityId, studentId });
        return res;
    }
}

module.exports = UserinfoService;
