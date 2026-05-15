'use strict';

const Controller = require('egg').Controller;
const jwt = require('jsonwebtoken');

class SSEController extends Controller {
    async index() {
        const { ctx, app } = this;

        const token = ctx.query.Authorization?.replace('Bearer ', '');
        if (!token) {
            ctx.status = 401;
            ctx.body = 'Unauthorized';
            return;
        }

        try {
            jwt.verify(token, app.config.jwt.secret);
        } catch (err) {
            ctx.status = 401;
            ctx.body = 'Invalid token';
            return;
        }

        ctx.respond = false;

        ctx.res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': ctx.get('origin') || '*',
            'Access-Control-Allow-Credentials': 'true',
        });

        ctx.res.write('\n');

        const heartbeatInterval = setInterval(() => {
            if (!ctx.res.writableEnded) {
                ctx.res.write(': heartbeat\n\n');
            }
        }, 15000);

        let count = 0;
        const dataInterval = setInterval(() => {
            try {
                if (!ctx.res.writableEnded && count < 10) {
                    const data = {
                        message: 'SSE Message',
                        count: count++,
                        timestamp: Date.now(),
                    };
                    ctx.res.write(`data: ${JSON.stringify(data)}\n\n`);
                } else {
                    clearInterval(dataInterval);
                }
            } catch (err) {
                clearInterval(dataInterval);
            }
        }, 1000);

        ctx.req.on('close', () => {
            clearInterval(heartbeatInterval);
            clearInterval(dataInterval);
            ctx.res.end();
        });

        ctx.res.on('error', () => {
            clearInterval(heartbeatInterval);
            clearInterval(dataInterval);
        });
    }
}

module.exports = SSEController;
