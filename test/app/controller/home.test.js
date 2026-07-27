const { strict: assert } = require('node:assert');
const path = require('node:path');
const { statSync } = require('node:fs');
const { app } = require('egg-mock/bootstrap');

describe('test/app/controller/home.test.js', () => {
  it('should assert', async () => {
    const pkg = require('../../../package.json');
    assert(app.config.keys.startsWith(pkg.name));
    assert.equal(app.config.cluster.listen.hostname, '127.0.0.1');
  });

  it('should typings exists', async () => {
    const typings = path.join(__dirname, '../../../typings');
    assert(statSync(typings));
  });

  it('should GET /', async () => {
    return app.httpRequest()
      .get('/')
      .expect(404);
  });
});
