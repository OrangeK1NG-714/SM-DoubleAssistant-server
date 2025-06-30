module.exports = app => {
    const { validator } = app
    //验证手机号码格式不正确
    validator.addRule('adminPhone', (rule, value) => {
        if(!/^1\d{10}$/.test(value.trim())){
            return rule.tips
        }
    })
    //6-8位的数字和字母结合
     validator.addRule('adminPassword', (rule, value) => {
        if(!/^(?=.*\d)(?=.*[a-zA-Z]).{6,8}$/.test(value.trim())){
            return rule.tips
        }
    })
}