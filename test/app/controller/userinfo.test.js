'use strict';

const { strict: assert } = require('node:assert');
const { app } = require('egg-mock/bootstrap');

describe('test/app/controller/userinfo.test.js', () => {
  it('allows the administrator username to reach authentication', async () => {
    app.mockService('userinfo', 'userLogin', async (username, password) => {
      assert.equal(username, 'admin');
      assert.equal(password, 'testPass7');
      return {
        data: {
          username,
          role: 'admin',
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
        },
        msg: 'success',
        code: 200,
      };
    });

    const response = await app.httpRequest()
      .post('/api/user/login')
      .send({ username: 'admin', password: 'testPass7' })
      .expect(200);

    assert.equal(response.body.code, 200);
    assert.equal(response.body.data.username, 'admin');
    assert.equal(response.body.data.role, 'admin');
  });
});
