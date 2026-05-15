const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

module.exports = {
    get ctx() {
        return this;
    },
    send(data = [], code = 200, msg = 'success', error = null) {
        this.body = { code, msg, data, error };
        this.status = code;
    },
    isValidObjectId(id) {
        return mongoose.Types.ObjectId.isValid(id);
    },
    generateToken(uid, role) {
        const { secret, expiresIn } = this.app.config.jwt;
        return jwt.sign({ uid, role, type: 'access' }, secret, { expiresIn });
    },
    generateRefreshToken(uid) {
        const { refreshSecret } = this.app.config.jwt;
        return jwt.sign({ uid, type: 'refresh' }, refreshSecret, { expiresIn: 60 * 60 * 24 * 7 });
    },
};
