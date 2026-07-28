'use strict';

const Controller = require('egg').Controller;
const { hasActivityAccess, isSelfOrAdmin } = require('../lib/access-control');
const { isValidIdentifier } = require('../lib/selection-security');

class AiController extends Controller {
  async recommendTeachers() {
    const { ctx, service } = this;
    const { studentId, activityId } = ctx.request.query;

    if (
      !isValidIdentifier(studentId)
      || !activityId
      || !ctx.isValidObjectId(activityId)
    ) {
      return ctx.send([], 400, '缺少 studentId 或 activityId');
    }
    if (!isSelfOrAdmin(ctx.auth, 'student', studentId)) {
      return ctx.send([], 403, '无权为他人生成推荐');
    }
    if (!await hasActivityAccess(ctx.model, ctx.auth, activityId)) {
      return ctx.send([], 403, '无权访问此活动');
    }

    try {
      const result = await service.ai.recommendTeachers(studentId, activityId);

      if (result.error) {
        return ctx.send([], 400, result.error);
      }

      ctx.send(result.items, 200, 'AI 推荐成功');
    } catch (err) {
      ctx.logger.error('[AI recommendTeachers] error:', err);
      ctx.send([], 500, 'AI 推荐失败，请稍后重试');
    }
  }

  async getTeacherProfiles() {
    const { ctx, service } = this;
    try {
      const profiles = await service.ai.getTeacherProfiles();
      ctx.send(profiles, 200, '获取成功');
    } catch (err) {
      ctx.logger.error('[AI getTeacherProfiles] error:', err);
      ctx.send([], 500, '获取失败');
    }
  }

  async updateTeacherProfile() {
    const { ctx, service } = this;
    const { name, research, teaching } = ctx.request.body;

    if (!name) {
      return ctx.send(null, 400, '缺少老师姓名');
    }

    try {
      const action = await service.ai.updateTeacherProfile(
        name,
        research || '',
        teaching || ''
      );
      service.ai.clearProfileCache();
      ctx.send({ action }, 200, action === 'updated' ? '更新成功' : '新增成功');
    } catch (err) {
      ctx.logger.error('[AI updateTeacherProfile] error:', err);
      ctx.send(null, 500, '更新失败: ' + err.message);
    }
  }

  async reloadProfiles() {
    const { ctx, service } = this;
    try {
      service.ai.clearProfileCache();
      const profiles = await service.ai.getTeacherProfiles();
      ctx.send({ count: profiles.length }, 200, '缓存已清除，重新加载了 ' + profiles.length + ' 位老师的画像');
    } catch (err) {
      ctx.logger.error('[AI reloadProfiles] error:', err);
      ctx.send(null, 500, '重载失败');
    }
  }
}

module.exports = AiController;
