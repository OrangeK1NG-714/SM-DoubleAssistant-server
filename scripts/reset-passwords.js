'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 10;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1/ms-da-projects';

const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    role: String,
}, { versionKey: false });

mongoose.pluralize(null);
const User = mongoose.model('User', UserSchema);

async function main() {
    await mongoose.connect(MONGO_URL);
    console.log('已连接 MongoDB:', MONGO_URL);

    const studentHash = await bcrypt.hash('123456', BCRYPT_ROUNDS);
    const studentResult = await User.updateMany(
        { role: 'student' },
        { $set: { password: studentHash } }
    );
    console.log(`已重置 ${studentResult.modifiedCount} 个学生密码为 123456`);

    const teachers = await User.find({ role: 'teacher' });
    console.log(`教师账号: ${teachers.length} 个`);

    let updatedCount = 0;
    for (const teacher of teachers) {
        const hash = await bcrypt.hash(teacher.username, BCRYPT_ROUNDS);
        await User.updateOne(
            { _id: teacher._id },
            { $set: { password: hash } }
        );
        updatedCount++;
    }
    console.log(`已重置 ${updatedCount} 个教师密码为各自工号`);

    await mongoose.disconnect();
    console.log('完成，已断开数据库连接');
}

main().catch(err => {
    console.error('出错:', err);
    process.exit(1);
});
