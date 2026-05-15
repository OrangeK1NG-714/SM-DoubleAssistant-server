'use strict';

const Subscription = require('egg').Subscription;

/**
 * 定时任务：每分钟检查是否有活动的第三轮选择刚刚结束
 * 若是，则：
 *   - 给 Final 表中被选中的学生发「恭喜被选中」订阅消息
 *   - 给 Choose 表中提交了志愿但未被选中的学生发「很遗憾未被选中」订阅消息
 * 通过 activity.subscribeSent 标记防止重复发送
 */
class SendSubscribeMsg extends Subscription {
    static get schedule() {
        return {
            interval: '1m', // 每分钟执行一次
            type: 'worker', // 只由一个 worker 执行，避免重复
            immediate: false,
        };
    }

    async subscribe() {
        const { ctx } = this;
        const now = new Date();

        try {
            // 查找所有「第三轮结束时间已过」且「还未推送过」的活动
            const activities = await ctx.model.Activity.find({
                thirdChooseEndDate: { $lte: now },
                subscribeSent: false,
            });

            if (!activities || activities.length === 0) return;

            for (const activity of activities) {
                const activityId = String(activity._id);
                ctx.logger.info(`[sendSubscribeMsg] 开始处理活动 ${activityId}`);

                // ── 1. 查出被选中的学生（Final 表，去重）──
                const finalList = await ctx.model.Final.find({ activityId });
                const selectedStudentIds = new Set(finalList.map(r => r.studentId));

                // ── 2. 查出所有提交过志愿的学生（Choose 表，去重）──
                const chooseList = await ctx.model.Choose.find({ activityId });
                const allStudentIds = new Set(chooseList.map(r => r.studentId));

                let successSelected = 0, successRejected = 0, skipped = 0, failed = 0;

                for (const studentId of allStudentIds) {
                    try {
                        const student = await ctx.model.Student.findOne({ studentId });
                        if (!student || !student.openid) {
                            ctx.logger.warn(`[sendSubscribeMsg] 学生 ${studentId} 无 openid，跳过`);
                            skipped++;
                            continue;
                        }

                        if (selectedStudentIds.has(studentId)) {
                            // ── 被选中 ──
                            // 查对应老师姓名
                            const finalRecord = finalList.find(r => r.studentId === studentId);
                            const teacher = finalRecord
                                ? await ctx.model.Teacher.findOne({ teacherId: finalRecord.teacherId })
                                : null;
                            const teacherName = teacher ? teacher.name : '导师';

                            // ⚠️ 字段名需与微信公众平台模板字段完全对应
                            await ctx.service.wechat.sendSubscribeMessage(student.openid, {
                                thing1: { value: activity.name },
                                time2: { value: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) },
                                thing3: { value: `${teacherName} 老师已选择你` },
                                thing4: { value: '请登录系统查看最终结果，有疑问请找管理员咨询' },
                            });
                            successSelected++;
                            ctx.logger.info(`[sendSubscribeMsg] 已推送「被选中」给学生 ${studentId}`);
                        } else {
                            // ── 落选 ──
                            // ⚠️ 字段名需与微信公众平台模板字段完全对应
                            await ctx.service.wechat.sendSubscribeMessage(student.openid, {
                                thing1: { value: activity.name },
                                time2: { value: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) },
                                thing3: { value: '很遗憾，本次未被导师选中' },
                                thing4: { value: '请关注补选时间，有疑问请找管理员咨询' },
                            });
                            successRejected++;
                            ctx.logger.info(`[sendSubscribeMsg] 已推送「落选」给学生 ${studentId}`);
                        }
                    } catch (err) {
                        failed++;
                        ctx.logger.error(`[sendSubscribeMsg] 推送给学生 ${studentId} 失败:`, err);
                    }
                }

                const totalSuccess = successSelected + successRejected;
                if (totalSuccess > 0 && failed === 0) {
                    // 至少成功发送 1 条，且无失败，才标记已推送
                    activity.subscribeSent = true;
                    await activity.save();
                    ctx.logger.info(`[sendSubscribeMsg] 活动 ${activityId} 已标记 subscribeSent=true`);
                } else {
                    // 保持 false，便于后续重试
                    ctx.logger.warn(
                        `[sendSubscribeMsg] 活动 ${activityId} 未标记已推送（success=${totalSuccess}, failed=${failed}），下次将继续重试`
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
}

module.exports = SendSubscribeMsg;
