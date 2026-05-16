'use strict';

const Controller = require('egg').Controller;

class AiController extends Controller {
  async recommendTeachers() {
    const { ctx, service } = this;
    const { studentId, activityId } = ctx.request.query;

    if (!studentId || !activityId) {
      return ctx.send([], 400, '缺少 studentId 或 activityId');
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
}

module.exports = AiController;
