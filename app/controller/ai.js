'use strict';

const Controller = require('egg').Controller;

class AiController extends Controller {
  /**
   * AI 推荐导师接口
   * GET /api/student/recommendTeachers?studentId=xxx&activityId=xxx
   *
   * 返回 top3 推荐导师，包含匹配分、推荐理由、志愿位建议
   */
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
      ctx.send([], 500, `AI 推荐失败: ${err.message}`);
    }
  }
}

module.exports = AiController;
