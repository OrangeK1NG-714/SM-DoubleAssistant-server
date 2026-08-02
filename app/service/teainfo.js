'use strict';

const Service = require('egg').Service;
const {
  isWithinWindow,
  teacherWindow,
} = require('../lib/selection-security');
const {
  acquireTeacherLock,
  releaseTeacherLock,
} = require('../lib/selection-lock');
const {
  FINALIZATION_POLICIES,
  finalizeSelection,
} = require('../application/finalize-selection');

class TeainfoService extends Service {
  async getTeaDetail() {
    const data = await this.ctx.model.Teacher.find({}, {
      resumeName: 0,
      resumePath: 0,
    });
    return { code: 200, data };
  }

  async updateChoose(studentId, teacherId, activityId) {
    const choose = await this.ctx.model.Choose.findOne({ studentId, teacherId, activityId });
    if (!choose) {
      return { code: 404, msg: '选择记录不存在' };
    }
    const updated = await this.ctx.model.Choose.findOneAndUpdate(
      { studentId, teacherId, activityId },
      { isChose: !choose.isChose },
      { new: true }
    );
    return { code: 200, msg: '学生选老师选项已修改', data: updated };
  }

  async selectStudent(studentId, teacherId, activityId, data, order) {
    const existing = await this.ctx.model.Final.findOne({ studentId, teacherId, activityId });
    if (existing) {
      return { code: 409, msg: '该学生已被选择，请勿重复操作' };
    }
    const choose = await this.ctx.model.Final.create({ studentId, teacherId, activityId, data, order });
    return { code: 200, msg: '老师已选学生', data: choose };
  }

  async cancelSelect(studentId, teacherId, activityId) {
    const res = await this.ctx.model.Final.deleteOne({ studentId, teacherId, activityId });
    return { code: 200, msg: '老师取消选择学生', data: res };
  }

  async _getSelectionContext(studentId, teacherId, activityId) {
    const { ctx } = this;
    const activityKey = String(activityId);
    const [ activity, teacherMembership, studentMembership, choose, student ] = await Promise.all([
      ctx.model.Activity.findById(activityId),
      ctx.model.UserInActivity.findOne({ activityId: activityKey, teacherId }),
      ctx.model.UserInActivity.findOne({ activityId: activityKey, studentId }),
      ctx.model.Choose.findOne({ activityId: activityKey, studentId, teacherId }),
      ctx.model.Student.findOne({ studentId }),
    ]);
    if (!activity) {
      return { error: { code: 404, msg: '活动不存在' } };
    }
    if (!teacherMembership || !studentMembership) {
      return { error: { code: 403, msg: '导师或学生不属于此活动' } };
    }
    if (!choose || !student) {
      return { error: { code: 404, msg: '学生未向该导师提交志愿' } };
    }
    const window = teacherWindow(activity, Number(choose.order));
    if (!isWithinWindow(new Date(), window)) {
      return { error: { code: 400, msg: `当前不在第${choose.order}志愿选择时间内` } };
    }
    return {
      activityKey,
      choose,
      student,
      teacherMembership,
    };
  }

  async _acquireTeacherLock(activityId, teacherId) {
    return acquireTeacherLock(this.ctx.model, activityId, teacherId);
  }

  async _releaseTeacherLock(activityId, teacherId, ownerToken) {
    await releaseTeacherLock(this.ctx.model, activityId, teacherId, ownerToken);
  }

  async selectStudentAndUpdate(studentId, teacherId, activityId) {
    const { ctx } = this;
    return finalizeSelection({
      activityId,
      logger: ctx.logger,
      models: ctx.model,
      policy: FINALIZATION_POLICIES.TEACHER,
      studentId,
      teacherId,
    });
  }

  async cancelSelectAndUpdate(studentId, teacherId, activityId) {
    const { ctx } = this;
    const selection = await this._getSelectionContext(studentId, teacherId, activityId);
    if (selection.error) {
      return selection.error;
    }
    const { activityKey } = selection;
    const ownerToken = await this._acquireTeacherLock(activityKey, teacherId);
    if (!ownerToken) {
      return { code: 409, msg: '导师选择正在处理中，请稍后重试' };
    }

    let deletedFinal = null;
    try {
      const final = await ctx.model.Final.findOne({ activityId: activityKey, studentId });
      if (final && final.teacherId !== teacherId) {
        return { code: 409, msg: '该学生由其他导师录取，无权取消' };
      }
      if (final) {
        deletedFinal = {
          activityId: activityKey,
          data: final.data || {},
          order: final.order,
          studentId,
          teacherId,
        };
        await ctx.model.Final.deleteOne({ activityId: activityKey, studentId, teacherId });
      }
      const updatedChoose = await ctx.model.Choose.findOneAndUpdate(
        { activityId: activityKey, studentId, teacherId },
        { $set: { isChose: false } },
        { new: true }
      );
      if (!updatedChoose) {
        throw new Error('choice disappeared during final cancellation');
      }
      await ctx.model.FinalReservation.deleteOne({
        activityId: activityKey,
        studentId,
        teacherId,
      });
      return { code: 200, msg: final ? '老师取消选择学生' : '该学生未被录取' };
    } catch (error) {
      if (deletedFinal) {
        await ctx.model.Final.create(deletedFinal).catch(rollbackError => {
          ctx.logger.error('cancelSelectAndUpdate rollback failed:', rollbackError);
        });
        await ctx.model.Choose.findOneAndUpdate(
          { activityId: activityKey, studentId, teacherId },
          { $set: { isChose: true } }
        ).catch(rollbackError => {
          ctx.logger.error('cancelSelectAndUpdate choice rollback failed:', rollbackError);
        });
      }
      ctx.logger.error('cancelSelectAndUpdate failed:', error);
      return { code: 500, msg: '取消失败，原录取状态已保留' };
    } finally {
      await this._releaseTeacherLock(activityKey, teacherId, ownerToken).catch(error => {
        ctx.logger.error('release teacher selection lock failed:', error);
      });
    }
  }

  async getSelectList(teacherId, activityId, studentId) {
    const query = {};
    if (teacherId) query.teacherId = teacherId;
    if (activityId) query.activityId = activityId;
    if (studentId) query.studentId = studentId;
    return await this.ctx.model.Final.find(query);
  }

  async isInActivity(teacherId, activityId) {
    return await this.ctx.model.UserInActivity.findOne({ teacherId, activityId });
  }

  async getChooseStudents(teacherId, activityId) {
    const chooseList = await this.ctx.model.Choose.find({ teacherId, activityId });
    const studentIds = [ ...new Set(chooseList.map(c => c.studentId)) ];
    if (studentIds.length === 0) return [];

    const [ students, finals, resumes ] = await Promise.all([
      this.ctx.model.Student.find({ studentId: { $in: studentIds } }),
      this.ctx.model.Final.find({ activityId, studentId: { $in: studentIds } }),
      this.ctx.model.Resume.find({ studentId: { $in: studentIds } }),
    ]);

    const studentMap = new Map(students.map(s => [ s.studentId, s.data || {} ]));
    const finalMap = new Map(finals.map(f => [ f.studentId, f.teacherId ]));
    const resumeMap = new Map(resumes.map(r => [ r.studentId, { resumeName: r.fileName }]));

    return chooseList.map(c => ({
      ...c.toObject(),
      data: { ...(studentMap.get(c.studentId) || {}), ...(resumeMap.get(c.studentId) || {}) },
      isChose: !!finalMap.get(c.studentId),
      finalTeacher: finalMap.get(c.studentId) || '',
    }));
  }

  async getChoosePageData(teacherId, activityId) {
    const [ students, userInActivity, activity ] = await Promise.all([
      this.getChooseStudents(teacherId, activityId),
      this.ctx.model.UserInActivity.findOne({ activityId, teacherId }),
      this.ctx.model.Activity.findById(activityId),
    ]);

    return {
      students,
      maxSelectNum: userInActivity ? userInActivity.maxSelectNum : 0,
      activity: activity || null,
    };
  }
}

module.exports = TeainfoService;
