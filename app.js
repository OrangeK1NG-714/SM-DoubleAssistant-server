// 启动项目就对校验进行加载
const path = require('node:path');
module.exports = app => {
  const dire = path.join(app.config.baseDir, 'app/validate');
  app.loader.loadToApp(dire, 'validate');
};
