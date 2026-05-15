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

                const chooseList = await ctx.model.Choose.find({ activityId });
                const allStudentIds = [...new Set(chooseList.map(r => r.studentId))];

                // 批量查询所有学生和相关老师，避免 N+1
                const students = await ctx.model.Student.find({ studentId: { $in: allStudentIds } });
                const studentMap = {};
                students.forEach(s => { studentMap[s.studentId] = s; });

                const teacherIdsNeeded = finalList.map(r => r.teacherId);
                const teachers = await ctx.model.Teacher.find({ teacherId: { $in: teacherIdsNeeded } });
                const teacherMap = {};
                teachers.forEach(t => { teacherMap[t.teacherId] = t; });

                let successSelected = 0, successRejected = 0, skipped = 0, failed = 0;

                for (const studentId of allStudentIds) {
                    try {
                        const student = studentMap[studentId];
                        if (!student || !student.openid) {
                            skipped++;
                            continue;
                        }

                        if (selectedStudentIds.has(studentId)) {
                            const finalRecord = finalList.find(r => r.studentId === studentId);
                            const teacher = finalRecord ? teacherMap[finalRecord.teacherId] : null;
                            const teacherName = teacher ? teacher.name : '导师';

                            await ctx.service.wechat.sendSubscribeMessage(student.openid, {
                                thing1: { value: activity.name },
                                time2: { value: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) },
                                thing3: { value: `${teacherName} 老师已选择你` },
                                thing4: { value: '请登录系统查看最终结果，有疑问请找管理员咨询' },
                            });
                            successSelected++;
                        } else {
                            await ctx.service.wechat.sendSubscribeMessage(student.openid, {
                                thing1: { value: activity.name },
                                time2: { value: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) },
                                thing3: { value: '很遗憾，本次未被导师选中' },
                                thing4: { value: '请关注补选时间，有疑问请找管理员咨询' },
                            });
                            successRejected++;
                        }
                    } catch (err) {
                        failed++;
                        ctx.logger.error(`[sendSubscribeMsg] 推送给学生 ${studentId} 失败:`, err);
                    }
                }

                const totalSuccess = successSelected + successRejected;
                if (totalSuccess > 0 && failed === 0) {
                    activity.subscribeSent = true;
                    await activity.save();
                    ctx.logger.info(`[sendSubscribeMsg] 活动 ${activityId} 已标记 subscribeSent=true`);
                } else {
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
