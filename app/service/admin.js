'use strict';

const Service = require('egg').Service;
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const { isDuplicateKeyError } = require('../lib/selection-security');
const {
  acquireTeacherLock,
  releaseTeacherLock,
} = require('../lib/selection-lock');
const { resolveExistingFileWithin } = require('../lib/safe-path');

const BCRYPT_ROUNDS = 10;
const FINAL_RESERVATION_MS = 30 * 1000;

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class AdminService extends Service {
  async _deleteChoiceGroupsForTeacher(activityId, teacherId) {
    const { ctx } = this;
    const query = { teacherId };
    if (activityId) {
      query.activityId = String(activityId);
    }
    const affected = await ctx.model.Choose.find(
      query,
      { activityId: 1, studentId: 1 }
    );
    const seen = new Set();
    const groups = [];
    for (const item of affected) {
      const key = `${item.activityId}:${item.studentId}`;
      if (!seen.has(key)) {
        seen.add(key);
        groups.push({
          activityId: item.activityId,
          studentId: item.studentId,
        });
      }
    }
    if (groups.length === 0) {
      return;
    }
    await Promise.all([
      ctx.model.Choose.deleteMany({ $or: groups }),
      ctx.model.ChoiceSubmission.deleteMany({ $or: groups }),
    ]);
  }

  async _cleanupActivityMembership(record) {
    const { ctx } = this;
    const activityId = String(record.activityId);
    if (record.teacherId) {
      await this._deleteChoiceGroupsForTeacher(activityId, record.teacherId);
      await Promise.all([
        ctx.model.Final.deleteMany({ activityId, teacherId: record.teacherId }),
        ctx.model.FinalReservation.deleteMany({ activityId, teacherId: record.teacherId }),
        ctx.model.TeacherOperationLock.deleteMany({ activityId, teacherId: record.teacherId }),
      ]);
    }
    if (record.studentId) {
      await Promise.all([
        ctx.model.Choose.deleteMany({ activityId, studentId: record.studentId }),
        ctx.model.ChoiceSubmission.deleteOne({ activityId, studentId: record.studentId }),
        ctx.model.Final.deleteMany({ activityId, studentId: record.studentId }),
        ctx.model.FinalReservation.deleteMany({ activityId, studentId: record.studentId }),
      ]);
    }
  }

  async addActivity(name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate, secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate, stdChooseStartDate, stdChooseEndDate) {
    const { ctx } = this;
    await ctx.model.Activity.create({ name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate, secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate, stdChooseStartDate, stdChooseEndDate });
    return { code: 200, msg: '活动创建成功' };
  }

  async getActivityList() {
    const { ctx } = this;
    return await ctx.model.Activity.find();
  }

  async getActivityDetail(id) {
    const { ctx } = this;
    return await ctx.model.Activity.findById(id);
  }

  async updateActivity(_id, name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate, secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate, stdChooseStartDate, stdChooseEndDate) {
    const { ctx } = this;
    const old = await ctx.model.Activity.findById(_id);
    if (!old) {
      return { code: 400, msg: '活动不存在' };
    }

    const dateFields = [
      'startDate', 'endDate',
      'firstChooseStartDate', 'firstChooseEndDate',
      'secondChooseStartDate', 'secondChooseEndDate',
      'thirdChooseStartDate', 'thirdChooseEndDate',
      'stdChooseStartDate', 'stdChooseEndDate',
    ];
    const incoming = { startDate, endDate, firstChooseStartDate, firstChooseEndDate, secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate, stdChooseStartDate, stdChooseEndDate };
    const dateChanged = dateFields.some(f => incoming[f] && String(new Date(incoming[f])) !== String(old[f]));

    const update = {
      name, description, startDate, endDate,
      firstChooseStartDate, firstChooseEndDate,
      secondChooseStartDate, secondChooseEndDate,
      thirdChooseStartDate, thirdChooseEndDate,
      stdChooseStartDate, stdChooseEndDate,
    };
    if (dateChanged) {
      update.subscribeSent = false;
    }

    await ctx.model.Activity.findByIdAndUpdate(_id, update);
    return { code: 200, msg: '活动更新成功' };
  }

  async deleteActivity(id) {
    const { ctx } = this;
    const res = await ctx.model.Activity.findByIdAndDelete(id);
    if (!res) {
      return { code: 400, msg: '活动不存在' };
    }
    const activityId = String(id);
    await Promise.all([
      ctx.model.UserInActivity.deleteMany({ activityId }),
      ctx.model.Choose.deleteMany({ activityId }),
      ctx.model.ChoiceSubmission.deleteMany({ activityId }),
      ctx.model.Final.deleteMany({ activityId }),
      ctx.model.FinalReservation.deleteMany({ activityId }),
      ctx.model.TeacherOperationLock.deleteMany({ activityId }),
    ]);
    return { code: 200, msg: '活动删除成功' };
  }

  async deleteUser(id) {
    const { ctx } = this;
    const idConditions = [ id ];
    if (mongoose.Types.ObjectId.isValid(id)) {
      idConditions.push(new mongoose.Types.ObjectId(id));
    }
    const user = await ctx.model.Userinfo.collection.findOne({ _id: { $in: idConditions } });
    if (!user) {
      return { code: 400, msg: '用户不存在' };
    }
    if (user.role === 'admin') {
      return { code: 400, msg: '不允许删除管理员账号' };
    }
    const { username, role } = user;
    await ctx.model.Userinfo.collection.deleteOne({ _id: user._id });
    if (ctx.model.UserAnalyticsEvent) {
      await ctx.model.UserAnalyticsEvent.deleteMany({
        $or: [{ userId: user._id }, { username }],
      });
    }

    const uploadDir = this.app.config.uploadDir;

    if (role === 'teacher') {
      await this._deleteChoiceGroupsForTeacher(undefined, username);
      const teacher = await ctx.model.Teacher.findOne({ teacherId: username });
      if (teacher && teacher.resumePath) {
        try {
          const absPath = await resolveExistingFileWithin(uploadDir, teacher.resumePath);
          if (absPath) {
            await fsp.unlink(absPath).catch(() => {});
          }
        } catch (e) {
          // ignore if file already removed
        }
      }
      await Promise.all([
        ctx.model.Teacher.deleteOne({ teacherId: username }),
        ctx.model.UserInActivity.deleteMany({ teacherId: username }),
        ctx.model.Final.deleteMany({ teacherId: username }),
        ctx.model.FinalReservation.deleteMany({ teacherId: username }),
        ctx.model.TeacherOperationLock.deleteMany({ teacherId: username }),
      ]);
    } else if (role === 'student') {
      const resume = await ctx.model.Resume.findOne({ studentId: username });
      if (resume && resume.filePath) {
        try {
          const absPath = await resolveExistingFileWithin(uploadDir, resume.filePath);
          if (absPath) {
            await fsp.unlink(absPath).catch(() => {});
          }
        } catch (e) {
          // ignore if file already removed
        }
      }
      await Promise.all([
        ctx.model.Student.deleteOne({ studentId: username }),
        ctx.model.Resume.deleteOne({ studentId: username }),
        ctx.model.UserInActivity.deleteMany({ studentId: username }),
        ctx.model.Choose.deleteMany({ studentId: username }),
        ctx.model.ChoiceSubmission.deleteMany({ studentId: username }),
        ctx.model.Final.deleteMany({ studentId: username }),
        ctx.model.FinalReservation.deleteMany({ studentId: username }),
      ]);
    }
    return { code: 200, msg: '用户删除成功' };
  }

  async addTeacherToActivity(activityId, teacherId = null, studentId = null) {
    const { ctx } = this;
    const query = { activityId };
    if (teacherId) query.teacherId = teacherId;
    if (studentId) query.studentId = studentId;
    const existing = await ctx.model.UserInActivity.findOne(query);
    if (existing) {
      return { code: 409, msg: '该用户已在活动中，请勿重复添加' };
    }
    await ctx.model.UserInActivity.create(query);
    return { code: 200, msg: '添加成功' };
  }

  async batchAddUserToActivity(activityId, users) {
    const { ctx } = this;
    let successCount = 0;
    let failCount = 0;
    for (const user of users) {
      const query = { activityId };
      if (user.teacherId) query.teacherId = user.teacherId;
      if (user.studentId) query.studentId = user.studentId;
      const existing = await ctx.model.UserInActivity.findOne(query);
      if (existing) {
        failCount++;
      } else {
        await ctx.model.UserInActivity.create(query);
        successCount++;
      }
    }
    return { successCount, failCount };
  }

  async getUserList() {
    const { ctx } = this;
    return await ctx.model.Userinfo.find({}, { password: 0 });
  }

  async getUserInfo(username, role) {
    const { ctx } = this;
    const query = {};
    if (username) query.username = { $regex: new RegExp(escapeRegExp(username), 'i') };
    if (role) query.role = role;
    return await ctx.model.Userinfo.find(query, { password: 0 });
  }

  async resetPassword(username, password) {
    const { ctx } = this;
    const res = await ctx.model.Userinfo.findOne({ username });
    if (!res) {
      return { code: 400, msg: '用户不存在' };
    }
    res.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await res.save();
    return { code: 200, msg: '密码重置成功' };
  }

  async resetSelectedPassword(selectedUsers, password) {
    const { ctx } = this;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await ctx.model.Userinfo.updateMany(
      { username: { $in: selectedUsers } },
      { password: passwordHash }
    );
    return { code: 200, msg: '批量密码重置成功' };
  }

  async getUserListInActivity(activityId, username, role) {
    const { ctx } = this;
    const activityIdStr = String(activityId);
    const query = { activityId: activityIdStr };
    const conditions = [];

    if (role) {
      if (role === 'teacher') {
        conditions.push({ teacherId: { $exists: true } });
      } else if (role === 'student') {
        conditions.push({ studentId: { $exists: true } });
      } else {
        conditions.push({ role });
      }
    } else {
      conditions.push({
        $or: [
          { teacherId: { $exists: true } },
          { studentId: { $exists: true } },
        ],
      });
    }

    if (username) {
      const escaped = escapeRegExp(String(username));
      conditions.push({
        $or: [
          { teacherId: { $regex: escaped, $options: 'i' } },
          { studentId: { $regex: escaped, $options: 'i' } },
        ],
      });
    }

    if (conditions.length > 0) {
      query.$and = conditions;
    }

    try {
      return await ctx.model.UserInActivity.find(query);
    } catch (error) {
      ctx.logger.error('getUserListInActivity 查询出错:', error);
      return [];
    }
  }

  async deleteUserInActivity(_id) {
    const { ctx } = this;
    const record = await ctx.model.UserInActivity.findById(_id);
    if (!record) {
      return { code: 400, msg: '记录不存在' };
    }
    await this._cleanupActivityMembership(record);
    await ctx.model.UserInActivity.deleteOne({ _id });
    return { code: 200, msg: '删除成功' };
  }

  async batchDeleteUserInActivity(ids) {
    let successCount = 0;
    for (const id of ids) {
      const result = await this.deleteUserInActivity(id);
      if (result.code === 200) {
        successCount++;
      }
    }
    return { successCount, failCount: ids.length - successCount };
  }

  async getSelectedList(studentId, activityId) {
    const { ctx } = this;
    const query = {};
    if (studentId) {
      query.studentId = { $regex: escapeRegExp(studentId), $options: 'i' };
    }
    if (activityId) {
      query.activityId = activityId;
    }
    return await ctx.model.Choose.find(query);
  }

  async deleteSelected(_id) {
    const { ctx } = this;
    const selected = await ctx.model.Choose.findById(_id);
    if (!selected) {
      return { code: 400, msg: '记录不存在' };
    }
    await Promise.all([
      ctx.model.Choose.deleteMany({
        activityId: selected.activityId,
        studentId: selected.studentId,
      }),
      ctx.model.ChoiceSubmission.deleteOne({
        activityId: selected.activityId,
        studentId: selected.studentId,
      }),
    ]);
    return { code: 200, msg: '整组志愿删除成功' };
  }

  async addFinal(activityId, studentId, teacherId) {
    const { ctx } = this;
    const activityKey = String(activityId);
    const ownerToken = await acquireTeacherLock(ctx.model, activityKey, teacherId);
    if (!ownerToken) {
      return { code: 409, msg: '导师录取操作正在处理中，请稍后重试' };
    }
    try {
      const [ activity, student, studentMembership, teacherMembership, existing ] = await Promise.all([
        ctx.model.Activity.findById(activityId),
        ctx.model.Student.findOne({ studentId }),
        ctx.model.UserInActivity.findOne({ activityId: activityKey, studentId }),
        ctx.model.UserInActivity.findOne({ activityId: activityKey, teacherId }),
        ctx.model.Final.findOne({ studentId, activityId: activityKey }),
      ]);
      if (!activity) {
        return { code: 404, msg: '活动不存在' };
      }
      if (!student || !studentMembership || !teacherMembership) {
        return { code: 400, msg: '导师或学生不属于此活动' };
      }
      if (existing) {
        return { code: 409, msg: '该学生在此活动中已有录取记录' };
      }
      const quota = Number(teacherMembership.maxSelectNum);
      if (!Number.isInteger(quota) || quota < 1) {
        return { code: 409, msg: '导师名额尚未配置' };
      }
      const selectedCount = await ctx.model.Final.countDocuments({
        activityId: activityKey,
        teacherId,
      });
      if (selectedCount >= quota) {
        return { code: 409, msg: '已达到最大选择人数限制' };
      }

      const now = new Date();
      const lockUntil = new Date(now.getTime() + FINAL_RESERVATION_MS);
      let reservation;
      let ownsReservation = false;
      try {
        reservation = await ctx.model.FinalReservation.create({
          activityId: activityKey,
          lockUntil,
          ownerToken,
          status: 'processing',
          studentId,
          teacherId,
          updatedAt: now,
        });
        ownsReservation = true;
      } catch (error) {
        if (!isDuplicateKeyError(error)) {
          throw error;
        }
        reservation = await ctx.model.FinalReservation.findOne({
          activityId: activityKey,
          studentId,
        });
      }
      if (!ownsReservation) {
        if (!reservation || reservation.status === 'committed') {
          return { code: 409, msg: '该学生在此活动中已有录取记录' };
        }
        if (!reservation.lockUntil || new Date(reservation.lockUntil) > now) {
          return { code: 409, msg: '该学生录取正在处理中，请稍后重试' };
        }
        reservation = await ctx.model.FinalReservation.findOneAndUpdate(
          {
            _id: reservation._id,
            lockUntil: reservation.lockUntil,
            status: 'processing',
          },
          {
            $set: {
              lockUntil,
              ownerToken,
              teacherId,
              updatedAt: now,
            },
          },
          { new: true }
        );
        ownsReservation = Boolean(reservation);
        if (!ownsReservation) {
          return { code: 409, msg: '该学生录取正在处理中，请稍后重试' };
        }
      }

      let createdFinal = false;
      try {
        await ctx.model.Final.create({
          activityId: activityKey,
          data: student.data || {},
          order: 0,
          studentId,
          teacherId,
        });
        createdFinal = true;
        const committed = await ctx.model.FinalReservation.updateOne(
          {
            _id: reservation._id,
            ownerToken,
            status: 'processing',
          },
          {
            $set: {
              lockUntil: now,
              ownerToken: '',
              status: 'committed',
              updatedAt: new Date(),
            },
          }
        );
        if (committed.modifiedCount !== 1) {
          throw new Error('admin final reservation ownership lost');
        }
        return { code: 201, msg: '录取记录添加成功' };
      } catch (error) {
        if (createdFinal) {
          await ctx.model.Final.deleteOne({
            activityId: activityKey,
            studentId,
            teacherId,
          });
        }
        if (ownsReservation) {
          await ctx.model.FinalReservation.deleteOne({
            _id: reservation._id,
            ownerToken,
          });
        }
        throw error;
      }
    } finally {
      await releaseTeacherLock(
        ctx.model,
        activityKey,
        teacherId,
        ownerToken
      ).catch(error => {
        ctx.logger.error('release admin final lock failed:', error);
      });
    }
  }

  async getFinalList(studentId, teacherId, activityId) {
    const { ctx } = this;
    const query = {};
    if (studentId) {
      query.studentId = { $regex: escapeRegExp(studentId), $options: 'i' };
    }
    if (teacherId) {
      query.teacherId = teacherId;
    }
    if (activityId) {
      query.activityId = activityId;
    }
    return await ctx.model.Final.find(query);
  }

  async getTeacherListInActivity(activityId) {
    const { ctx } = this;
    const query = { teacherId: { $exists: true } };
    if (activityId) {
      query.activityId = activityId;
    }
    const userInActivityList = await ctx.model.UserInActivity.find(query);
    const teacherIds = userInActivityList.map(item => item.teacherId);
    return await ctx.model.Teacher.find({ teacherId: { $in: teacherIds } });
  }

  async getStudentListInActivity(activityId) {
    const { ctx } = this;
    const query = { studentId: { $exists: true } };
    if (activityId) {
      query.activityId = activityId;
    }
    const userInActivityList = await ctx.model.UserInActivity.find(query);
    const studentIds = userInActivityList.map(item => item.studentId);
    return await ctx.model.Student.find({ studentId: { $in: studentIds } });
  }

  async resetVolunteer(activityId, studentId) {
    const { ctx } = this;
    await Promise.all([
      ctx.model.Choose.deleteMany({ activityId, studentId }),
      ctx.model.ChoiceSubmission.deleteOne({ activityId, studentId }),
    ]);
    return { code: 200, msg: '志愿重置成功' };
  }

  async configMaxSelectNum(activityId, teacherId, maxSelectNum) {
    const { ctx } = this;
    await ctx.model.UserInActivity.updateOne(
      { activityId, teacherId },
      { maxSelectNum }
    );
    return { code: 200, msg: '配置成功' };
  }

  async batchConfigMaxSelectNum(activityId, maxSelectNum) {
    const { ctx } = this;
    const result = await ctx.model.UserInActivity.updateMany(
      { activityId, teacherId: { $exists: true, $ne: null } },
      { maxSelectNum }
    );
    return { code: 200, msg: '批量配置成功', modifiedCount: result.modifiedCount };
  }

  async getMaxSelectNum(activityId, teacherId) {
    const { ctx } = this;
    return await ctx.model.UserInActivity.findOne({ activityId, teacherId });
  }

  async getFinalChoose(studentId, activityId) {
    const { ctx } = this;
    const res = await ctx.model.Final.findOne({ studentId, activityId });
    return res || {};
  }

  async uploadTeacherResume(teacherId, resumeName, resumePath) {
    const { ctx } = this;
    const uploadDir = this.app.config.uploadDir;

    if (!teacherId || !resumeName || !resumePath) {
      return { code: 400, msg: '缺少必要参数' };
    }

    const teacher = await ctx.model.Teacher.findOne({ teacherId });
    if (!teacher) {
      return { code: 404, msg: '老师不存在' };
    }

    if (teacher.resumePath && teacher.resumePath !== resumePath) {
      try {
        const oldFilePath = await resolveExistingFileWithin(uploadDir, teacher.resumePath);
        if (oldFilePath) {
          await fsp.unlink(oldFilePath).catch(() => {});
        }
      } catch (fileError) {
        ctx.logger.warn('删除旧简历文件失败:', fileError.message);
      }
    }

    const updatedTeacher = await ctx.model.Teacher.findOneAndUpdate(
      { teacherId },
      { resumeName, resumePath },
      { new: true }
    );

    if (!updatedTeacher) {
      return { code: 404, msg: '老师信息不存在或已被删除' };
    }

    return { code: 200, msg: '老师简历已上传' };
  }

  async getTeacherResume(teacherId) {
    const { ctx } = this;
    const uploadDir = this.app.config.uploadDir;

    if (!teacherId) {
      return { code: 400, msg: '教师ID不能为空' };
    }

    const teacher = await ctx.model.Teacher.findOne({ teacherId });
    if (!teacher) {
      return { code: 404, msg: '老师不存在' };
    }

    if (!teacher.resumePath) {
      return { code: 404, msg: '老师未上传简历' };
    }

    const filePath = await resolveExistingFileWithin(uploadDir, teacher.resumePath);
    if (!filePath) {
      return { code: 404, msg: '简历文件不存在' };
    }

    const fileContent = await fsp.readFile(filePath);
    const ext = path.extname(teacher.resumePath).toLowerCase();
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
      msg: '获取成功',
      resumeName: teacher.resumeName,
      contentType: contentTypeMap[ext] || 'application/octet-stream',
      fileContent,
    };
  }
}

module.exports = AdminService;
