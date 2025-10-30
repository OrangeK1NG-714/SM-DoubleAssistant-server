# SM-DA-server
这是浙江科技大学计算机学院数字媒体技术专业的双选小程序后端！

目前挂载个人服务器上，后续会移交给学院！
测试账号：后续给出
测试密码：后续给出

宝塔面板部署：
需要修改config/config.default.js文件中的数据库连接字符串
将下面的url的ms-da-projects替换为宝塔内部的数据库名称

  config.mongoose = {
    url: 'mongodb://127.0.0.1/ms-da-projects',
  }

## 项目介绍
使用了egg.js框架，数据库使用了mongodb。
由Richard_Q编写作为小毕设，仅用于学习和交流，不用于任何商业用途。


## QuickStart

<!-- add docs here for user -->

see [egg docs][egg] for more detail.

### Development

```bash
npm i
npm run dev
open http://localhost:7001/
```

### Deploy

```bash
npm start
npm stop
```

### npm scripts

- Use `npm run lint` to check code style.
- Use `npm test` to run unit test.

[egg]: https://eggjs.org
