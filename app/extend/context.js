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
    generateToken(uid) {
        const { secret, expiresIn } = this.app.config.jwt
        return jwt.sign({ uid }, secret, { expiresIn })
    }
}