/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  router.get('/api', controller.home.index);
  //登录
  router.get('/api/login',controller.login.Login)
};
