const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

module.exports = {
    send(data = [], code = 200, msg = 'success', error = null) {
        this.body = { code, msg, data, error };
        this.status = code;
    },
    isValidObjectId(id) {
        return mongoose.Types.ObjectId.isValid(id);
    },
    generateToken(uid, role, username) {
        const { secret, expiresIn } = this.app.config.jwt;
        return jwt.sign({ uid, role, username, type: 'access' }, secret, { expiresIn });
    },
    generateRefreshToken(uid, role, username) {
        const { refreshSecret } = this.app.config.jwt;
        return jwt.sign({ uid, role, username, type: 'refresh' }, refreshSecret, { expiresIn: 60 * 60 * 24 * 7 });
    },
};
