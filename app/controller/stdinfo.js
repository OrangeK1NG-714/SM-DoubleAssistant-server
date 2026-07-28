'use strict';

const Controller = require('egg').Controller;
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const {
  canTeacherAccessStudent,
  hasActivityAccess,
  isRole,
  isSelfOrAdmin,
} = require('../lib/access-control');
const {
  isValidIdentifier,
  normalizeChoices,
  normalizeSubscribeStatus,
} = require('../lib/selection-security');

class StdinfoController extends Controller {
  async writeUserMsg() {
    const { ctx, service } = this;
    try {
      if (ctx.auth.role !== 'student' && ctx.auth.role !== 'admin') {
        return ctx.send([], 403, '仅学生或管理员可操作');
      }
      const { name, gender, studentId, grade, classNum, phone, gpa, direction, qq, wechat } = ctx.request.body;
      if (!isValidIdentifier(studentId)) {
        return ctx.send([], 400, '缺少必填参数 studentId');
      }
      if (ctx.auth.role === 'student' && ctx.auth.username !== studentId) {
        return ctx.send([], 403, '无权操作他人信息');
      }
      const res = await service.stdinfo.writeUserMsg(name, gender, studentId, grade, classNum, phone, gpa, direction, qq, wechat);
      ctx.send([], res.code, res.msg);
    } catch (err) {
      ctx.logger.error('writeUserMsg error:', err);
      ctx.send([], 500, '服务器错误');
    }
  }

  async updateUserMsg() {
    const { ctx, service } = this;
    try {
      if (ctx.auth.role !== 'student' && ctx.auth.role !== 'admin') {
        return ctx.send([], 403, '仅学生或管理员可操作');
      }
      const { name, gender, studentId } = ctx.request.body;
      if (!isValidIdentifier(studentId)) {
        return ctx.send([], 400, '缺少必填参数 studentId');
      }
      if (ctx.auth.role === 'student' && ctx.auth.username !== studentId) {
        return ctx.send([], 403, '无权操作他人信息');
      }
      const res = await service.stdinfo.updateUserMsg(name, gender, studentId);
      ctx.send([], res.code, res.msg);
    } catch (err) {
      ctx.logger.error('updateUserMsg error:', err);
      ctx.send([], 500, '服务器错误');
    }
  }

  async selectTeacher() {
    this.ctx.send([], 410, '单条志愿提交已停用，请使用批量提交接口');
  }

  async submitTeacherChoices() {
    const { ctx, service } = this;
    try {
      if (!isRole(ctx.auth, 'student', 'admin')) {
        return ctx.send([], 403, '仅学生或管理员可操作');
      }
      const { studentId, activityId, choices } = ctx.request.body;
      const subscribeStatus = normalizeSubscribeStatus(ctx.request.body.subscribeStatus);
      const normalizedChoices = normalizeChoices(choices);
      if (
        !isValidIdentifier(studentId)
        || !activityId
        || !normalizedChoices
        || subscribeStatus === null
      ) {
        return ctx.send([], 400, '志愿参数不正确');
      }
      if (!isSelfOrAdmin(ctx.auth, 'student', studentId)) {
        return ctx.send([], 403, '无权代替他人提交志愿');
      }
      if (!ctx.isValidObjectId(activityId)) {
        return ctx.send([], 400, 'activityId 格式不正确');
      }
      const res = await service.stdinfo.submitTeacherChoices({
        activityId,
        choices: normalizedChoices,
        studentId,
        subscribeStatus,
      });
      ctx.send(res.data || [], res.code, res.msg);
    } catch (err) {
      ctx.logger.error('submitTeacherChoices error:', err);
      ctx.send([], 500, '志愿提交失败，请稍后重试');
    }
  }

  async getTeachersForActivity() {
    const { ctx, service } = this;
    try {
      const { activityId } = ctx.request.query;
      if (!activityId || !ctx.isValidObjectId(activityId)) {
        return ctx.send([], 400, '缺少参数 activityId');
      }
      if (!await hasActivityAccess(ctx.model, ctx.auth, activityId)) {
        return ctx.send([], 403, '无权访问此活动');
      }
      const res = await service.stdinfo.getTeachersForActivity(activityId);
      ctx.send(res, 200, 'success');
    } catch (err) {
      ctx.logger.error('getTeachersForActivity error:', err);
      ctx.send([], 500, '服务器错误');
    }
  }

  async getTeacherListInActivity() {
    const { ctx, service } = this;
    try {
      const { activityId } = ctx.request.query;
      if (!activityId || !ctx.isValidObjectId(activityId)) {
        return ctx.send([], 400, '缺少参数 activityId');
      }
      if (!await hasActivityAccess(ctx.model, ctx.auth, activityId)) {
        return ctx.send([], 403, '无权访问此活动');
      }
      const res = await service.stdinfo.getTeacherListInActivity(activityId);
      ctx.send(res, 200, 'success');
    } catch (err) {
      ctx.logger.error('getTeacherListInActivity error:', err);
      ctx.send([], 500, '服务器错误');
    }
  }

  async isInActivity() {
    const { ctx, service } = this;
    try {
      const { studentId, activityId } = ctx.request.query;
      if (
        !isValidIdentifier(studentId)
        || !activityId
        || !ctx.isValidObjectId(activityId)
      ) {
        return ctx.send([], 400, '缺少参数 studentId 或 activityId');
      }
      if (!isSelfOrAdmin(ctx.auth, 'student', studentId)) {
        return ctx.send([], 403, '无权查询他人活动身份');
      }
      const res = await service.stdinfo.isInActivity(studentId, activityId);
      if (res) {
        ctx.send(res, 200, '学生在活动中');
      } else {
        ctx.send([], 404, '学生未在活动中');
      }
    } catch (err) {
      ctx.logger.error('isInActivity error:', err);
      ctx.send([], 500, '服务器错误');
    }
  }

  async getStudentMsg() {
    const { ctx, service } = this;
    try {
      const { studentId } = ctx.request.query;
      if (!isValidIdentifier(studentId)) {
        return ctx.send([], 400, '缺少参数 studentId');
      }
      if (!isSelfOrAdmin(ctx.auth, 'student', studentId)) {
        return ctx.send([], 403, '无权查看他人信息');
      }
      const res = await service.stdinfo.getStudentMsg(studentId);
      if (!res) {
        return ctx.send([], 404, '学生信息不存在');
      }
      ctx.send(res, 200, 'success');
    } catch (err) {
      ctx.logger.error('getStudentMsg error:', err);
      ctx.send([], 500, '服务器错误');
    }
  }

  async saveOpenid() {
    const { ctx, service } = this;
    try {
      if (ctx.auth.role !== 'student' && ctx.auth.role !== 'admin') {
        return ctx.send([], 403, '仅学生或管理员可操作');
      }
      const { code, studentId } = ctx.request.body;
      if (
        typeof code !== 'string'
        || code.length < 1
        || code.length > 256
        || !/^[A-Za-z0-9_-]+$/.test(code)
        || !isValidIdentifier(studentId)
      ) {
        return ctx.send([], 400, '缺少参数 code 或 studentId');
      }
      if (ctx.auth.role === 'student' && ctx.auth.username !== studentId) {
        return ctx.send([], 403, '无权操作他人信息');
      }
      const res = await service.stdinfo.saveOpenid(code, studentId);
      ctx.send([], res.code, res.msg);
    } catch (err) {
      ctx.logger.error('saveOpenid error:', err);
      ctx.send([], 500, '服务器错误');
    }
  }

  async uploadResume() {
    const { ctx, service, app } = this;
    try {
      if (ctx.auth.role !== 'student' && ctx.auth.role !== 'admin') {
        return ctx.send([], 403, '仅学生或管理员可操作');
      }
      const studentId = ctx.request.body.studentId;
      if (!isValidIdentifier(studentId)) {
        return ctx.send([], 400, '学生ID不能为空');
      }
      if (ctx.auth.role === 'student' && ctx.auth.username !== studentId) {
        return ctx.send([], 403, '无权操作他人信息');
      }
      const file = ctx.request.files?.[0];
      if (!file) {
        return ctx.send([], 400, '请选择要上传的文件');
      }
      const uploadDir = path.join(app.config.uploadDir, 'student');
      try {
        await fsp.access(uploadDir);
      } catch {
        await fsp.mkdir(uploadDir, { recursive: true });
      }
      const ext = path.extname(file.filename);
      const fileName = `${studentId}_resume${ext}`;
      const targetPath = path.join(uploadDir, fileName);
      const fileData = await fsp.readFile(file.filepath);
      await fsp.writeFile(targetPath, fileData);
      const subPath = 'student/' + fileName;
      const res = await service.stdinfo.uploadResume(file.filename, subPath, studentId);
      ctx.send([], res.code, res.msg);
    } catch (err) {
      ctx.logger.error('uploadResume error:', err);
      ctx.send([], 500, '上传失败，请重试');
    }
  }

  async getStudentResume() {
    const { ctx, service } = this;
    try {
      const { studentId } = ctx.request.query;
      const { activityId } = ctx.request.query;
      if (!isValidIdentifier(studentId)) {
        return ctx.send([], 400, '学生ID不能为空');
      }
      if (!await canTeacherAccessStudent(ctx.model, ctx.auth, studentId, activityId)) {
        return ctx.send([], 403, '无权查看该学生简历');
      }
      const result = await service.stdinfo.getStudentResume(studentId);
      if (result.code !== 200) {
        return ctx.send([], 200, result.msg);
      }
      ctx.attachment(result.fileName);
      ctx.set('Content-Type', result.contentType);
      ctx.body = result.fileContent;
    } catch (err) {
      ctx.logger.error('getStudentResume error:', err);
      ctx.send([], 500, '服务器错误，请重试');
    }
  }
}

module.exports = StdinfoController;
