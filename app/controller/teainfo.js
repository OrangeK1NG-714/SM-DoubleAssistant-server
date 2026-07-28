'use strict';

const Controller = require('egg').Controller;
const { hasActivityAccess, isSelfOrAdmin } = require('../lib/access-control');
const { isValidIdentifier } = require('../lib/selection-security');

class TeainfoController extends Controller {
  async getTeaDetail() {
    const { ctx, service } = this;
    try {
      const res = await service.teainfo.getTeaDetail();
      ctx.send(res.data, 200, 'success');
    } catch (err) {
      ctx.logger.error('getTeaDetail error:', err);
      ctx.send([], 500, '服务器错误');
    }
  }

  async updateChoose() {
    this.ctx.send([], 410, '单独修改志愿状态已停用');
  }

  async selectStudent() {
    this.ctx.send([], 410, '旧录取接口已停用，请使用一致性录取接口');
  }

  async cancelSelect() {
    this.ctx.send([], 410, '旧取消接口已停用，请使用一致性取消接口');
  }

  async selectStudentAndUpdate() {
    const { ctx, service } = this;
    try {
      if (ctx.auth.role !== 'teacher' && ctx.auth.role !== 'admin') {
        return ctx.send([], 403, '仅导师或管理员可操作');
      }
      const { studentId, teacherId, activityId } = ctx.request.body;
      if (
        !isValidIdentifier(studentId)
        || !isValidIdentifier(teacherId)
        || !activityId
        || !ctx.isValidObjectId(activityId)
      ) {
        return ctx.send([], 400, '缺少必填参数');
      }
      if (ctx.auth.role === 'teacher' && ctx.auth.username !== teacherId) {
        return ctx.send([], 403, '无权代替他人选择学生');
      }
      const res = await service.teainfo.selectStudentAndUpdate(studentId, teacherId, activityId);
      ctx.send(res.data || [], res.code, res.msg);
    } catch (err) {
      ctx.logger.error('selectStudentAndUpdate error:', err);
      ctx.send([], 500, '服务器错误');
    }
  }

  async cancelSelectAndUpdate() {
    const { ctx, service } = this;
    try {
      if (ctx.auth.role !== 'teacher' && ctx.auth.role !== 'admin') {
        return ctx.send([], 403, '仅导师或管理员可操作');
      }
      const { studentId, teacherId, activityId } = ctx.request.body;
      if (
        !isValidIdentifier(studentId)
        || !isValidIdentifier(teacherId)
        || !activityId
        || !ctx.isValidObjectId(activityId)
      ) {
        return ctx.send([], 400, '缺少必填参数 studentId/teacherId/activityId');
      }
      if (ctx.auth.role === 'teacher' && ctx.auth.username !== teacherId) {
        return ctx.send([], 403, '无权操作他人选择');
      }
      const res = await service.teainfo.cancelSelectAndUpdate(studentId, teacherId, activityId);
      ctx.send([], res.code, res.msg);
    } catch (err) {
      ctx.logger.error('cancelSelectAndUpdate error:', err);
      ctx.send([], 500, '服务器错误');
    }
  }

  async getSelectList() {
    const { ctx, service } = this;
    try {
      const { teacherId, activityId, studentId } = ctx.request.query;
      if (
        !isValidIdentifier(teacherId)
        || !activityId
        || !ctx.isValidObjectId(activityId)
        || (studentId && !isValidIdentifier(studentId))
      ) {
        return ctx.send([], 400, '缺少参数 teacherId 或 activityId');
      }
      if (!isSelfOrAdmin(ctx.auth, 'teacher', teacherId)) {
        return ctx.send([], 403, '无权查看其他导师的录取数据');
      }
      if (!await hasActivityAccess(ctx.model, ctx.auth, activityId)) {
        return ctx.send([], 403, '无权访问此活动');
      }
      const res = await service.teainfo.getSelectList(teacherId, activityId, studentId);
      ctx.send(res, 200, 'success');
    } catch (err) {
      ctx.logger.error('getSelectList error:', err);
      ctx.send([], 500, '服务器错误');
    }
  }

  async getChooseStudents() {
    const { ctx, service } = this;
    try {
      const { teacherId, activityId } = ctx.request.query;
      if (!isValidIdentifier(teacherId) || !activityId || !ctx.isValidObjectId(activityId)) {
        return ctx.send([], 400, '缺少参数 teacherId 或 activityId');
      }
      if (!isSelfOrAdmin(ctx.auth, 'teacher', teacherId)) {
        return ctx.send([], 403, '无权查看其他导师的志愿数据');
      }
      if (!await hasActivityAccess(ctx.model, ctx.auth, activityId)) {
        return ctx.send([], 403, '无权访问此活动');
      }
      const res = await service.teainfo.getChooseStudents(teacherId, activityId);
      ctx.send(res, 200, 'success');
    } catch (err) {
      ctx.logger.error('getChooseStudents error:', err);
      ctx.send([], 500, '服务器错误');
    }
  }

  async getChoosePageData() {
    const { ctx, service } = this;
    try {
      const { teacherId, activityId } = ctx.request.query;
      if (!isValidIdentifier(teacherId) || !activityId || !ctx.isValidObjectId(activityId)) {
        return ctx.send([], 400, '缺少参数 teacherId 或 activityId');
      }
      if (!isSelfOrAdmin(ctx.auth, 'teacher', teacherId)) {
        return ctx.send([], 403, '无权查看其他导师的志愿数据');
      }
      if (!await hasActivityAccess(ctx.model, ctx.auth, activityId)) {
        return ctx.send([], 403, '无权访问此活动');
      }
      const res = await service.teainfo.getChoosePageData(teacherId, activityId);
      ctx.send(res, 200, 'success');
    } catch (err) {
      ctx.logger.error('getChoosePageData error:', err);
      ctx.send([], 500, '服务器错误');
    }
  }

  async isInActivity() {
    const { ctx, service } = this;
    try {
      const { teacherId, activityId } = ctx.request.query;
      if (!isValidIdentifier(teacherId) || !activityId || !ctx.isValidObjectId(activityId)) {
        return ctx.send([], 400, '缺少参数 teacherId 或 activityId');
      }
      if (!isSelfOrAdmin(ctx.auth, 'teacher', teacherId)) {
        return ctx.send([], 403, '无权查询其他导师的活动身份');
      }
      const res = await service.teainfo.isInActivity(teacherId, activityId);
      if (res) {
        ctx.send(res, 200, '导师在活动中');
      } else {
        ctx.send([], 404, '导师未在活动中');
      }
    } catch (err) {
      ctx.logger.error('isInActivity error:', err);
      ctx.send([], 500, '服务器错误');
    }
  }
}

module.exports = TeainfoController;
