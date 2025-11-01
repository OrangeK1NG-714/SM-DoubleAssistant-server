'use strict';

const Controller = require('egg').Controller;

class AdminController extends Controller {
    async getUserList() {
        const { ctx, service } = this;
        const res = await service.admin.getUserList();
        console.log(res);

        ctx.body = res
    }



    async addActivity() {
        const { ctx, service } = this;
        const { name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
            secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate,
            stdChooseStartDate, stdChooseEndDate, firstChooseNum, secondChooseNum, thirdChooseNum,
            stdChooseNum } = ctx.request.body;
        const res = await service.admin.addActivity(name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
            secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate,
            stdChooseStartDate, stdChooseEndDate, firstChooseNum, secondChooseNum, thirdChooseNum,
            stdChooseNum);
        ctx.send([], res.code, res.msg);
    }
    async getActivityList() {
        const { ctx, service } = this;
        const res = await service.admin.getActivityList();
        ctx.body = res
    }
    //获取某一活动详情
    async getActivityDetail() {
        const { ctx, service } = this;
        const { id } = ctx.request.query
        const res = await service.admin.getActivityDetail(id);
        ctx.body = res
    }
    async deleteActivity() {
        const { ctx, service } = this;
        const { id } = ctx.request.body;
        const res = await service.admin.deleteActivity(id);
        ctx.send([], res.code, res.msg)
    }
    async updateActivity() {
        const { ctx, service } = this;
        const { _id, name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
            secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate,
            stdChooseStartDate, stdChooseEndDate, firstChooseNum, secondChooseNum, thirdChooseNum,
            stdChooseNum } = ctx.request.body;
        const res = await service.admin.updateActivity(_id, name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate,
            secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate,
            stdChooseStartDate, stdChooseEndDate, firstChooseNum, secondChooseNum, thirdChooseNum,
            stdChooseNum);
        ctx.send([], res.code, res.msg)
    }
    async addTeacherToActivity() {
        const { ctx, service } = this;
        const { activityId, teacherId, studentId } = ctx.request.body;
        console.log(activityId, teacherId, studentId);


        const res = await service.admin.addTeacherToActivity(activityId, teacherId, studentId);
        ctx.send([], res.code, res.msg)
    }

    //查询用户信息
    async getUserInfo() {
        const { ctx, service } = this;
        const { username, role } = ctx.query
        const res = await service.admin.getUserInfo(username, role);
        ctx.body = res;
    }
    //重置密码
    async resetPassword() {
        const { ctx, service } = this;
        const { username, password } = ctx.request.body;
        ctx.validate({
            username: { type: 'registerUsername', tips: '账号格式不正确' },
            password: { type: 'registerUserPassword', tips: '密码需要6-20位的字母和数字' }
        }, ctx.request.body)
        const res = await service.admin.resetPassword(username, password);
        ctx.send([], res.code, res.msg);
    }
    //重置所有选中用户密码
    async resetSelectedPassword() {
        const { ctx, service } = this;
        const { selectedUsers, password } = ctx.request.body;
        const res = await service.admin.resetSelectedPassword(selectedUsers, password);
        ctx.send([], res.code, res.msg);
    }
    //查询某活动的所有用户
    async getUserListInActivity() {
        const { ctx, service } = this;
        const { activityId, username, role } = ctx.request.query;
        const res = await service.admin.getUserListInActivity(activityId, username, role);
        ctx.body = res
    }
    //删除某活动的某一用户
    async deleteUserInActivity() {
        const { ctx, service } = this;
        const { _id } = ctx.request.body;
        const res = await service.admin.deleteUserInActivity(_id);
        ctx.send([], res.code, res.msg);
    }
    //查询选择志愿列表
    async getSelectedList() {
        const { ctx, service } = this;
        const { studentId, activityId } = ctx.request.query;
        const res = await service.admin.getSelectedList(studentId, activityId);
        ctx.body = res
    }
    //删除某项选择志愿
    async deleteSelected() {
        const { ctx, service } = this;
        const { _id } = ctx.request.body;
        const res = await service.admin.deleteSelected(_id);
        ctx.send([], res.code, res.msg);
    }
    //查询最终志愿
    async getFinalList() {
        const { ctx, service } = this;
        const { studentId, teacherId, activityId } = ctx.request.query;
        const res = await service.admin.getFinalList(studentId, teacherId, activityId);
        ctx.body = res
    }
    //查询某活动的所有导师
    async getTeacherListInActivity() {
        const { ctx, service } = this;
        const { activityId } = ctx.request.query;
        const res = await service.admin.getTeacherListInActivity(activityId);
        ctx.body = res
    }
    //查询某活动的所有学生
    async getStudentListInActivity() {
        const { ctx, service } = this;
        const { activityId } = ctx.request.query;
        const res = await service.admin.getStudentListInActivity(activityId);
        ctx.body = res
    }
    //重置志愿
    async resetVolunteer() {
        const { ctx, service } = this;
        const { activityId, studentId } = ctx.request.body;
        const res = await service.admin.resetVolunteer(activityId, studentId);
        ctx.send([], res.code, res.msg);
    }
    //配置一个活动中某位老师最大可选学生数
    async configMaxSelectNum() {
        const { ctx, service } = this;
        const { activityId, teacherId, maxSelectNum } = ctx.request.body;
        const res = await service.admin.configMaxSelectNum(activityId, teacherId, maxSelectNum);
        ctx.send([], res.code, res.msg);
    }
    //查询一个活动中某位老师最大可选学生数
    async getMaxSelectNum() {
        const { ctx, service } = this;
        const { activityId, teacherId } = ctx.request.query;
        const res = await service.admin.getMaxSelectNum(activityId, teacherId);
          ctx.body = res
    }
    //查询学生的最终志愿
    async getFinalChoose() {
        const { ctx, service } = this;
        const { studentId, activityId } = ctx.request.query;
        const res = await service.admin.getFinalChoose(studentId, activityId);
        ctx.body = res
    }
    // 管理员上传老师简历（支持multipart/form-data）
    async uploadTeacherResume() {
        const { ctx, service } = this;
        
        try {
            // 获取form-data中的非文件字段
            const teacherId = ctx.request.body.teacherId;
            const resumeName = ctx.request.body.resumeName;
            
            // 验证必要参数
            if (!teacherId) {
                return ctx.send([], 400, '教师ID不能为空');
            }
            
            // 获取上传的文件
            const file = ctx.request.files?.[0];
            if (!file) {
                return ctx.send([], 400, '请选择要上传的文件');
            }
            
            // 生成保存路径，使用public目录存储文件
            const path = require('path');
            const fs = require('fs');
            const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
            
            // 确保上传目录存在
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            // 生成文件名，如果前端没有提供，则使用原始文件名
            const fileName = resumeName || file.filename;
            const targetPath = path.join(uploadDir, fileName);
            
            // 读取上传的临时文件并保存到目标路径
            const fileData = fs.readFileSync(file.filepath);
            fs.writeFileSync(targetPath, fileData);
            
            // 构建文件相对路径（用于存储到数据库）
            const relativePath = '/public/uploads/' + fileName;
            
            // 调用服务层方法保存简历信息
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
    //查询某位老师简历并返回文件内容
    async getTeacherResume() {
        const { ctx, service } = this;
        try {
            const { teacherId } = ctx.request.query;
            
            // 验证teacherId参数
            if (!teacherId) {
                return ctx.send([], 400, '教师ID不能为空');
            }
            
            // 调用服务层获取简历文件信息
            const result = await service.admin.getTeacherResume(teacherId);
            
            // 根据服务层返回的不同状态码进行处理
            if (result.code !== 200) {
                return ctx.send([], result.code, result.msg);
            }
            
            // 设置响应头，准备返回文件内容
            ctx.attachment(result.resumeName); // 设置文件名，提示浏览器下载
            ctx.set('Content-Type', result.contentType);
            ctx.body = result.fileContent; // 返回文件二进制内容
        } catch (error) {
            ctx.logger.error('获取老师简历失败:', error);
            ctx.send([], 500, '服务器错误，请重试');
        }
    }
}

module.exports = AdminController;
