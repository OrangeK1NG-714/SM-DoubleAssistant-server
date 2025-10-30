/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;

  // SSE路由
  router.get('/resource/sse', controller.sse.index); // 确保路径匹配

  //注册用户
  router.post('/api/admin/register', app.middleware.jwt(), controller.userinfo.userRegister)
  //登录用户
  router.post('/api/user/login', controller.userinfo.userLogin)
  //获取用户信息
  router.get('/api/user/detail', controller.userinfo.getUserDetail);

  //写入学生信息
  router.post('/api/user/writeMsg', controller.stdinfo.writeUserMsg)
  //更新学生信息
  router.put('/api/user/updateMsg', controller.stdinfo.updateUserMsg)
  //查询学生信息
  router.get('/api/student/getMsg', controller.stdinfo.getStudentMsg)

  //获取老师信息
  router.get('/api/teacher/detail', controller.teainfo.getTeaDetail)
  //新增学生选老师选项
  router.post('/api/student/selectTeacher', controller.stdinfo.selectTeacher)


  //老师选学生-即（修改学生选老师选项）
  router.put('/api/student/updateTeacher', controller.teainfo.updateChoose)
  //老师选学生（新增到老师选学生表）
  router.post('/api/teacher/selectStudent', controller.teainfo.selectStudent)
  //老师取消选择学生
  router.delete('/api/teacher/cancelSelect', controller.teainfo.cancelSelect)
  //查看final表中某位老师选择的学生情况
  router.get('/api/teacher/getSelectList', controller.teainfo.getSelectList)

  //admin新增活动
  router.post('/api/admin/addActivity', controller.admin.addActivity)
  //admin获取活动列表
  router.get('/api/admin/getActivityList', controller.admin.getActivityList)
  //admin获取某一活动详情
  router.get('/api/admin/getActivityDetail', controller.admin.getActivityDetail)
  //admin修改活动
  router.put('/api/admin/updateActivity', controller.admin.updateActivity)
  //admin删除活动
  router.delete('/api/admin/deleteActivity', controller.admin.deleteActivity)

  //根据活动id去查询所有学生的选择情况
  router.get('/api/user/getChooseList', controller.userinfo.getChooseList)
  //查询一个学生的选择情况(根据活动id+学生id)
  router.get('/api/user/getChooseDetail', controller.userinfo.getChooseDetail)
  //查询已选学生数(通过老师id+活动id)
  router.get('/api/user/getChooseCount', controller.userinfo.getChooseCount)



  //把对应的老师添加到活动中去
  router.post('/api/admin/addTeacherToActivity', controller.admin.addTeacherToActivity)
  //把对应的学生添加到活动中去
  // router.post('/api/admin/addStudentToActivity', controller.admin.addStudentToActivity)

  //查询某活动的所有老师
  router.get('/api/student/getTeacherList', controller.stdinfo.getTeacherListInActivity)
  //查询某学生是否在活动中
  router.get('/api/student/isInActivity', controller.stdinfo.isInActivity)
  //查询某导师是否在活动中
  router.get('/api/teacher/isInActivity', controller.teainfo.isInActivity)
  
  //新增学生上传简历
  router.post('/api/student/uploadResume', controller.stdinfo.uploadResume)


  //以下是管理端代码
  //查询所有用户
  router.get('/api/admin/getUserList', controller.admin.getUserList)
  // //删除某个用户
  // router.delete('/api/admin/deleteUser', controller.admin.deleteUser)

  //查询所有活动（已有）
  // router.get('/api/admin/getActivityList', controller.admin.getActivityList)
  //查询单个用户信息
  router.get('/api/admin/getUserInfo', controller.admin.getUserInfo)
  //重置某个用户密码
  router.post('/api/admin/resetPassword', controller.admin.resetPassword)
  //重置所有选中用户密码
  router.post('/api/admin/resetSelectedPassword', controller.admin.resetSelectedPassword)
  //查询某活动的所有用户
  router.get('/api/admin/getUserListInActivity', controller.admin.getUserListInActivity)
  //删除某活动的某一用户
  router.delete('/api/admin/deleteUserInActivity', controller.admin.deleteUserInActivity)
  //查询选择志愿列表
  router.get('/api/admin/getSelectedList', controller.admin.getSelectedList)
  //删除某项选择志愿
  router.delete('/api/admin/deleteSelected', controller.admin.deleteSelected)
  //查询最终志愿
  router.get('/api/admin/getFinalList', controller.admin.getFinalList)
  //查询某活动的所有导师
  router.get('/api/admin/getTeacherListInActivity', controller.admin.getTeacherListInActivity)
  //查询某活动的所有学生
  router.get('/api/admin/getStudentListInActivity', controller.admin.getStudentListInActivity)
  //重置志愿
  router.delete('/api/admin/resetVolunteer', controller.admin.resetVolunteer)

  //配置一个活动中某位老师最大可选学生数
  router.put('/api/admin/configMaxSelectNum', controller.admin.configMaxSelectNum)
  //查询一个活动中某位老师最大可选学生数
  router.get('/api/user/getMaxSelectNum', controller.admin.getMaxSelectNum)

  //查询学生的最终志愿
  router.get('/api/admin/getFinalChoose', controller.admin.getFinalChoose)
};