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
};
