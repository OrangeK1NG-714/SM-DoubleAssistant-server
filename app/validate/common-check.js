module.exports = app => {
    const { validator } = app
    //验证账号格式在6-10位数字之间
    validator.addRule('registerUsername', (rule, value) => {
        const trimmedValue = value.toString().trim(); // 确保是字符串并去除空格
        if (!/^\d{6,10}$/.test(trimmedValue)) {
            return rule.tips
        }
    });

    //6-20位的数字和字母结合
     validator.addRule('registerUserPassword', (rule, value) => {
        if(!/^[a-zA-Z0-9]{6,20}$/.test(value.trim())){
            return rule.tips
        }
    })
}