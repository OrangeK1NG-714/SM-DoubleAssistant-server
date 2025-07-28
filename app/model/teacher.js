// 教师信息表
module.exports = app => {
    const mongoose = app.mongoose;
    mongoose.pluralize(null);
    const Schema = mongoose.Schema;
    const TeacherSchema = new Schema({
        name: { type: String, default: '' },
        teacherId: { type: String, default: '' },
        msg: { type: String, default: '' },
        teacherType:{type:String,default:''}
    }, { versionKey: false });
    return mongoose.model('Teacher', TeacherSchema);
};