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
    async addTeacherToActivity(activityId, teacherId) {
        const { ctx } = this;
        // //先查询活动是否存在
        // const activity = await ctx.model.Activity.findById(activityId);
        // if (!activity) {
        //     return { code: 400, msg: '活动不存在' };
        // }
        // //再查询老师是否存在
        // const teacher = await ctx.model.Teacher.findById(teacherId);
        // if (!teacher) {
        //     return { code: 400, msg: '老师不存在' };
        // }
        const res = await ctx.model.UserInActivity.create({ activityId: activityId, teacherId: teacherId });
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
}

module.exports = AdminService;
