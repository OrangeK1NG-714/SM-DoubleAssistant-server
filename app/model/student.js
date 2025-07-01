// 学生信息表
module.exports = app => {
    const mongoose = app.mongoose;
    mongoose.pluralize(null);
    const Schema = mongoose.Schema;
    const StudentSchema = new Schema({
        data: { type: Object, default: {} },
        name: { type: String, default: '' },
        studentId: { type: String, default: '' },
        mentor: { type: String, default: '' }
    }, { versionKey: false });
    return mongoose.model('Student', StudentSchema);
};