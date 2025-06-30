//用户信息
module.exports = app => {
    const mongoose = app.mongoose
    mongoose.pluralize(null)//去掉集合后面的s
    const Schema = mongoose.Schema
    const UserSchema = new Schema({
        username: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        }
    }, { versionKey: false })
    return mongoose.model('User', UserSchema)
}