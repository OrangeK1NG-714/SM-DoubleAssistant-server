/** @type Egg.EggPlugin */
module.exports = {
  // had enabled by egg
  // static: {
  //   enable: true,
  // }
  mongoose: {
    enable: true,
    package: 'egg-mongoose',
  },
  validate: {
    enable: true,
    package: 'egg-validate',
  },
  onerror: {
    enable: true,
    package: 'egg-onerror',
  },
  cors: {
    enable: true,
    package: 'egg-cors',
  },
   // 添加 multipart 插件配置
  multipart: {
    enable: true,
    package: 'egg-multipart',
  },
};
