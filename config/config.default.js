const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

module.exports = appInfo => {
  const config = exports = {};

  config.keys = appInfo.name + '_1751160937705_7579';

  config.middleware = [];

  config.multipart = {
    mode: 'file',
    fileSize: '50mb',
    whitelist: ['.pdf', '.doc', '.docx', '.jpg', '.png'],
  };

  config.onerror = {
    accepts() {
      return 'json';
    },
    json(err, ctx) {
      if (err.status === 422) {
        if (err.errors[0].message === 'required') {
          ctx.body = {
            msg: '缺少必传参数',
            field: err.errors[0].field,
          };
          ctx.status = 400;
        } else {
          ctx.body = {
            msg: err.errors[0].message,
            field: err.errors[0].field,
          };
          ctx.status = 422;
        }
      } else {
        ctx.body = {
          msg: err.message,
          ...(err.errors && { errors: err.errors }),
        };
        ctx.status = err.status;
      }
    },
  };

  config.mongoose = {
    url: process.env.MONGO_URL || 'mongodb://127.0.0.1/ms-da-projects',
  };

  config.security = {
    csrf: {
      enable: false,
    },
  };

  config.validate = {
    convert: true,
  };

  config.wxMiniApp = {
    appid: process.env.WX_APPID,
    secret: process.env.WX_SECRET,
    subscribeTemplateId: process.env.WX_SUBSCRIBE_TEMPLATE_ID,
    miniprogramState: process.env.WX_MINIPROGRAM_STATE || 'developer',
  };

  config.jwt = {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: 60 * 60 * 24 * 3,
  };

  config.cors = {
    origin(ctx) {
      const allowList = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:9000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:9000',
        'https://richardq.tech',
      ];
      const requestOrigin = ctx.get('origin');
      if (allowList.includes(requestOrigin)) {
        return requestOrigin;
      }
      return '';
    },
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
    credentials: true,
    exposeHeaders: ['Authorization'],
  };

  config.uploadDir = process.env.UPLOAD_DIR || path.join(appInfo.baseDir, 'app/public/uploads');

  config.aiModel = {
    teacherDataPath: path.resolve(__dirname, '../app/data/teacher_data.csv'),
  };

  return config;
};
