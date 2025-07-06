/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  //注册用户
  router.post('/api/admin/register', app.middleware.jwt(), controller.userinfo.userRegister)
  //登录用户
  router.post('/api/user/login', controller.userinfo.userLogin)
  //获取用户信息
  router.get('/api/user/detail', controller.userinfo.getUserDetail);

  //写入学生信息
  router.post('/api/user/writeMsg',controller.stdinfo.writeUserMsg)
  //更新学生信息
  router.put('/api/user/updateMsg',controller.stdinfo.updateUserMsg)
  
  //获取老师信息
  router.get('/api/teacher/detail',controller.teainfo.getTeaDetail)
  //新增学生选老师选项
  router.post('/api/student/selectTeacher',controller.stdinfo.selectTeacher)
  //老师选学生-即（修改学生选老师选项）
  router.put('/api/student/updateTeacher',controller.teainfo.updateChoose)

  //admin新增活动
  router.post('/api/admin/addActivity',controller.admin.addActivity)
  //admin获取活动列表
  router.get('/api/admin/getActivityList',controller.admin.getActivityList)
  // //admin获取活动详情
  // router.get('/api/admin/getActivityDetail',controller.admin.getActivityDetail)
  // //admin修改活动
  // router.put('/api/admin/updateActivity',controller.admin.updateActivity)
  // //admin删除活动
  // router.delete('/api/admin/deleteActivity',controller.admin.deleteActivity)
};
