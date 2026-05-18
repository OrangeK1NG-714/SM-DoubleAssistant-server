'use strict';

const Controller = require('egg').Controller;
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

class AdminController extends Controller {
    async getUserList() {
        const { ctx, service } = this;
        try {
            const res = await service.admin.getUserList();
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getUserList error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async addActivity() {
        const { ctx, service } = this;
        try {
            const { name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
                secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate,
                stdChooseStartDate, stdChooseEndDate } = ctx.request.body;
            if (!name || !description || !startDate || !endDate) {
                return ctx.send([], 400, '缺少必填参数：name/description/startDate/endDate');
            }
            const res = await service.admin.addActivity(name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
                secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate,
                stdChooseStartDate, stdChooseEndDate);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('addActivity error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getActivityList() {
        const { ctx, service } = this;
        try {
            const res = await service.admin.getActivityList();
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getActivityList error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getActivityDetail() {
        const { ctx, service } = this;
        try {
            const { id } = ctx.request.query;
            if (!id || !ctx.isValidObjectId(id)) {
                return ctx.send([], 400, '缺少参数或ID格式不正确');
            }
            const res = await service.admin.getActivityDetail(id);
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getActivityDetail error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async deleteActivity() {
        const { ctx, service } = this;
        try {
            const { id } = ctx.request.body;
            if (!id || !ctx.isValidObjectId(id)) {
                return ctx.send([], 400, '缺少参数或ID格式不正确');
            }
            const res = await service.admin.deleteActivity(id);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('deleteActivity error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async deleteUser() {
        const { ctx, service } = this;
        try {
            const { id } = ctx.request.body;
            if (!id || !ctx.isValidObjectId(id)) {
                return ctx.send([], 400, '缺少参数或ID格式不正确');
            }
            const res = await service.admin.deleteUser(id);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('deleteUser error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async updateActivity() {
        const { ctx, service } = this;
        try {
            const { _id, name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
                secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate,
                stdChooseStartDate, stdChooseEndDate } = ctx.request.body;
            if (!_id || !ctx.isValidObjectId(_id)) {
                return ctx.send([], 400, '缺少参数或ID格式不正确');
            }
            const res = await service.admin.updateActivity(_id, name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
                secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate,
                stdChooseStartDate, stdChooseEndDate);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('updateActivity error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async addTeacherToActivity() {
        const { ctx, service } = this;
        try {
            const { activityId, teacherId, studentId } = ctx.request.body;
            if (!activityId) {
                return ctx.send([], 400, '缺少参数 activityId');
            }
            if (!teacherId && !studentId) {
                return ctx.send([], 400, 'teacherId 和 studentId 至少提供一个');
            }
            const res = await service.admin.addTeacherToActivity(activityId, teacherId, studentId);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('addTeacherToActivity error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async batchAddUserToActivity() {
        const { ctx, service } = this;
        try {
            const { activityId, users } = ctx.request.body;
            if (!activityId) {
                return ctx.send([], 400, '缺少参数 activityId');
            }
            if (!Array.isArray(users) || users.length === 0) {
                return ctx.send([], 400, 'users 必须是非空数组');
            }
            const result = await service.admin.batchAddUserToActivity(activityId, users);
            ctx.send(result, 200, `成功 ${result.successCount} 人，失败 ${result.failCount} 人`);
        } catch (err) {
            ctx.logger.error('batchAddUserToActivity error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getUserInfo() {
        const { ctx, service } = this;
        try {
            const { username, role } = ctx.query;
            const res = await service.admin.getUserInfo(username, role);
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getUserInfo error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async resetPassword() {
        const { ctx, service } = this;
        try {
            const { username, password } = ctx.request.body;
            ctx.validate({
                username: { type: 'registerUsername', tips: '账号格式不正确' },
                password: { type: 'registerUserPassword', tips: '密码需要6-20位的字母和数字' },
            }, ctx.request.body);
            const res = await service.admin.resetPassword(username, password);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            if (err.status === 422) throw err;
            ctx.logger.error('resetPassword error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async resetSelectedPassword() {
        const { ctx, service } = this;
        try {
            const { selectedUsers, password } = ctx.request.body;
            if (!Array.isArray(selectedUsers) || selectedUsers.length === 0) {
                return ctx.send([], 400, 'selectedUsers 必须是非空数组');
            }
            if (!password || password.length < 6) {
                return ctx.send([], 400, '密码需要至少6位');
            }
            const res = await service.admin.resetSelectedPassword(selectedUsers, password);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('resetSelectedPassword error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getUserListInActivity() {
        const { ctx, service } = this;
        try {
            const { activityId, username, role } = ctx.request.query;
            if (!activityId) {
                return ctx.send([], 400, '缺少参数 activityId');
            }
            const res = await service.admin.getUserListInActivity(activityId, username, role);
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getUserListInActivity error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async deleteUserInActivity() {
        const { ctx, service } = this;
        try {
            const { _id } = ctx.request.body;
            if (!_id || !ctx.isValidObjectId(_id)) {
                return ctx.send([], 400, '缺少参数或ID格式不正确');
            }
            const res = await service.admin.deleteUserInActivity(_id);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('deleteUserInActivity error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async batchDeleteUserInActivity() {
        const { ctx, service } = this;
        try {
            const { ids } = ctx.request.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                return ctx.send([], 400, 'ids 必须是非空数组');
            }
            const invalid = ids.some(id => !ctx.isValidObjectId(id));
            if (invalid) {
                return ctx.send([], 400, '存在格式不正确的ID');
            }
            const result = await service.admin.batchDeleteUserInActivity(ids);
            ctx.send(result, 200, `成功 ${result.successCount} 人，失败 ${result.failCount} 人`);
        } catch (err) {
            ctx.logger.error('batchDeleteUserInActivity error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getSelectedList() {
        const { ctx, service } = this;
        try {
            const { studentId, activityId } = ctx.request.query;
            const res = await service.admin.getSelectedList(studentId, activityId);
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getSelectedList error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async deleteSelected() {
        const { ctx, service } = this;
        try {
            const { _id } = ctx.request.body;
            if (!_id || !ctx.isValidObjectId(_id)) {
                return ctx.send([], 400, '缺少参数或ID格式不正确');
            }
            const res = await service.admin.deleteSelected(_id);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('deleteSelected error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getFinalList() {
        const { ctx, service } = this;
        try {
            const { studentId, teacherId, activityId } = ctx.request.query;
            const res = await service.admin.getFinalList(studentId, teacherId, activityId);
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getFinalList error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async addFinal() {
        const { ctx, service } = this;
        try {
            const { activityId, studentId, teacherId } = ctx.request.body;
            if (!activityId || !studentId || !teacherId) {
                return ctx.send([], 400, '缺少必填参数 activityId/studentId/teacherId');
            }
            const res = await service.admin.addFinal(activityId, studentId, teacherId);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('addFinal error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getTeacherListInActivity() {
        const { ctx, service } = this;
        try {
            const { activityId } = ctx.request.query;
            if (!activityId) {
                return ctx.send([], 400, '缺少参数 activityId');
            }
            const res = await service.admin.getTeacherListInActivity(activityId);
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getTeacherListInActivity error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getStudentListInActivity() {
        const { ctx, service } = this;
        try {
            const { activityId } = ctx.request.query;
            if (!activityId) {
                return ctx.send([], 400, '缺少参数 activityId');
            }
            const res = await service.admin.getStudentListInActivity(activityId);
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getStudentListInActivity error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async resetVolunteer() {
        const { ctx, service } = this;
        try {
            const { activityId, studentId } = ctx.request.body;
            if (!activityId || !studentId) {
                return ctx.send([], 400, '缺少必填参数 activityId 或 studentId');
            }
            const res = await service.admin.resetVolunteer(activityId, studentId);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('resetVolunteer error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async configMaxSelectNum() {
        const { ctx, service } = this;
        try {
            const { activityId, teacherId, maxSelectNum } = ctx.request.body;
            if (!activityId || !teacherId) {
                return ctx.send([], 400, '缺少必填参数 activityId 或 teacherId');
            }
            const num = Number(maxSelectNum);
            if (!Number.isInteger(num) || num < 1) {
                return ctx.send([], 400, 'maxSelectNum 必须是正整数');
            }
            const res = await service.admin.configMaxSelectNum(activityId, teacherId, num);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('configMaxSelectNum error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async batchConfigMaxSelectNum() {
        const { ctx, service } = this;
        try {
            const { activityId, maxSelectNum } = ctx.request.body;
            if (!activityId) {
                return ctx.send([], 400, '缺少必填参数 activityId');
            }
            const num = Number(maxSelectNum);
            if (!Number.isInteger(num) || num < 1) {
                return ctx.send([], 400, 'maxSelectNum 必须是正整数');
            }
            const res = await service.admin.batchConfigMaxSelectNum(activityId, num);
            ctx.send({ modifiedCount: res.modifiedCount }, res.code, res.msg);
        } catch (err) {
            ctx.logger.error('batchConfigMaxSelectNum error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getMaxSelectNum() {
        const { ctx, service } = this;
        try {
            const { activityId, teacherId } = ctx.request.query;
            if (!activityId || !teacherId) {
                return ctx.send([], 400, '缺少参数 activityId 或 teacherId');
            }
            const res = await service.admin.getMaxSelectNum(activityId, teacherId);
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getMaxSelectNum error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async getFinalChoose() {
        const { ctx, service } = this;
        try {
            const { studentId, activityId } = ctx.request.query;
            if (!studentId || !activityId) {
                return ctx.send([], 400, '缺少参数 studentId 或 activityId');
            }
            const res = await service.admin.getFinalChoose(studentId, activityId);
            ctx.send(res, 200, 'success');
        } catch (err) {
            ctx.logger.error('getFinalChoose error:', err);
            ctx.send([], 500, '服务器错误');
        }
    }

    async uploadTeacherResume() {
        const { ctx, service, app } = this;
        try {
            const teacherId = ctx.request.body.teacherId;
            const resumeName = ctx.request.body.resumeName;
            if (!teacherId) {
                return ctx.send([], 400, '教师ID不能为空');
            }
            const file = ctx.request.files?.[0];
            if (!file) {
                return ctx.send([], 400, '请选择要上传的文件');
            }
            const uploadDir = path.join(app.config.uploadDir, 'teacher');
            try {
                await fsp.access(uploadDir);
            } catch {
                await fsp.mkdir(uploadDir, { recursive: true });
            }
            const ext = path.extname(file.filename);
            const rawName = resumeName || file.filename;
            const fileName = path.basename(rawName, path.extname(rawName)) + ext;
            const targetPath = path.join(uploadDir, fileName);
            const fileData = await fsp.readFile(file.filepath);
            await fsp.writeFile(targetPath, fileData);
            const subPath = 'teacher/' + fileName;
            const res = await service.admin.uploadTeacherResume(teacherId, fileName, subPath);
            ctx.send([], res.code, res.msg);
        } catch (err) {
            ctx.logger.error('uploadTeacherResume error:', err);
            ctx.send([], 500, '上传失败：' + (err.message || '未知错误'));
        }
    }

    async getTeacherResume() {
        const { ctx, service } = this;
        try {
            const { teacherId } = ctx.request.query;
            if (!teacherId) {
                return ctx.send([], 400, '教师ID不能为空');
            }
            const result = await service.admin.getTeacherResume(teacherId);
            if (result.code !== 200) {
                return ctx.send([], result.code, result.msg);
            }
            ctx.attachment(result.resumeName);
            ctx.set('Content-Type', result.contentType);
            ctx.body = result.fileContent;
        } catch (err) {
            ctx.logger.error('getTeacherResume error:', err);
            ctx.send([], 500, '服务器错误，请重试');
        }
    }
}

module.exports = AdminController;
