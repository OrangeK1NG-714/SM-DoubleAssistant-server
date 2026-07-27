module.exports = app => {
  const mongoose = app.mongoose;
  mongoose.pluralize(null);
  const Schema = mongoose.Schema;
  const UserSchema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: [ 'admin', 'student', 'teacher' ],
      default: 'student',
    },
    firstLoginAt: { type: Date },
    lastLoginAt: { type: Date, index: true },
    loginCount: { type: Number, default: 0, min: 0 },
    lastSeenAt: { type: Date, index: true },
    activityCount: { type: Number, default: 0, min: 0 },
    lastAction: { type: String, maxlength: 64, default: '' },
    lastClient: {
      type: String,
      enum: [ 'mp-weixin', 'wechat-web', 'web', 'app', 'unknown' ],
      default: 'unknown',
    },
  }, { versionKey: false });
  return mongoose.model('User', UserSchema);
};
