'use strict';

module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;
  const RETENTION_SECONDS = 400 * 24 * 60 * 60;

  mongoose.pluralize(null);
  const UserAnalyticsEventSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    username: { type: String, required: true, maxlength: 20, index: true },
    role: {
      type: String,
      required: true,
      enum: [ 'admin', 'student', 'teacher' ],
    },
    type: {
      type: String,
      required: true,
      enum: [ 'login', 'action' ],
    },
    action: { type: String, required: true, maxlength: 64 },
    client: {
      type: String,
      required: true,
      enum: [ 'mp-weixin', 'wechat-web', 'web', 'app', 'unknown' ],
    },
    status: {
      type: String,
      required: true,
      enum: [ 'success', 'error' ],
    },
    occurredAt: { type: Date, required: true, default: Date.now },
  }, {
    versionKey: false,
    collection: 'UserAnalyticsEvent',
  });

  UserAnalyticsEventSchema.index({ occurredAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });
  UserAnalyticsEventSchema.index({ username: 1, occurredAt: -1 });
  UserAnalyticsEventSchema.index({ type: 1, action: 1, occurredAt: -1 });

  return mongoose.model('UserAnalyticsEvent', UserAnalyticsEventSchema);
};
