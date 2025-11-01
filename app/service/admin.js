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
    // 上传老师简历（支持multipart/form-data）
    // 管理员上传老师简历（服务层方法）
    async uploadTeacherResume(teacherId, resumeName, resumePath) {
        const { ctx } = this;
        const fs = require('fs');
        const path = require('path');
        
        try {
            // 验证参数
            if (!teacherId || !resumeName || !resumePath) {
                ctx.logger.error('上传简历失败：缺少必要参数', { teacherId, resumeName, resumePath });
                return { code: 400, msg: '缺少必要参数', details: { teacherId, resumeName, resumePath } };
            }
            
            // 查找老师信息
            ctx.logger.info(`查询教师信息: ${teacherId}`);
            let teacher;
            try {
                teacher = await ctx.model.Teacher.findOne({ teacherId });
                if (!teacher) {
                    ctx.logger.warn(`尝试为不存在的教师 ${teacherId} 上传简历`);
                    return { code: 404, msg: '老师不存在', details: { teacherId } };
                }
            } catch (dbError) {
                console.error('数据库查询失败:', dbError);
                ctx.logger.error('数据库查询失败:', { 
                    error: dbError.message,
                    stack: dbError.stack,
                    teacherId: teacherId 
                });
                return { 
                    code: 500, 
                    msg: '数据库查询失败', 
                    error: dbError.message
                };
            }
            
            ctx.logger.info(`找到教师信息: ${teacherId}, 姓名: ${teacher.name || '未知'}`);
            
            // 检查是否已存在简历，如果存在可以选择删除旧文件
            if (teacher.resumePath && teacher.resumePath !== resumePath) {
                ctx.logger.info(`检测到教师 ${teacherId} 存在旧简历，准备删除: ${teacher.resumePath}`);
                try {
                    // 标准化路径处理，适应Linux环境
                    let oldResumePath = teacher.resumePath;
                    // 移除开头的/以便正确拼接路径
                    if (oldResumePath.startsWith('/')) {
                        oldResumePath = oldResumePath.substring(1);
                    }
                    
                    // 使用path.normalize确保路径格式正确，避免路径分隔符问题
                    const oldFilePath = path.normalize(path.join(__dirname, '..', oldResumePath));
                    ctx.logger.info(`构建的旧文件完整路径: ${oldFilePath}`);
                    
                    // 验证文件路径安全性，防止路径遍历攻击
                    const expectedBasePath = path.normalize(path.join(__dirname, '..', 'public'));
                    if (!oldFilePath.startsWith(expectedBasePath)) {
                        ctx.logger.error('文件路径安全检查失败，可能存在路径遍历攻击风险:', oldFilePath);
                        throw new Error('文件路径无效');
                    }
                    
                    if (fs.existsSync(oldFilePath)) {
                        // 检查文件权限
                        try {
                            fs.accessSync(oldFilePath, fs.constants.W_OK);
                            fs.unlinkSync(oldFilePath);
                            ctx.logger.info(`成功删除旧简历文件: ${oldFilePath}`);
                        } catch (permError) {
                            ctx.logger.error('文件权限不足，无法删除:', { 
                                error: permError.message,
                                filePath: oldFilePath 
                            });
                            // 权限不足不阻止后续操作，只记录警告
                        }
                    } else {
                        ctx.logger.warn(`旧简历文件不存在: ${oldFilePath}`);
                    }
                } catch (fileError) {
                    console.error('删除旧简历文件失败:', fileError);
                    // 文件删除失败不影响主流程，仅记录详细错误日志
                    ctx.logger.error('删除旧简历文件失败:', { 
                        error: fileError.message,
                        stack: fileError.stack,
                        oldFilePath: teacher.resumePath 
                    });
                }
            }
            
            // 更新简历信息
            ctx.logger.info(`更新教师 ${teacherId} 的简历信息`);
            teacher.resumeName = resumeName;
            teacher.resumePath = resumePath;
            
            try {
                // 添加保存前的日志记录，包含完整的teacher对象信息
                ctx.logger.info(`准备保存教师简历信息 - 完整教师对象:`, {
                    teacherId: teacher.teacherId,
                    name: teacher.name,
                    resumeName: teacher.resumeName,
                    resumePath: teacher.resumePath,
                    documentStructure: Object.keys(teacher.toObject())
                });
                
                // 尝试保存数据 - 使用findOneAndUpdate替代直接save，更好地处理并发情况
                ctx.logger.info(`准备更新教师 ${teacherId} 的简历信息到数据库`);
                const updatedTeacher = await ctx.model.Teacher.findOneAndUpdate(
                    { teacherId: teacherId },
                    { resumeName: resumeName, resumePath: resumePath },
                    { new: true, upsert: false }
                );
                
                if (!updatedTeacher) {
                    ctx.logger.error(`教师 ${teacherId} 文档不存在或已被删除，无法保存简历`);
                    return { 
                        code: 404, 
                        msg: '老师信息不存在或已被删除', 
                        details: { teacherId } 
                    };
                }
                
                ctx.logger.info(`成功为教师 ${teacherId} 上传并保存简历: ${resumeName}`);
                return { 
                    code: 200, 
                    msg: '老师简历已上传', 
                    data: { 
                        teacherId: updatedTeacher.teacherId,
                        name: updatedTeacher.name,
                        resumeName: updatedTeacher.resumeName,
                        resumePath: updatedTeacher.resumePath
                    } 
                };
            } catch (saveError) {
                console.error('【数据库保存错误】:', saveError);
                // 针对数据库保存失败的详细处理，增强错误信息捕获
                ctx.logger.error('保存教师简历信息失败:', { 
                    error: saveError.message,
                    stack: saveError.stack,
                    teacherId: teacherId,
                    validationErrors: saveError.errors ? Object.keys(saveError.errors).map(key => ({
                        field: key,
                        message: saveError.errors[key].message,
                        kind: saveError.errors[key].kind
                    })) : null,
                    errorName: saveError.name,
                    errorCode: saveError.code,
                    errorStackSummary: saveError.stack ? saveError.stack.split('\n')[0] : null,
                    isTimeoutError: saveError.message.includes('timeout') || saveError.name.includes('Timeout'),
                    isConnectionError: saveError.name === 'MongoError' && saveError.code === 51,
                    hasMongoError: saveError.name === 'MongoError',
                    hasNetworkError: saveError.message.includes('network') || saveError.code === 'ECONNREFUSED',
                    hasDiskSpaceError: saveError.message.includes('No space left') || saveError.message.includes('ENOSPC'),
                    hasTimeoutError: saveError.message.includes('timeout') || saveError.name.includes('Timeout'),
                    nodeEnv: process.env.NODE_ENV,
                    currentPath: __dirname
                });
                
                // 根据不同错误类型返回更具体的错误信息
                let detailedMsg = '保存简历信息失败';
                let errorDetails = {};
                
                if (saveError.name === 'ValidationError') {
                    detailedMsg += '：数据验证失败';
                    if (saveError.errors) {
                        errorDetails.validationErrors = Object.keys(saveError.errors).reduce((acc, key) => {
                            acc[key] = {
                                message: saveError.errors[key].message,
                                value: saveError.errors[key].value,
                                kind: saveError.errors[key].kind
                            };
                            return acc;
                        }, {});
                    }
                } else if (saveError.name === 'MongoError') {
                    detailedMsg += `：数据库操作失败，错误码: ${saveError.code}`;
                    errorDetails.mongoCode = saveError.code;
                    if (saveError.code === 51) {
                        detailedMsg += '（数据库连接错误）';
                        errorDetails.connectionIssue = true;
                    } else if (saveError.code === 11000) {
                        detailedMsg += '（重复键错误）';
                        errorDetails.duplicateKey = true;
                    }
                } else if (saveError.name === 'MongooseError') {
                    detailedMsg += '：Mongoose操作失败';
                } else if (saveError.code === 'ECONNREFUSED') {
                    detailedMsg += '：数据库连接被拒绝';
                    errorDetails.connectionRefused = true;
                } else if (saveError.message.includes('No space left') || saveError.message.includes('ENOSPC')) {
                    detailedMsg += '：磁盘空间不足';
                    errorDetails.diskSpaceError = true;
                } else {
                    // 未知错误类型的默认处理
                    detailedMsg += `：未知错误，类型: ${saveError.name}`;
                    errorDetails.unknownError = true;
                    errorDetails.originalMessage = saveError.message;
                }
                
                return { 
                    code: 500, 
                    msg: detailedMsg, 
                    errorType: saveError.name,
                    errorCode: saveError.code,
                    errorDetails: errorDetails,
                    context: {
                        teacherId: teacherId,
                        resumeName: resumeName,
                        environment: process.env.NODE_ENV
                    },
                    // 根据环境决定是否返回堆栈信息
                    stack: process.env.NODE_ENV === 'production' ? undefined : saveError.stack
                };
            }
        } catch (error) {
            console.error('【上传简历未预期错误】:', error);
            // 捕获所有其他未预期的错误，并记录详细信息
            ctx.logger.error('上传老师简历过程中发生未预期错误:', { 
                error: error.message,
                stack: error.stack,
                requestParams: { teacherId, resumeName, resumePath },
                errorType: error.name,
                errorCode: error.code
            });
            return { 
                code: 500, 
                msg: '服务器错误', 
                errorType: error.name,
                errorCode: error.code,
                errorMessage: error.message,
                details: process.env.NODE_ENV === 'production' ? undefined : error.stack,
                timestamp: new Date().toISOString()
            };
        }
    }
    //查询某位老师简历并返回文件内容
    async getTeacherResume(teacherId) {
        const { ctx } = this;
        const fs = require('fs');
        const path = require('path');
        
        try {
            // 验证teacherId参数
            if (!teacherId) {
                return { code: 400, msg: '教师ID不能为空' };
            }
            
            // 查询教师信息
            const teacher = await ctx.model.Teacher.findOne({ teacherId });
            
            if (!teacher) {
                return { code: 404, msg: '老师不存在' };
            }
            
            // 检查是否有简历路径
            if (!teacher.resumePath) {
                return { code: 404, msg: '老师未上传简历' };
            }
            
            // 构建文件的完整路径
            // 注意：这里假设teacher.resumePath是类似'/public/uploads/filename.pdf'的格式
            const filePath = path.join(__dirname, '..', teacher.resumePath.substring(1));
            
            // 检查文件是否存在
            if (!fs.existsSync(filePath)) {
                return { code: 404, msg: '简历文件不存在' };
            }
            
            // 读取文件内容
            const fileContent = fs.readFileSync(filePath);
            
            // 根据文件扩展名设置content-type
            const fileExtension = path.extname(teacher.resumePath).toLowerCase();
            let contentType = 'application/octet-stream'; // 默认二进制流
            
            // 设置常见文件类型的content-type
            const contentTypeMap = {
                '.pdf': 'application/pdf',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.txt': 'text/plain'
            };
            
            if (contentTypeMap[fileExtension]) {
                contentType = contentTypeMap[fileExtension];
            }
            
            ctx.logger.info(`成功获取教师 ${teacherId} 的简历文件: ${teacher.resumeName}`);
            
            // 返回文件信息和内容
            return {
                code: 200,
                msg: '获取成功',
                resumeName: teacher.resumeName,
                contentType: contentType,
                fileContent: fileContent
            };
        } catch (error) {
            ctx.logger.error('获取老师简历文件失败:', error);
            return { code: 500, msg: '服务器错误', error: error.message };
        }
    }
}

module.exports = AdminService;
