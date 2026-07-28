module.exports = app => {
  const mongoose = app.mongoose;
  mongoose.pluralize(null);
  const Schema = mongoose.Schema;
  const TeacherOperationLockSchema = new Schema({
    activityId: { type: String, required: true },
    teacherId: { type: String, required: true },
    ownerToken: { type: String, required: true },
    lockUntil: { type: Date, required: true },
  }, { versionKey: false });
  TeacherOperationLockSchema.index({ teacherId: 1, activityId: 1 }, { unique: true });
  return mongoose.model('TeacherOperationLock', TeacherOperationLockSchema);
};
