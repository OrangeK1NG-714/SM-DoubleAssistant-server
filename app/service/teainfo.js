'use strict';

const Service = require('egg').Service;

class TeainfoService extends Service {
  async getTeaDetail() {
    const data = await this.ctx.model.Teacher.find();
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

  async selectStudentAndUpdate(studentId, teacherId, activityId, data, order) {
    const existing = await this.ctx.model.Final.findOne({ studentId, teacherId, activityId });
    if (existing) {
      return { code: 409, msg: '该学生已被选择，请勿重复操作' };
    }
    const choose = await this.ctx.model.Choose.findOne({ studentId, teacherId, activityId });
    if (!choose) {
      return { code: 404, msg: '选择记录不存在' };
    }
    const final = await this.ctx.model.Final.create({ studentId, teacherId, activityId, data, order });
    await this.ctx.model.Choose.findOneAndUpdate(
      { studentId, teacherId, activityId },
      { isChose: true }
    );
    return { code: 200, msg: '老师已选学生', data: final };
  }

  async cancelSelectAndUpdate(studentId, teacherId, activityId) {
    const choose = await this.ctx.model.Choose.findOne({ studentId, teacherId, activityId });
    if (!choose) {
      return { code: 404, msg: '选择记录不存在' };
    }
    await this.ctx.model.Final.deleteOne({ studentId, teacherId, activityId });
    await this.ctx.model.Choose.findOneAndUpdate(
      { studentId, teacherId, activityId },
      { isChose: false }
    );
    return { code: 200, msg: '老师取消选择学生' };
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
    const resumeMap = new Map(resumes.map(r => [ r.studentId, { resumeName: r.fileName, resumePath: r.filePath }]));

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
