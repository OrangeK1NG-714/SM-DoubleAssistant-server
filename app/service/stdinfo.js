'use strict';

const Service = require('egg').Service;
const crypto = require('node:crypto');
const fsp = require('node:fs').promises;
const path = require('node:path');
const {
  choiceFingerprint,
  isDuplicateKeyError,
  isSameChoiceSet,
  isWithinWindow,
} = require('../lib/selection-security');
const { resolveExistingFileWithin } = require('../lib/safe-path');

const SUBMISSION_LOCK_MS = 30 * 1000;

class StdinfoService extends Service {
  async writeUserMsg(name, gender, studentId, grade, classNum, phone, gpa, direction, qq, wechat) {
    const data = { name, gender, studentId, grade, classNum, phone, gpa, direction, qq, wechat };
    const student = await this.ctx.model.Student.findOneAndUpdate(
      { studentId },
      { data },
      { new: true }
    );
    if (student) {
      return { code: 200, msg: '学生信息已更新', data: student };
    }
    const newStudent = await this.ctx.model.Student.create({
      studentId,
      data,
    });
    return { code: 200, msg: '学生信息新增成功', data: newStudent };
  }

  async updateUserMsg(name, gender, studentId) {
    const student = await this.ctx.model.Student.findOne({ studentId });
    if (!student) {
      return { code: 404, msg: '学生不存在' };
    }
    const updatedData = Object.assign({}, student.data, { name, gender, studentId });
    const result = await this.ctx.model.Student.findOneAndUpdate(
      { studentId },
      { data: updatedData },
      { new: true }
    );
    return { code: 200, msg: '学生信息已更新', data: result };
  }

  async submitTeacherChoices({ activityId, choices, studentId, subscribeStatus }) {
    const { ctx } = this;
    const activityKey = String(activityId);
    const activity = await ctx.model.Activity.findById(activityId);
    if (!activity) {
      return { code: 404, msg: '活动不存在' };
    }
    const now = new Date();
    const startDate = new Date(activity.stdChooseStartDate);
    const endDate = new Date(activity.stdChooseEndDate);
    if (!isWithinWindow(now, { start: startDate, end: endDate })) {
      return { code: 400, msg: '不在选老师时间内' };
    }

    const [ student, studentMembership, teacherMemberships, teachers ] = await Promise.all([
      ctx.model.Student.findOne({ studentId }),
      ctx.model.UserInActivity.findOne({ activityId: activityKey, studentId }),
      ctx.model.UserInActivity.find({
        activityId: activityKey,
        teacherId: { $in: choices.map(item => item.teacherId) },
      }),
      ctx.model.Teacher.find({ teacherId: { $in: choices.map(item => item.teacherId) } }),
    ]);
    if (!student || !studentMembership) {
      return { code: 403, msg: '学生不属于此活动' };
    }
    const teacherIds = new Set(teachers.map(item => item.teacherId));
    const membershipByTeacher = new Map(
      teacherMemberships.map(item => [ item.teacherId, item ])
    );
    if (choices.some(item => !teacherIds.has(item.teacherId) || !membershipByTeacher.has(item.teacherId))) {
      return { code: 400, msg: '志愿中包含不属于此活动的导师' };
    }

    const finalCounts = await Promise.all(choices.map(item => (
      ctx.model.Final.countDocuments({ activityId: activityKey, teacherId: item.teacherId })
    )));
    for (let index = 0; index < choices.length; index++) {
      const quota = Number(membershipByTeacher.get(choices[index].teacherId).maxSelectNum);
      if (!Number.isInteger(quota) || quota < 1) {
        return { code: 409, msg: `导师 ${choices[index].teacherId} 名额尚未配置` };
      }
      if (finalCounts[index] >= quota) {
        return { code: 409, msg: `导师 ${choices[index].teacherId} 名额已满` };
      }
    }

    const fingerprint = choiceFingerprint(
      studentId,
      activityKey,
      choices
    );
    const ownerToken = crypto.randomUUID();
    const lockUntil = new Date(now.getTime() + SUBMISSION_LOCK_MS);
    let submission;
    let existingSubmission;
    try {
      submission = await ctx.model.ChoiceSubmission.create({
        activityId: activityKey,
        choices,
        fingerprint,
        lockUntil,
        ownerToken,
        status: 'processing',
        studentId,
        subscribeStatus,
        updatedAt: now,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      existingSubmission = await ctx.model.ChoiceSubmission.findOne({
        activityId: activityKey,
        studentId,
      });
    }

    if (!submission) {
      if (!existingSubmission) {
        return { code: 409, msg: '志愿正在提交，请稍后重试' };
      }
      if (existingSubmission.status === 'committed') {
        if (existingSubmission.fingerprint !== fingerprint) {
          return { code: 409, msg: '志愿已提交，不能重复修改' };
        }
        const existingChoices = await ctx.model.Choose.find({
          activityId: activityKey,
          studentId,
        });
        if (!isSameChoiceSet(existingChoices, choices)) {
          return { code: 409, msg: '志愿记录需要管理员检查后重置' };
        }
        return { code: 200, msg: '志愿已提交', data: existingChoices };
      }

      const reclaimable = existingSubmission.status === 'failed'
        || new Date(existingSubmission.lockUntil) <= now;
      if (!reclaimable) {
        return { code: 409, msg: '志愿正在提交，请稍后重试' };
      }
      const staleSubmissionId = existingSubmission.ownerToken;
      submission = await ctx.model.ChoiceSubmission.findOneAndUpdate(
        {
          _id: existingSubmission._id,
          status: existingSubmission.status,
          lockUntil: existingSubmission.lockUntil,
        },
        {
          $set: {
            choices,
            fingerprint,
            lockUntil,
            ownerToken,
            status: 'processing',
            subscribeStatus,
            updatedAt: now,
          },
        },
        { new: true }
      );
      if (!submission) {
        return { code: 409, msg: '志愿正在提交，请稍后重试' };
      }
      if (staleSubmissionId) {
        await ctx.model.Choose.deleteMany({
          activityId: activityKey,
          studentId,
          submissionId: staleSubmissionId,
        });
      }
    }

    const existingChoices = await ctx.model.Choose.find({
      activityId: activityKey,
      studentId,
    });
    if (existingChoices.length > 0) {
      if (!isSameChoiceSet(existingChoices, choices)) {
        await ctx.model.ChoiceSubmission.updateOne(
          { _id: submission._id, ownerToken },
          {
            $set: {
              lockUntil: now,
              ownerToken,
              status: 'failed',
              updatedAt: now,
            },
          }
        );
        return { code: 409, msg: '检测到不完整或冲突的旧志愿，请联系管理员重置' };
      }
      await ctx.model.ChoiceSubmission.updateOne(
        { _id: submission._id, ownerToken },
        {
          $set: {
            lockUntil: now,
            ownerToken: '',
            status: 'committed',
            updatedAt: now,
          },
        }
      );
      return { code: 200, msg: '志愿已提交', data: existingChoices };
    }

    const submissionId = ownerToken;
    const documents = choices.map(item => ({
      activityId: activityKey,
      createTime: now,
      isChose: false,
      order: item.order,
      studentId,
      submissionId,
      subscribeStatus,
      subscribeTemplateId: ctx.app.config.wxMiniApp.subscribeTemplateId || '',
      teacherId: item.teacherId,
    }));
    try {
      const inserted = await ctx.model.Choose.insertMany(documents, { ordered: true });
      const committed = await ctx.model.ChoiceSubmission.findOneAndUpdate(
        { _id: submission._id, ownerToken, status: 'processing' },
        {
          $set: {
            lockUntil: now,
            ownerToken: '',
            status: 'committed',
            updatedAt: now,
          },
        },
        { new: true }
      );
      if (!committed) {
        throw new Error('choice submission lock ownership lost');
      }
      return { code: 201, msg: '志愿提交成功', data: inserted };
    } catch (error) {
      await ctx.model.Choose.deleteMany({
        activityId: activityKey,
        studentId,
        submissionId,
      });
      await ctx.model.ChoiceSubmission.updateOne(
        { _id: submission._id, ownerToken },
        {
          $set: {
            lockUntil: now,
            ownerToken,
            status: 'failed',
            updatedAt: now,
          },
        }
      );
      ctx.logger.error('submitTeacherChoices write failed:', error);
      return { code: 500, msg: '志愿提交失败，未保存任何志愿' };
    }
  }

  async saveOpenid(code, studentId) {
    try {
      const openid = await this.service.wechat.getOpenid(code);
      const result = await this.ctx.model.Student.findOneAndUpdate(
        { studentId },
        { openid },
        { new: true }
      );
      if (!result) {
        return { code: 404, msg: '学生不存在' };
      }
      return { code: 200, msg: 'openid 保存成功' };
    } catch (error) {
      this.ctx.logger.error('[saveOpenid] 错误:', error);
      return { code: 502, msg: '微信身份校验失败，请稍后重试' };
    }
  }

  async getTeacherListInActivity(activityId) {
    const { ctx } = this;
    return await ctx.model.UserInActivity.find({ activityId, teacherId: { $exists: true } });
  }

  async getTeachersForActivity(activityId) {
    const { ctx } = this;
    const activityTeachers = await ctx.model.UserInActivity.find({ activityId, teacherId: { $exists: true } });
    const teacherIds = activityTeachers.map(t => t.teacherId);
    if (teacherIds.length === 0) return [];

    const [ teachers, chooseCounts, finalCounts ] = await Promise.all([
      ctx.model.Teacher.find({ teacherId: { $in: teacherIds } }),
      ctx.model.Choose.aggregate([
        { $match: { activityId, teacherId: { $in: teacherIds } } },
        { $group: {
          _id: '$teacherId',
          chooseCount: { $sum: 1 },
          selectedCount: { $sum: { $cond: [ '$isChose', 1, 0 ] } },
        } },
      ]),
      ctx.model.Final.aggregate([
        { $match: { activityId } },
        { $group: { _id: '$teacherId', finalCount: { $sum: 1 } } },
      ]),
    ]);

    const teacherMap = new Map(teachers.map(t => [ t.teacherId, t ]));
    const countMap = new Map(chooseCounts.map(c => [ c._id, c ]));
    const finalCountMap = new Map(finalCounts.map(c => [ c._id, c.finalCount ]));
    const maxSelectMap = new Map(activityTeachers.map(t => [ t.teacherId, t.maxSelectNum || 0 ]));

    return teacherIds.map(id => {
      const teacher = teacherMap.get(id) || {};
      const counts = countMap.get(id) || { chooseCount: 0, selectedCount: 0 };
      const maxNum = maxSelectMap.get(id) || 0;
      const finalCount = finalCountMap.get(id) || 0;
      return {
        teacherId: id,
        name: teacher.name || '',
        msg: teacher.msg || '',
        teacherType: teacher.teacherType || '',
        maxSelectNum: maxNum,
        finalCount,
        remainingSlots: Math.max(0, maxNum - finalCount),
        chooseCount: counts.chooseCount,
        selectedCount: counts.selectedCount,
      };
    });
  }

  async isInActivity(studentId, activityId) {
    const { ctx } = this;
    return await ctx.model.UserInActivity.findOne({ studentId, activityId });
  }

  async getStudentMsg(studentId) {
    const { ctx } = this;
    return await ctx.model.Student.findOne({ studentId });
  }

  async uploadResume(originalFileName, subPath, studentId) {
    const { ctx } = this;
    const uploadDir = this.app.config.uploadDir;
    const existing = await ctx.model.Resume.findOne({ studentId });
    if (existing) {
      if (existing.filePath && existing.filePath !== subPath) {
        try {
          const oldFilePath = await resolveExistingFileWithin(uploadDir, existing.filePath);
          if (oldFilePath) {
            await fsp.unlink(oldFilePath).catch(() => {});
          }
        } catch (e) {
          ctx.logger.warn('删除旧学生简历失败:', e.message);
        }
      }
      existing.fileName = originalFileName;
      existing.filePath = subPath;
      existing.createTime = new Date();
      await existing.save();
      return { code: 200, msg: '学生简历已更新' };
    }
    await ctx.model.Resume.create({ studentId, fileName: originalFileName, filePath: subPath });
    return { code: 200, msg: '学生简历已上传' };
  }

  async getStudentResume(studentId) {
    const { ctx } = this;
    const uploadDir = this.app.config.uploadDir;
    const resume = await ctx.model.Resume.findOne({ studentId });
    if (!resume) {
      return { code: 404, msg: '学生未上传简历' };
    }
    if (!resume.filePath) {
      return { code: 404, msg: '简历文件路径不存在' };
    }
    const filePath = await resolveExistingFileWithin(uploadDir, resume.filePath);
    if (!filePath) {
      return { code: 404, msg: '简历文件不存在' };
    }
    const fileContent = await fsp.readFile(filePath);
    const ext = path.extname(resume.filePath).toLowerCase();
    const contentTypeMap = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    };
    return {
      code: 200,
      fileName: resume.fileName,
      contentType: contentTypeMap[ext] || 'application/octet-stream',
      fileContent,
    };
  }
}

module.exports = StdinfoService;
