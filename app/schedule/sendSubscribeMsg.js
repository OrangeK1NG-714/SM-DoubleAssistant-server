'use strict';

const Subscription = require('egg').Subscription;

class SendSubscribeMsg extends Subscription {
  static get schedule() {
    return {
      interval: '1m',
      type: 'worker',
      immediate: false,
    };
  }

  async subscribe() {
    const { ctx } = this;
    const now = new Date();

    try {
      const activities = await ctx.model.Activity.find({
        thirdChooseEndDate: { $lte: now },
        subscribeSent: false,
      });

      if (!activities || activities.length === 0) return;

      for (const activity of activities) {
        const activityId = String(activity._id);
        ctx.logger.info(`[sendSubscribeMsg] 开始处理活动 ${activityId}`);

        const finalList = await ctx.model.Final.find({ activityId });
        const selectedStudentIds = new Set(finalList.map(r => r.studentId));

        const chooseList = await ctx.model.Choose.find({
          activityId,
          subscribeStatus: { $ne: 'sent' },
        });

        const studentIdSet = new Set(chooseList.map(r => r.studentId));
        const pendingStudentIds = [ ...studentIdSet ];

        if (pendingStudentIds.length === 0) {
          await ctx.model.Activity.findByIdAndUpdate(activityId, { subscribeSent: true });
          await this._cleanUnselectedChoose(activityId, selectedStudentIds);
          ctx.logger.info(`[sendSubscribeMsg] 活动 ${activityId} 无待推送学生，已标记完成并清理志愿`);
          continue;
        }

        const students = await ctx.model.Student.find({ studentId: { $in: pendingStudentIds } });
        const studentMap = {};
        students.forEach(s => { studentMap[s.studentId] = s; });

        const teacherIdsNeeded = finalList.map(r => r.teacherId);
        const teachers = await ctx.model.Teacher.find({ teacherId: { $in: teacherIdsNeeded } });
        const teacherMap = {};
        teachers.forEach(t => { teacherMap[t.teacherId] = t; });

        const truncate = (str, max = 20) => (str && str.length > max ? str.slice(0, max) : str);

        let successSelected = 0,
          successRejected = 0,
          skipped = 0,
          failed = 0;

        for (const studentId of pendingStudentIds) {
          try {
            const student = studentMap[studentId];
            if (!student || !student.openid) {
              skipped++;
              continue;
            }

            let msgData;
            if (selectedStudentIds.has(studentId)) {
              const finalRecord = finalList.find(r => r.studentId === studentId);
              const teacher = finalRecord ? teacherMap[finalRecord.teacherId] : null;
              const teacherName = teacher ? teacher.name : '导师';
              msgData = {
                thing1: { value: truncate(activity.name) },
                time2: { value: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) },
                thing3: { value: truncate(`${teacherName} 老师已选择你`) },
                thing4: { value: '请登录系统查看结果，有疑问联系管理员' },
              };
            } else {
              msgData = {
                thing1: { value: truncate(activity.name) },
                time2: { value: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) },
                thing3: { value: '很遗憾，本次未被导师选中' },
                thing4: { value: '请关注补选时间，有疑问联系管理员' },
              };
            }

            await ctx.service.wechat.sendSubscribeMessage(student.openid, msgData);

            await ctx.model.Choose.updateMany(
              { activityId, studentId },
              { subscribeStatus: 'sent' }
            );

            if (selectedStudentIds.has(studentId)) {
              successSelected++;
            } else {
              successRejected++;
            }
          } catch (err) {
            failed++;
            await ctx.model.Choose.updateMany(
              { activityId, studentId },
              { subscribeStatus: 'failed' }
            );
            ctx.logger.error(`[sendSubscribeMsg] 推送给学生 ${studentId} 失败:`, err);
          }
        }

        const hasFailed = await ctx.model.Choose.exists({
          activityId,
          subscribeStatus: 'failed',
        });

        if (!hasFailed) {
          await ctx.model.Activity.findByIdAndUpdate(activityId, { subscribeSent: true });
          await this._cleanUnselectedChoose(activityId, selectedStudentIds);
          ctx.logger.info(`[sendSubscribeMsg] 活动 ${activityId} 推送全部完成，已清理未选中学生志愿`);
        } else {
          ctx.logger.warn(
            `[sendSubscribeMsg] 活动 ${activityId} 仍有失败记录，下次将继续重试`
          );
        }

        ctx.logger.info(
          `[sendSubscribeMsg] 活动 ${activityId} 推送完成 ` +
                    `被选中 ${successSelected} 人，落选 ${successRejected} 人，失败 ${failed} 人，跳过（无openid）${skipped} 人`
        );
      }
    } catch (err) {
      ctx.logger.error('[sendSubscribeMsg] 定时任务执行出错:', err);
    }
  }

  async _cleanUnselectedChoose(activityId, selectedStudentIds) {
    const { ctx } = this;
    const selectedArr = [ ...selectedStudentIds ];
    const result = await ctx.model.Choose.deleteMany({
      activityId,
      studentId: { $nin: selectedArr },
    });
    ctx.logger.info(
      `[sendSubscribeMsg] 活动 ${activityId} 清理未选中学生志愿 ${result.deletedCount} 条`
    );
  }
}

module.exports = SendSubscribeMsg;
