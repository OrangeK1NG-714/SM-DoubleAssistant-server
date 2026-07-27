'use strict';

const Service = require('egg').Service;
const fsp = require('node:fs').promises;
const path = require('node:path');

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

  async selectTeacher(studentId, teacherId, order, isChose, activityId, subscribeTemplateId = '', subscribeStatus = '') {
    const activity = await this.ctx.model.Activity.findById(activityId);
    if (!activity) {
      return { code: 404, msg: '活动不存在' };
    }
    const now = new Date();
    const startDate = new Date(activity.stdChooseStartDate);
    const endDate = new Date(activity.stdChooseEndDate);
    if (now < startDate || now > endDate) {
      return { code: 400, msg: '不在选老师时间内' };
    }
    const existing = await this.ctx.model.Choose.findOne({ studentId, activityId, order });
    if (existing) {
      return { code: 409, msg: `第${order}志愿已提交，请勿重复选择` };
    }
    const choose = await this.ctx.model.Choose.create({
      studentId,
      teacherId,
      order,
      isChose,
      activityId,
      createTime: now,
      subscribeTemplateId,
      subscribeStatus,
    });
    return { code: 200, msg: '学生选老师选项已添加', data: choose };
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
      return { code: 500, msg: error.message || '服务器错误' };
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
          const oldFilePath = path.normalize(path.join(uploadDir, existing.filePath));
          if (oldFilePath.startsWith(path.normalize(uploadDir))) {
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
    const filePath = path.join(uploadDir, resume.filePath);
    try {
      await fsp.access(filePath);
    } catch {
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
