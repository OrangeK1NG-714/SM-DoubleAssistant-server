var jwt = require('jsonwebtoken')
module.exports = {
    get ctx() {
        return this
    },
    //自定义返回前端的接口数据结构
    send(data = [], code = 200, msg = 'success', error = null) {
        this.body = { code, msg, data, error, }
        this.status = code
    },
    //加密生成token
    generateToken(uid, role) {
        const { secret, expiresIn } = this.app.config.jwt
        return jwt.sign({ uid, role, type: 'access' }, secret, { expiresIn })
    },
    //生成刷新token
    generateRefreshToken(uid) {
        const { secret } = this.app.config.jwt
        // refresh token 有效期更长，比如7天
        return jwt.sign({ uid, type: 'refresh' }, secret, { expiresIn: 60 * 60 * 24 * 7 })
    }
}