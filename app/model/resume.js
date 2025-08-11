//创建活动表
module.exports = app => {
    const mongoose = app.mongoose;
    mongoose.pluralize(null);
    const Schema = mongoose.Schema;
    const ResumeSchema = new Schema({
        studentId: {
            type: String,
            required: true,
        },
        fileName: {
            type: String,
            required: true,
        },
        filePath: {
            type: String,
            required: true,
        },
        createTime: {
            type: Date,
            default: Date.now,
        },


    }, { versionKey: false });
    return mongoose.model('Resume', ResumeSchema);
}   