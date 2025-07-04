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
};
