/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;

  // SSE路由
  router.get('/resource/sse', app.middleware.jwt(), controller.sse.index); // 确保路径匹配

  //注册用户
  router.post('/api/admin/register', app.middleware.jwt({ requiredRole: 'admin' }), controller.userinfo.userRegister)
  //登录用户
  router.post('/api/user/login', controller.userinfo.userLogin)
  //用户自助修改密码（需验证旧密码，无需登录token）
  router.post('/api/user/selfResetPassword', controller.userinfo.selfResetPassword)
  //刷新token
  router.post('/api/user/refreshToken', controller.userinfo.refreshToken)
  //获取用户信息
  router.get('/api/user/detail',app.middleware.jwt(), controller.userinfo.getUserDetail);
  //获取当前用户参与的所有活动
  router.get('/api/user/getMyActivities', app.middleware.jwt(), controller.userinfo.getMyActivities);

  //写入学生信息
  router.post('/api/user/writeMsg', app.middleware.jwt(), controller.stdinfo.writeUserMsg)
  //更新学生信息
  router.put('/api/user/updateMsg', app.middleware.jwt(), controller.stdinfo.updateUserMsg)
  //查询学生信息
  router.get('/api/student/getMsg', app.middleware.jwt(), controller.stdinfo.getStudentMsg)

  //获取老师信息
  router.get('/api/teacher/detail', app.middleware.jwt(), controller.teainfo.getTeaDetail)
  //新增学生选老师选项
  router.post('/api/student/selectTeacher', app.middleware.jwt(), controller.stdinfo.selectTeacher)


  //老师选学生-即（修改学生选老师选项）
  router.put('/api/student/updateTeacher', app.middleware.jwt(), controller.teainfo.updateChoose)
  //老师选学生（新增到老师选学生表）
  router.post('/api/teacher/selectStudent', app.middleware.jwt(), controller.teainfo.selectStudent)
  //老师取消选择学生
  router.delete('/api/teacher/cancelSelect', app.middleware.jwt(), controller.teainfo.cancelSelect)
  //查看final表中某位老师选择的学生情况
  router.get('/api/teacher/getSelectList', app.middleware.jwt(), controller.teainfo.getSelectList)

  //admin新增活动
  router.post('/api/admin/addActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.addActivity)
  //获取活动列表
  router.get('/api/admin/getActivityList', app.middleware.jwt(), controller.admin.getActivityList)
  //获取某一活动详情
  router.get('/api/admin/getActivityDetail', app.middleware.jwt(), controller.admin.getActivityDetail)
  //admin修改活动
  router.put('/api/admin/updateActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.updateActivity)
  //admin删除活动
   router.delete('/api/admin/deleteActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.deleteActivity)

  //根据活动id去查询所有学生的选择情况
  router.get('/api/user/getChooseList', app.middleware.jwt(), controller.userinfo.getChooseList)
  //查询一个学生的选择情况(根据活动id+学生id)
  router.get('/api/user/getChooseDetail', app.middleware.jwt(), controller.userinfo.getChooseDetail)
  //查询已选学生数(通过老师id+活动id)
  router.get('/api/user/getChooseCount', app.middleware.jwt(), controller.userinfo.getChooseCount)



  //把对应的老师添加到活动中去
  router.post('/api/admin/addTeacherToActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.addTeacherToActivity)
  //把对应的学生添加到活动中去
  // router.post('/api/admin/addStudentToActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.addStudentToActivity)

  //查询某活动的所有老师
  router.get('/api/student/getTeacherList', app.middleware.jwt(), controller.stdinfo.getTeacherListInActivity)
  //查询某学生是否在活动中
  router.get('/api/student/isInActivity', app.middleware.jwt(), controller.stdinfo.isInActivity)
  //查询某导师是否在活动中
  router.get('/api/teacher/isInActivity', app.middleware.jwt(), controller.teainfo.isInActivity)
  
  //保存学生 openid
  router.post('/api/student/saveOpenid', app.middleware.jwt(), controller.stdinfo.saveOpenid)
  //新增学生上传简历
  router.post('/api/student/uploadResume', app.middleware.jwt(), controller.stdinfo.uploadResume)


  //以下是管理端代码
  //查询所有用户
  router.get('/api/admin/getUserList', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.getUserList)
  // //删除某个用户
  // router.delete('/api/admin/deleteUser', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.deleteUser)

  //查询所有活动（已有）
  // router.get('/api/admin/getActivityList', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.getActivityList)
  //查询单个用户信息
  router.get('/api/admin/getUserInfo', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.getUserInfo)
  //重置某个用户密码
  router.post('/api/admin/resetPassword', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.resetPassword)
  //重置所有选中用户密码
  router.post('/api/admin/resetSelectedPassword', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.resetSelectedPassword)
  //查询某活动的所有用户
  router.get('/api/admin/getUserListInActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.getUserListInActivity)
  //删除某活动的某一用户
  router.delete('/api/admin/deleteUserInActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.deleteUserInActivity)
  //查询选择志愿列表
  router.get('/api/admin/getSelectedList', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.getSelectedList)
  //删除某项选择志愿
  router.delete('/api/admin/deleteSelected', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.deleteSelected)
  //查询最终志愿
  router.get('/api/admin/getFinalList', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.getFinalList)
  //查询某活动的所有导师
  router.get('/api/admin/getTeacherListInActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.getTeacherListInActivity)
  //查询某活动的所有学生
  router.get('/api/admin/getStudentListInActivity', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.getStudentListInActivity)
  //重置志愿
  router.delete('/api/admin/resetVolunteer', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.resetVolunteer)

  //配置一个活动中某位老师最大可选学生数
  router.put('/api/admin/configMaxSelectNum', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.configMaxSelectNum)
  //查询一个活动中某位老师最大可选学生数
  router.get('/api/user/getMaxSelectNum', app.middleware.jwt(), controller.admin.getMaxSelectNum)

  //查询学生的最终志愿
  router.get('/api/admin/getFinalChoose', app.middleware.jwt(), controller.admin.getFinalChoose)

  // //获取当前时间API
  // router.get('/api/user/getCurrentTime', app.middleware.jwt(), controller.userinfo.getCurrentTime)

  ////////////////////////////////////未写入apifox////////////////////////////////////
  //管理员上传pdf
  router.post('/api/teacher/uploadTeacherResume', app.middleware.jwt({ requiredRole: 'admin' }), controller.admin.uploadTeacherResume)
  //查询某位老师简历
  router.get('/api/teacher/getTeacherResume', app.middleware.jwt(), controller.admin.getTeacherResume)

  // AI 推荐导师
  router.get('/api/student/recommendTeachers', app.middleware.jwt(), controller.ai.recommendTeachers)
};