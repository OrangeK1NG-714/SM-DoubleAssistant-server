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
        const user = await db.create({ username, password: passwordHash, role });

        try {
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
        } catch (err) {
            await db.deleteOne({ _id: user._id });
            throw err;
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

        const accessToken = this.ctx.generateToken(user._id, user.role, user.username);
        const refreshToken = this.ctx.generateRefreshToken(user._id, user.role, user.username);

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

    async selfResetPassword(username, oldPassword, newPassword) {
        const db = this.ctx.model.Userinfo;
        const user = await db.findOne({ username });
        if (!user) {
            return { code: 404, msg: '用户不存在' };
        }

        let passwordValid = false;
        if (isSha256Hash(user.password)) {
            const sha256Hash = crypto.createHash('sha256').update(oldPassword).digest('hex');
            passwordValid = sha256Hash === user.password;
        } else {
            passwordValid = await bcrypt.compare(oldPassword, user.password);
        }

        if (!passwordValid) {
            return { code: 422, msg: '原密码错误' };
        }

        user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await user.save();
        return { code: 200, msg: '密码修改成功' };
    }

    async getChooseList(activityId) {
        const res = await this.ctx.model.Choose.find({ activityId });
        return res;
    }

    async getChooseCount(teacherId, activityId) {
        const count = await this.ctx.model.Choose.countDocuments({ teacherId, activityId });
        return count;
    }

    async getChooseDetail(activityId, studentId) {
        const res = await this.ctx.model.Choose.find({ activityId, studentId });
        return res;
    }
}

module.exports = UserinfoService;
