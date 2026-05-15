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
        subscribeTemplateId: { type: String, default: '' },
        subscribeStatus: { type: String, default: '' },
    }, { versionKey: false });
    ChooseSchema.index({ studentId: 1, activityId: 1 });
    ChooseSchema.index({ teacherId: 1, activityId: 1 });
    return mongoose.model('Choose', ChooseSchema);
};
