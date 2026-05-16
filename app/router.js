module.exports = app => {
  const { router, controller } = app;

  // 用户认证
  router.post('/api/admin/register', app.middleware.jwt({ requiredRole: 'admin' }), controller.userinfo.userRegister)
  router.post('/api/user/login', controller.userinfo.userLogin)
  router.post('/api/user/selfResetPassword', controller.userinfo.selfResetPassword)
  router.post('/api/user/refreshToken', controller.userinfo.refreshToken)
  router.get('/api/user/detail', app.middleware.jwt(), controller.userinfo.getUserDetail)
  router.get('/api/user/getMyActivities', app.middleware.jwt(), controller.userinfo.getMyActivities)

  // 学生信息
  router.post('/api/user/writeMsg', app.middleware.jwt(), controller.stdinfo.writeUserMsg)
  router.put('/api/user/updateMsg', app.middleware.jwt(), controller.stdinfo.updateUserMsg)
  router.get('/api/student/getMsg', app.middleware.jwt(), controller.stdinfo.getStudentMsg)

  // 教师信息
  router.get('/api/teacher/detail', app.middleware.jwt(), controller.teainfo.getTeaDetail)

  // 学生选老师
  router.post('/api/student/selectTeacher', app.middleware.jwt(), controller.stdinfo.selectTeacher)
  router.get('/api/student/getTeachersForActivity', app.middleware.jwt(), controller.stdinfo.getTeachersForActivity)
  router.get('/api/student/getTeacherList', app.middleware.jwt(), controller.stdinfo.getTeacherListInActivity)
  router.get('/api/student/isInActivity', app.middleware.jwt(), controller.stdinfo.isInActivity)
  router.post('/api/student/saveOpenid', app.middleware.jwt(), controller.stdinfo.saveOpenid)
  router.post('/api/student/uploadResume', app.middleware.jwt(), controller.stdinfo.uploadResume)

  // 老师选学生
  router.put('/api/student/updateTeacher', app.middleware.jwt(), controller.teainfo.updateChoose)
  router.post('/api/teacher/selectStudent', app.middleware.jwt(), controller.teainfo.selectStudent)
  router.delete('/api/teacher/cancelSelect', app.middleware.jwt(), controller.teainfo.cancelSelect)
  router.get('/api/teacher/getSelectList', app.middleware.jwt(), controller.teainfo.getSelectList)
  router.get('/api/teacher/getChooseStudents', app.middleware.jwt(), controller.teainfo.getChooseStudents)
  router.get('/api/teacher/getChoosePageData', app.middleware.jwt(), controller.teainfo.getChoosePageData)
  router.post('/api/teacher/selectStudentAndUpdate', app.middleware.jwt(), controller.teainfo.selectStudentAndUpdate)
  router.post('/api/teacher/cancelSelectAndUpdate', app.middleware.jwt(), controller.teainfo.cancelSelectAndUpdate)
  router.get('/api/teacher/isInActivity', app.middleware.jwt(), controller.teainfo.isInActivity)

  // 选择查询
  router.get('/api/user/getChooseList', app.middleware.jwt(), controller.userinfo.getChooseList)
  router.get('/api/user/getChooseDetail', app.middleware.jwt(), controller.userinfo.getChooseDetail)
  router.get('/api/user/getChooseCount', app.middleware.jwt(), controller.userinfo.getChooseCount)
  router.get('/api/user/getMaxSelectNum', app.middleware.jwt(), controller.admin.getMaxSelectNum)
  router.get('/api/admin/getFinalChoose', app.middleware.jwt(), controller.admin.getFinalChoose)

  // 管理端 - 活动管理
  router.post('/api/admin/addActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.addActivity)
  router.get('/api/admin/getActivityList', app.middleware.jwt(), controller.admin.getActivityList)
  router.get('/api/admin/getActivityDetail', app.middleware.jwt(), controller.admin.getActivityDetail)
  router.put('/api/admin/updateActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.updateActivity)
  router.delete('/api/admin/deleteActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.deleteActivity)

  // 管理端 - 用户管理
  router.get('/api/admin/getUserList', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.getUserList)
  router.get('/api/admin/getUserInfo', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.getUserInfo)
  router.post('/api/admin/resetPassword', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.resetPassword)
  router.post('/api/admin/resetSelectedPassword', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.resetSelectedPassword)

  // 管理端 - 活动用户
  router.post('/api/admin/addTeacherToActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.addTeacherToActivity)
  router.post('/api/admin/batchAddUserToActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.batchAddUserToActivity)
  router.get('/api/admin/getUserListInActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.getUserListInActivity)
  router.delete('/api/admin/deleteUserInActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.deleteUserInActivity)
  router.post('/api/admin/batchDeleteUserInActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.batchDeleteUserInActivity)
  router.get('/api/admin/getTeacherListInActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.getTeacherListInActivity)
  router.get('/api/admin/getStudentListInActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.getStudentListInActivity)

  // 管理端 - 志愿管理
  router.get('/api/admin/getSelectedList', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.getSelectedList)
  router.delete('/api/admin/deleteSelected', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.deleteSelected)
  router.get('/api/admin/getFinalList', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.getFinalList)
  router.delete('/api/admin/resetVolunteer', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.resetVolunteer)

  // 管理端 - 配额配置
  router.put('/api/admin/configMaxSelectNum', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.configMaxSelectNum)
  router.put('/api/admin/batchConfigMaxSelectNum', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.batchConfigMaxSelectNum)

  // 管理端 - 教师简历
  router.post('/api/teacher/uploadTeacherResume', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.uploadTeacherResume)
  router.get('/api/teacher/getTeacherResume', app.middleware.jwt(), controller.admin.getTeacherResume)

  // AI 推荐导师
  router.get('/api/student/recommendTeachers', app.middleware.jwt(), controller.ai.recommendTeachers)
};