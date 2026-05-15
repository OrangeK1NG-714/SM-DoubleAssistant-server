/* eslint valid-jsdoc: "off" */

const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
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
  };

  config.jwt = {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: 60 * 60 * 24 * 3,
  };

  config.cors = {
    origin: '*',
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
    exposeHeaders: ['Authorization'],
  };

  config.aiModel = {
    pythonPath: 'python',
    predictScriptPath: path.resolve(__dirname, '../../ai-model/predict_request.py'),
    modelPath: path.resolve(__dirname, '../../ai-model/artifacts/recommender_model.joblib'),
    metricsPath: path.resolve(__dirname, '../../ai-model/artifacts/metrics.json'),
    teacherDataPath: path.resolve(__dirname, '../../ai-model/data/teacher_data.csv'),
  };

  const userConfig = {};

  return {
    ...config,
    ...userConfig,
  };
};
