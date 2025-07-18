// 终表
module.exports = app => {
    const mongoose = app.mongoose;
    mongoose.pluralize(null);
    const Schema = mongoose.Schema;
    const FinalSchema = new Schema({
        activityId: { type: String, required: true },
        studentId: { type: String, required: true },
        teacherId: { type: String, required: true },
        data: { type: Object, required: true },
        order: { type: Number, required: true },
    }, { versionKey: false });
    return mongoose.model('Final', FinalSchema);
};