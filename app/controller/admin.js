'use strict';

const Controller = require('egg').Controller;
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

class AdminController extends Controller {
    async getUserList() {
        const { ctx, service } = this;
        const res = await service.admin.getUserList();
        ctx.body = res;
    }

    async addActivity() {
        const { ctx, service } = this;
        const { name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
            secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate,
            stdChooseStartDate, stdChooseEndDate } = ctx.request.body;
        const res = await service.admin.addActivity(name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
            secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate,
            stdChooseStartDate, stdChooseEndDate);
        ctx.send([], res.code, res.msg);
    }

    async getActivityList() {
        const { ctx, service } = this;
        const res = await service.admin.getActivityList();
        ctx.body = res;
    }

    async getActivityDetail() {
        const { ctx, service } = this;
        const { id } = ctx.request.query;
        const res = await service.admin.getActivityDetail(id);
        ctx.body = res;
    }

    async deleteActivity() {
        const { ctx, service } = this;
        const { id } = ctx.request.body;
        const res = await service.admin.deleteActivity(id);
        ctx.send([], res.code, res.msg);
    }

    async updateActivity() {
        const { ctx, service } = this;
        const { _id, name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
            secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate,
            stdChooseStartDate, stdChooseEndDate } = ctx.request.body;
        const res = await service.admin.updateActivity(_id, name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
            secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate,
            stdChooseStartDate, stdChooseEndDate);
        ctx.send([], res.code, res.msg);
    }

    async addTeacherToActivity() {
        const { ctx, service } = this;
        const { activityId, teacherId, studentId } = ctx.request.body;
        const res = await service.admin.addTeacherToActivity(activityId, teacherId, studentId);
        ctx.send([], res.code, res.msg);
    }

    async getUserInfo() {
        const { ctx, service } = this;
        const { username, role } = ctx.query;
        const res = await service.admin.getUserInfo(username, role);
        ctx.body = res;
    }

    async resetPassword() {
        const { ctx, service } = this;
        const { username, password } = ctx.request.body;
        ctx.validate({
            username: { type: 'registerUsername', tips: '账号格式不正确' },
            password: { type: 'registerUserPassword', tips: '密码需要6-20位的字母和数字' },
        }, ctx.request.body);
        const res = await service.admin.resetPassword(username, password);
        ctx.send([], res.code, res.msg);
    }

    async resetSelectedPassword() {
        const { ctx, service } = this;
        const { selectedUsers, password } = ctx.request.body;
        const res = await service.admin.resetSelectedPassword(selectedUsers, password);
        ctx.send([], res.code, res.msg);
    }

    async getUserListInActivity() {
        const { ctx, service } = this;
        const { activityId, username, role } = ctx.request.query;
        const res = await service.admin.getUserListInActivity(activityId, username, role);
        ctx.body = res;
    }

    async deleteUserInActivity() {
        const { ctx, service } = this;
        const { _id } = ctx.request.body;
        const res = await service.admin.deleteUserInActivity(_id);
        ctx.send([], res.code, res.msg);
    }

    async getSelectedList() {
        const { ctx, service } = this;
        const { studentId, activityId } = ctx.request.query;
        const res = await service.admin.getSelectedList(studentId, activityId);
        ctx.body = res;
    }

    async deleteSelected() {
        const { ctx, service } = this;
        const { _id } = ctx.request.body;
        const res = await service.admin.deleteSelected(_id);
        ctx.send([], res.code, res.msg);
    }

    async getFinalList() {
        const { ctx, service } = this;
        const { studentId, teacherId, activityId } = ctx.request.query;
        const res = await service.admin.getFinalList(studentId, teacherId, activityId);
        ctx.body = res;
    }

    async getTeacherListInActivity() {
        const { ctx, service } = this;
        const { activityId } = ctx.request.query;
        const res = await service.admin.getTeacherListInActivity(activityId);
        ctx.body = res;
    }

    async getStudentListInActivity() {
        const { ctx, service } = this;
        const { activityId } = ctx.request.query;
        const res = await service.admin.getStudentListInActivity(activityId);
        ctx.body = res;
    }

    async resetVolunteer() {
        const { ctx, service } = this;
        const { activityId, studentId } = ctx.request.body;
        const res = await service.admin.resetVolunteer(activityId, studentId);
        ctx.send([], res.code, res.msg);
    }

    async configMaxSelectNum() {
        const { ctx, service } = this;
        const { activityId, teacherId, maxSelectNum } = ctx.request.body;
        const res = await service.admin.configMaxSelectNum(activityId, teacherId, maxSelectNum);
        ctx.send([], res.code, res.msg);
    }

    async getMaxSelectNum() {
        const { ctx, service } = this;
        const { activityId, teacherId } = ctx.request.query;
        const res = await service.admin.getMaxSelectNum(activityId, teacherId);
        ctx.body = res;
    }

    async getFinalChoose() {
        const { ctx, service } = this;
        const { studentId, activityId } = ctx.request.query;
        const res = await service.admin.getFinalChoose(studentId, activityId);
        ctx.body = res;
    }

    async uploadTeacherResume() {
        const { ctx, service } = this;

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

            const uploadDir = path.join(__dirname, '..', 'public', 'uploads');

            try {
                await fsp.access(uploadDir);
            } catch {
                await fsp.mkdir(uploadDir, { recursive: true });
            }

            const rawName = resumeName || file.filename;
            const fileName = path.basename(rawName);
            const targetPath = path.join(uploadDir, fileName);

            const fileData = await fsp.readFile(file.filepath);
            await fsp.writeFile(targetPath, fileData);

            const relativePath = '/public/uploads/' + fileName;
            const res = await service.admin.uploadTeacherResume(teacherId, fileName, relativePath);

            if (res.code === 200) {
                ctx.send([], 200, '简历上传成功');
            } else {
                ctx.send([], res.code, res.msg);
            }
        } catch (error) {
            ctx.logger.error('上传简历失败:', error);
            ctx.send([], 500, '上传失败，请重试');
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
        } catch (error) {
            ctx.logger.error('获取老师简历失败:', error);
            ctx.send([], 500, '服务器错误，请重试');
        }
    }
}

module.exports = AdminController;
