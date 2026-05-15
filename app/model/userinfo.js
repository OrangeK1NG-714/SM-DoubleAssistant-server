module.exports = app => {
    const mongoose = app.mongoose;
    mongoose.pluralize(null);
    const Schema = mongoose.Schema;
    const UserSchema = new Schema({
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: {
            type: String,
            required: true,
            enum: ['admin', 'student', 'teacher'],
            default: 'student',
        },
    }, { versionKey: false });
    return mongoose.model('User', UserSchema);
};
