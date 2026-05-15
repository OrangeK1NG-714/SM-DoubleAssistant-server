'use strict';

const Service = require('egg').Service;
const bcrypt = require('bcryptjs');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const BCRYPT_ROUNDS = 10;

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class AdminService extends Service {
    async addActivity(name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate, secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate, stdChooseStartDate, stdChooseEndDate) {
        const { ctx } = this;
        await ctx.model.Activity.create({ name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate, secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate, stdChooseStartDate, stdChooseEndDate });
        return { code: 200, msg: '活动创建成功' };
    }

    async getActivityList() {
        const { ctx } = this;
        return await ctx.model.Activity.find();
    }

    async getActivityDetail(id) {
        const { ctx } = this;
        return await ctx.model.Activity.findById(id);
    }

    async updateActivity(_id, name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate, secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate, stdChooseStartDate, stdChooseEndDate) {
        const { ctx } = this;
        const res = await ctx.model.Activity.findByIdAndUpdate(_id, {
            name, description, startDate, endDate,
            firstChooseStartDate, firstChooseEndDate,
            secondChooseStartDate, secondChooseEndDate,
            thirdChooseStartDate, thirdChooseEndDate,
            stdChooseStartDate, stdChooseEndDate,
        });
        if (!res) {
            return { code: 400, msg: '活动不存在' };
        }
        return { code: 200, msg: '活动更新成功' };
    }

    async deleteActivity(id) {
        const { ctx } = this;
        const res = await ctx.model.Activity.findByIdAndDelete(id);
        if (!res) {
            return { code: 400, msg: '活动不存在' };
        }
        return { code: 200, msg: '活动删除成功' };
    }

    async addTeacherToActivity(activityId, teacherId = null, studentId = null) {
        const { ctx } = this;
        const data = { activityId };
        if (teacherId) data.teacherId = teacherId;
        if (studentId) data.studentId = studentId;
        await ctx.model.UserInActivity.create(data);
        return { code: 200, msg: '添加成功' };
    }

    async getUserList() {
        const { ctx } = this;
        return await ctx.model.Userinfo.find({}, { password: 0 });
    }

    async getUserInfo(username, role) {
        const { ctx } = this;
        const query = {};
        if (username) query.username = { $regex: new RegExp(escapeRegExp(username), 'i') };
        if (role) query.role = role;
        return await ctx.model.Userinfo.find(query, { password: 0 });
    }

    async resetPassword(username, password) {
        const { ctx } = this;
        const res = await ctx.model.Userinfo.findOne({ username });
        if (!res) {
            return { code: 400, msg: '用户不存在' };
        }
        res.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await res.save();
        return { code: 200, msg: '密码重置成功' };
    }

    async resetSelectedPassword(selectedUsers, password) {
        const { ctx } = this;
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await ctx.model.Userinfo.updateMany(
            { username: { $in: selectedUsers } },
            { password: passwordHash }
        );
        return { code: 200, msg: '批量密码重置成功' };
    }

    async getUserListInActivity(activityId, username, role) {
        const { ctx } = this;
        const activityIdStr = String(activityId);
        const query = { activityId: activityIdStr };
        const conditions = [];

        if (role) {
            if (role === 'teacher') {
                conditions.push({ teacherId: { $exists: true } });
            } else if (role === 'student') {
                conditions.push({ studentId: { $exists: true } });
            } else {
                conditions.push({ role });
            }
        } else {
            conditions.push({
                $or: [
                    { teacherId: { $exists: true } },
                    { studentId: { $exists: true } },
                ],
            });
        }

        if (username) {
            const escaped = escapeRegExp(String(username));
            conditions.push({
                $or: [
                    { teacherId: { $regex: escaped, $options: 'i' } },
                    { studentId: { $regex: escaped, $options: 'i' } },
                ],
            });
        }

        if (conditions.length > 0) {
            query.$and = conditions;
        }

        try {
            return await ctx.model.UserInActivity.find(query);
        } catch (error) {
            ctx.logger.error('getUserListInActivity 查询出错:', error);
            return [];
        }
    }

    async deleteUserInActivity(_id) {
        const { ctx } = this;
        const res = await ctx.model.UserInActivity.findByIdAndDelete(_id);
        if (!res) {
            return { code: 400, msg: '记录不存在' };
        }
        return { code: 200, msg: '删除成功' };
    }

    async getSelectedList(studentId, activityId) {
        const { ctx } = this;
        const query = {};
        if (studentId) {
            query.studentId = { $regex: escapeRegExp(studentId), $options: 'i' };
        }
        if (activityId) {
            query.activityId = activityId;
        }
        return await ctx.model.Choose.find(query);
    }

    async deleteSelected(_id) {
        const { ctx } = this;
        const res = await ctx.model.Choose.findByIdAndDelete(_id);
        if (!res) {
            return { code: 400, msg: '记录不存在' };
        }
        return { code: 200, msg: '删除成功' };
    }

    async getFinalList(studentId, teacherId, activityId) {
        const { ctx } = this;
        const query = {};
        if (studentId) {
            query.studentId = { $regex: escapeRegExp(studentId), $options: 'i' };
        }
        if (teacherId) {
            query.teacherId = teacherId;
        }
        if (activityId) {
            query.activityId = activityId;
        }
        return await ctx.model.Final.find(query);
    }

    async getTeacherListInActivity(activityId) {
        const { ctx } = this;
        const query = { teacherId: { $exists: true } };
        if (activityId) {
            query.activityId = activityId;
        }
        const userInActivityList = await ctx.model.UserInActivity.find(query);
        const teacherIds = userInActivityList.map(item => item.teacherId);
        return await ctx.model.Teacher.find({ teacherId: { $in: teacherIds } });
    }

    async getStudentListInActivity(activityId) {
        const { ctx } = this;
        const query = { studentId: { $exists: true } };
        if (activityId) {
            query.activityId = activityId;
        }
        const userInActivityList = await ctx.model.UserInActivity.find(query);
        const studentIds = userInActivityList.map(item => item.studentId);
        return await ctx.model.Student.find({ studentId: { $in: studentIds } });
    }

    async resetVolunteer(activityId, studentId) {
        const { ctx } = this;
        await ctx.model.Choose.deleteMany({ activityId, studentId });
        return { code: 200, msg: '志愿重置成功' };
    }

    async configMaxSelectNum(activityId, teacherId, maxSelectNum) {
        const { ctx } = this;
        await ctx.model.UserInActivity.updateOne(
            { activityId, teacherId },
            { maxSelectNum }
        );
        return { code: 200, msg: '配置成功' };
    }

    async getMaxSelectNum(activityId, teacherId) {
        const { ctx } = this;
        return await ctx.model.UserInActivity.findOne({ activityId, teacherId });
    }

    async getFinalChoose(studentId, activityId) {
        const { ctx } = this;
        const res = await ctx.model.Final.findOne({ studentId, activityId });
        return res || {};
    }

    async uploadTeacherResume(teacherId, resumeName, resumePath) {
        const { ctx } = this;

        if (!teacherId || !resumeName || !resumePath) {
            return { code: 400, msg: '缺少必要参数' };
        }

        const teacher = await ctx.model.Teacher.findOne({ teacherId });
        if (!teacher) {
            return { code: 404, msg: '老师不存在' };
        }

        if (teacher.resumePath && teacher.resumePath !== resumePath) {
            try {
                let oldResumePath = teacher.resumePath;
                if (oldResumePath.startsWith('/')) {
                    oldResumePath = oldResumePath.substring(1);
                }
                const oldFilePath = path.normalize(path.join(__dirname, '..', oldResumePath));
                const expectedBasePath = path.normalize(path.join(__dirname, '..', 'public'));
                if (oldFilePath.startsWith(expectedBasePath)) {
                    await fsp.unlink(oldFilePath).catch(() => {});
                }
            } catch (fileError) {
                ctx.logger.warn('删除旧简历文件失败:', fileError.message);
            }
        }

        const updatedTeacher = await ctx.model.Teacher.findOneAndUpdate(
            { teacherId },
            { resumeName, resumePath },
            { new: true }
        );

        if (!updatedTeacher) {
            return { code: 404, msg: '老师信息不存在或已被删除' };
        }

        return { code: 200, msg: '老师简历已上传' };
    }

    async getTeacherResume(teacherId) {
        const { ctx } = this;

        if (!teacherId) {
            return { code: 400, msg: '教师ID不能为空' };
        }

        const teacher = await ctx.model.Teacher.findOne({ teacherId });
        if (!teacher) {
            return { code: 404, msg: '老师不存在' };
        }

        if (!teacher.resumePath) {
            return { code: 404, msg: '老师未上传简历' };
        }

        const filePath = path.join(__dirname, '..', teacher.resumePath.substring(1));

        try {
            await fsp.access(filePath);
        } catch {
            return { code: 404, msg: '简历文件不存在' };
        }

        const fileContent = await fsp.readFile(filePath);

        const fileExtension = path.extname(teacher.resumePath).toLowerCase();
        const contentTypeMap = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.txt': 'text/plain',
        };
        const contentType = contentTypeMap[fileExtension] || 'application/octet-stream';

        return {
            code: 200,
            msg: '获取成功',
            resumeName: teacher.resumeName,
            contentType,
            fileContent,
        };
    }
}

module.exports = AdminService;
