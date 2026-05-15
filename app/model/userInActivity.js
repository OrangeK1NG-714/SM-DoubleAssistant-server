module.exports = app => {
    const mongoose = app.mongoose;
    mongoose.pluralize(null);
    const Schema = mongoose.Schema;
    const UserInActivitySchema = new Schema({
        activityId: { type: String, required: true },
        teacherId: { type: String },
        studentId: { type: String },
        maxSelectNum: { type: Number },
    }, { versionKey: false });
    UserInActivitySchema.index({ activityId: 1, teacherId: 1 });
    UserInActivitySchema.index({ activityId: 1, studentId: 1 });
    return mongoose.model('UserInActivity', UserInActivitySchema);
};
