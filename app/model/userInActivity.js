//用户-活动关联表
module.exports = app => {
    const mongoose = app.mongoose
    mongoose.pluralize(null)//去掉集合后面的s
    const Schema = mongoose.Schema
    const UserInActivitySchema = new Schema({
        activityId: {
            type: String,
            required: true,
        },
        teacherId: {
            type: String,
        },
        studentId: {
            type: String
        },
        maxSelectNum: {
            type: Number,
        }
    }, { versionKey: false })
    return mongoose.model('UserInActivity', UserInActivitySchema)
}