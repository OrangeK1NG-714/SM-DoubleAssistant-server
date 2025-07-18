'use strict';

const Controller = require('egg').Controller;

class SSEController extends Controller {
  async index() {
    const { ctx, app } = this;

    // 1. 验证 Token
    const token = ctx.query.Authorization?.replace('Bearer ', '');
    console.log(token);
    
    if (!token) {
      ctx.status = 401;
      ctx.body = 'Unauthorized';
      return;
    }

    // try {
    //   // 验证 token 有效性（假设使用 jwt）
    //   await app.jwt.verify(token, app.config.jwt.secret);
    // } catch (err) {
    //   ctx.status = 401;
    //   ctx.body = 'Invalid token';
    //   console.log('cccccccccc');
      
    //   return;
    // }

    // 2. 关键设置：禁用框架的自动响应处理
    ctx.respond = false;

    // 3. 手动设置 SSE 响应头（使用 writeHead 确保不被覆盖）
    ctx.res.writeHead(200, {
      'Content-Type': 'text/event-stream',  // 必须小写
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': ctx.get('origin') || '*',
      'Access-Control-Allow-Credentials': 'true'
    });

    // 4. 立即发送一个初始空行（触发浏览器建立连接）
    ctx.res.write('\n');

    // 5. 心跳机制（防止连接超时）
    const heartbeatInterval = setInterval(() => {
      if (!ctx.res.writableEnded) {
        ctx.res.write(': heartbeat\n\n');  // SSE 注释行作为心跳
      }
    }, 15000);

    // 6. 业务数据发送
    let count = 0;
    const dataInterval = setInterval(() => {
      try {
        if (!ctx.res.writableEnded&&count<10) {
          const data = {
            message: 'SSE Message',
            count: count++,
            timestamp: Date.now()
          };
          ctx.res.write(`data: ${JSON.stringify(data)}\n\n`);  // 必须双换行符
        }
      } catch (err) {
        clearInterval(dataInterval);
      }
    }, 1000);

    // 7. 连接关闭处理
    ctx.req.on('close', () => {
      clearInterval(heartbeatInterval);
      clearInterval(dataInterval);
      console.log('Client disconnected');
      ctx.res.end();
    });

    // 8. 错误处理
    ctx.res.on('error', (err) => {
      clearInterval(heartbeatInterval);
      clearInterval(dataInterval);
      console.error('SSE connection error:', err);
    });
  }
}

module.exports = SSEController;