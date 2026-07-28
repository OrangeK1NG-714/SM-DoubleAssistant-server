'use strict';

const Service = require('egg').Service;

// access_token 内存缓存
let _accessToken = '';
let _accessTokenExpireAt = 0;

class WechatService extends Service {
  /**
     * 获取小程序 access_token，带内存缓存（7000s 有效期）
     */
  async getAccessToken() {
    const now = Date.now();
    if (_accessToken && now < _accessTokenExpireAt) {
      return _accessToken;
    }

    const { appid, secret } = this.app.config.wxMiniApp;
    const query = new URLSearchParams({
      appid,
      grant_type: 'client_credential',
      secret,
    });
    const url = `https://api.weixin.qq.com/cgi-bin/token?${query.toString()}`;

    const result = await this.ctx.curl(url, {
      method: 'GET',
      dataType: 'json',
    });

    if (result.data && result.data.access_token) {
      _accessToken = result.data.access_token;
      // 微信有效期 7200s，提前 200s 刷新
      _accessTokenExpireAt = now + (result.data.expires_in - 200) * 1000;
      return _accessToken;
    }

    this.ctx.logger.error('[wechat] 获取 access_token 失败:', result.data);
    throw new Error('获取微信 access_token 失败');
  }

  /**
     * 通过 code 换取用户 openid
     * @param {string} code - 前端 wx.login() 返回的 code
     * @return {Promise<string>} openid
    */
  async getOpenid(code) {
    const { appid, secret } = this.app.config.wxMiniApp;
    const query = new URLSearchParams({
      appid,
      grant_type: 'authorization_code',
      js_code: code,
      secret,
    });
    const url = `https://api.weixin.qq.com/sns/jscode2session?${query.toString()}`;

    const result = await this.ctx.curl(url, {
      method: 'GET',
      dataType: 'json',
    });

    if (result.data && result.data.openid) {
      return result.data.openid;
    }

    this.ctx.logger.error('[wechat] jscode2session 失败:', result.data);
    throw new Error('获取 openid 失败');
  }

  /**
     * 发送一次性订阅消息
     * @param {string} openid - 接收消息的用户 openid
     * @param {object} msgData - 订阅消息模板数据，结构按模板字段填写
     */
  async sendSubscribeMessage(openid, msgData) {
    if (!openid) {
      this.ctx.logger.warn('[wechat] sendSubscribeMessage: openid 为空，跳过发送');
      return;
    }

    const accessToken = await this.getAccessToken();
    const { subscribeTemplateId } = this.app.config.wxMiniApp;

    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`;

    const body = {
      touser: openid,
      template_id: subscribeTemplateId,
      // 可选：点击消息跳转的小程序页面
      // page: 'pages/myAmbition/index',
      miniprogram_state: this.app.config.wxMiniApp.miniprogramState || 'developer',
      lang: 'zh_CN',
      data: msgData,
    };

    const result = await this.ctx.curl(url, {
      method: 'POST',
      contentType: 'json',
      data: body,
      dataType: 'json',
    });

    this.ctx.logger.info('[wechat] 订阅消息发送结果:', result.data);

    if (result.data && result.data.errcode !== 0) {
      this.ctx.logger.error('[wechat] 订阅消息发送失败:', result.data);
      throw new Error('微信订阅消息发送失败');
    }

    return result.data;
  }
}

module.exports = WechatService;
