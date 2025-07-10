// 选择信息表
module.exports = app => {
    const mongoose = app.mongoose;
    mongoose.pluralize(null);
    const Schema = mongoose.Schema;
    const ChooseSchema = new Schema({
        studentId: { type: String, required: true },
        teacherId: { type: String, required: true },
        order: { type: Number, required: true },
        isChose: { type: Boolean, required: true },
        activityId: { type: String, required: true },
        createTime: { type: Date, required: true },
    }, { versionKey: false });
    return mongoose.model('Choose', ChooseSchema);
};