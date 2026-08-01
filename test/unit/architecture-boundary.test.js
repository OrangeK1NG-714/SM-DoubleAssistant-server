'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('selection application modules do not import Egg or Mongoose infrastructure', () => {
  const architecture = fs.readFileSync(
    path.join(__dirname, '..', '..', 'ARCHITECTURE.md'),
    'utf8'
  );
  for (const heading of [
    '## 产品与边界',
    '## 目录职责',
    '## 依赖方向',
    '## 禁止事项',
    '## 当前迁移热点',
    '## 验证',
  ]) {
    assert.match(architecture, new RegExp(heading));
  }
  const applicationDir = path.join(__dirname, '..', '..', 'app', 'application');
  for (const entry of fs.readdirSync(applicationDir)) {
    if (!entry.endsWith('.js')) continue;
    const source = fs.readFileSync(path.join(applicationDir, entry), 'utf8');
    assert.doesNotMatch(source, /require\(\s*['"](?:egg|mongoose)/u, entry);
  }
});
