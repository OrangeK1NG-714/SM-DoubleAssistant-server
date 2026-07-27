module.exports = () => {
  const config = {};

  config.mongoose = {
    url: process.env.MONGO_URL || 'mongodb://127.0.0.1/ms-da-projects',
  };

  return config;
};
