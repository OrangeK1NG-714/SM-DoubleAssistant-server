'use strict';

const Service = require('egg').Service;
const crypto = require('crypto')
class AdminService extends Service {
    async addActivity(name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate, secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate, stdChooseStartDate, stdChooseEndDate, firstChooseCount, secondChooseCount, thirdChooseCount, stdChooseCount) {
        const { ctx } = this;
        const res = await ctx.model.Activity.create({ name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate, secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate, stdChooseStartDate, stdChooseEndDate, firstChooseCount, secondChooseCount, thirdChooseCount, stdChooseCount });
        return res;
    }
    async getActivityList() {
        const { ctx } = this;
        const res = await ctx.model.Activity.find();
        return res;
    }
    //获取某一活动详情
    async getActivityDetail(id) {
        const { ctx } = this;
        const res = await ctx.model.Activity.findById(id);
        return res;
    }

    async updateActivity(_id, name, description, startDate, endDate, firstChooseStartDate, firstChooseEndDate, secondChooseStartDate, secondChooseEndDate, thirdChooseStartDate, thirdChooseEndDate, stdChooseStartDate, stdChooseEndDate) {
        const { ctx } = this;
        const res = await ctx.model.Activity.findByIdAndUpdate(_id,
            {
                name,
                description,
                startDate,
                endDate,
                firstChooseStartDate,
                firstChooseEndDate,
                secondChooseStartDate,
                secondChooseEndDate,
                thirdChooseStartDate,
                thirdChooseEndDate,
                stdChooseStartDate,
                stdChooseEndDate
            });
        if (!res) {
            return { code: 400, msg: '活动不存在' };
        }
        return res;
    }
    async deleteActivity(id) {
        const { ctx } = this;
        const res = await ctx.model.Activity.findByIdAndDelete(id);
        return res;
    }
    async addTeacherToActivity(activityId, teacherId = null, studentId = null) {
        const { ctx } = this;

        const data = { activityId };
        if (teacherId) data.teacherId = teacherId;
        if (studentId) data.studentId = studentId;

        const res = await ctx.model.UserInActivity.create(data);
        return res;
    }

    async getUserList() {
        const { ctx } = this;
        const res = await ctx.model.Userinfo.find();
        // console.log(res);

        return res;
    }

    //查询用户信息
    async getUserInfo(username, role) {
        const { ctx } = this;
        const query = {};

        // 添加条件查询
        if (username) query.username = { $regex: new RegExp(username, 'i') };
        if (role) query.role = role;

        const res = await ctx.model.Userinfo.find(query);
        return res
    }
    //重置密码
    async resetPassword(username, password) {
        const { ctx } = this;
        const res = await ctx.model.Userinfo.findOne({ username });
        if (!res) {
            return { code: 400, msg: '用户不存在' };
        }
        //创建哈希对象
        const hash = crypto.createHash('sha256').update(password)
        //生成哈希值
        const passwordHash = hash.digest('hex')
        res.password = passwordHash;
        await res.save();
        return { code: 200, msg: '密码重置成功' };
    }
    //重置选中用户密码
    async resetSelectedPassword(selectedUsers, password) {
        const { ctx } = this;
        //创建哈希对象
        const hash = crypto.createHash('sha256').update(password)
        //生成哈希值
        const passwordHash = hash.digest('hex')
        const res = await ctx.model.Userinfo.updateMany({ username: { $in: selectedUsers } }, { password: passwordHash });
        return res;
    }




    //查询某活动的所有用户
    //查询某活动的所有用户
    async getUserListInActivity(activityId, username, role) {
        const { ctx } = this;
        // 确保activityId是字符串
        const activityIdStr = String(activityId);
        // 基础查询条件
        const query = {
            activityId: activityIdStr
        };

        // 创建一个数组来存储所有的查询条件
        const conditions = [];

        // 处理role参数
        if (role) {
            console.log('处理role参数:', role);
            if (role === 'teacher') {
                conditions.push({ teacherId: { $exists: true } });
            } else if (role === 'student') {
                conditions.push({ studentId: { $exists: true } });
            } else {
                conditions.push({ role: role });
            }
        } else {
            // 如果没有指定role，默认查询有teacherId或studentId的记录
            conditions.push({
                $or: [
                    { teacherId: { $exists: true } },
                    { studentId: { $exists: true } }
                ]
            });
        }
        // 处理username参数 - 在teacherId和studentId字段中都进行模糊查询
        if (username) {
            // 确保username是字符串
            const usernameStr = String(username);
            // 添加username模糊查询条件
            conditions.push({
                $or: [
                    { teacherId: { $regex: usernameStr, $options: 'i' } },
                    { studentId: { $regex: usernameStr, $options: 'i' } }
                ]
            });
        }

        // 如果有多个条件，使用$and操作符组合它们
        if (conditions.length > 0) {
            query.$and = conditions;
        }

        console.log('最终查询条件:', JSON.stringify(query));
        try {
            const res = await ctx.model.UserInActivity.find(query);
            console.log('查询结果数量:', res.length);
            console.log('查询结果:', res);
            return res;
        } catch (error) {
            console.error('查询出错:', error);
            return [];
        }
    }

    //删除某活动的某一用户
    async deleteUserInActivity(_id) {
        const { ctx } = this;
        const res = await ctx.model.UserInActivity.findByIdAndDelete(_id);
        return res;
    }
    //查询选择志愿列表
    async getSelectedList(studentId, activityId) {
        const { ctx } = this;
        const query = {};
        if (studentId) {
            // 使用正则表达式进行模糊查询，不区分大小写
            query.studentId = { $regex: studentId, $options: 'i' };
        }
        if (activityId) {
            query.activityId = activityId;
        }
        const res = await ctx.model.Choose.find(query);
        return res;
    }
    //删除某项选择志愿
    async deleteSelected(_id) {
        const { ctx } = this;
        const res = await ctx.model.Choose.findByIdAndDelete(_id);
        return res;
    }

    //查询最终志愿
    async getFinalList(studentId, teacherId, activityId) {
        const { ctx } = this;
        const query = {};
        if (studentId) {
            query.studentId = { $regex: studentId, $options: 'i' };
        }
        if (teacherId) {
            query.teacherId = teacherId;
        }
        if (activityId) {
            query.activityId = activityId;
        }
        const res = await ctx.model.Final.find(query);
        return res;
    }

    //查询某活动的所有导师
    async getTeacherListInActivity(activityId) {
        const { ctx } = this;
        const query = { teacherId: { $exists: true } };
        if (activityId) {
            query.activityId = activityId;
        }
        // 先查询 UserInActivity 表
        const userInActivityList = await ctx.model.UserInActivity.find(query);
        console.log('userInActivityList:', userInActivityList);
        // 提取 teacherId
        const teacherIds = userInActivityList.map(item => item.teacherId);
        console.log('teacherIds:', teacherIds);
        // 再查询 Teacher 表
        const teachers = await ctx.model.Teacher.find({
            teacherId: { $in: teacherIds }
        });
        return teachers;
    }

    //查询某活动的所有学生
    async getStudentListInActivity(activityId) {
        const { ctx } = this;
        const query = { studentId: { $exists: true } };
        if (activityId) {
            query.activityId = activityId;
        }
        // 先查询 UserInActivity 表
        const userInActivityList = await ctx.model.UserInActivity.find(query);
        console.log('userInActivityList:', userInActivityList);
        // 提取 studentId
        const studentIds = userInActivityList.map(item => item.studentId);
        console.log('studentIds:', studentIds);
        // 再查询 Student 表
        const students = await ctx.model.Student.find({
            studentId: { $in: studentIds }
        });
        return students;
    }

    //重置志愿
    async resetVolunteer(activityId, studentId) {
        const { ctx } = this;
        const res = await ctx.model.Choose.deleteMany({
            activityId: activityId,
            studentId: studentId
        });
        return res;
    }

    //配置一个活动中某位老师最大可选学生数
    async configMaxSelectNum(activityId, teacherId, maxSelectNum) {
        const { ctx } = this;
        const res = await ctx.model.UserInActivity.updateOne({
            activityId: activityId,
            teacherId: teacherId
        }, {
            maxSelectNum: maxSelectNum
        });
        return res;
    }
    //查询一个活动中某位老师最大可选学生数
    async getMaxSelectNum(activityId, teacherId) {
        const { ctx } = this;
        const res = await ctx.model.UserInActivity.findOne({
            activityId: activityId,
            teacherId: teacherId
        });
        return res;
    }
    //查询学生的最终志愿
    async getFinalChoose(studentId, activityId) {
        const { ctx } = this;
        const res = await ctx.model.Final.findOne({
            studentId: studentId,
            activityId: activityId
        });
        return res||{};
    }
}

module.exports = AdminService;
