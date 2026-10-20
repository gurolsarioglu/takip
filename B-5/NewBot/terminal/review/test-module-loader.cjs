const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load(file, deps = {}, tail = '', extras = {}) {
  const context = { module: { exports: {} }, __dirname: path.dirname(path.join(root, file)),
    console: { log() {}, warn() {}, error() {}, clear() {} }, Date, Map, Set, Buffer,
    process: { env: {} }, setTimeout: () => ({ unref() {} }), clearTimeout() {},
    setInterval: () => ({ unref() {} }), clearInterval() {},
    require(name) { if (Object.hasOwn(deps, name)) return deps[name]; throw new Error(`Unexpected dependency ${name}`); },
    ...extras };
  const code = fs.readFileSync(path.join(root, file), 'utf8').replace(/^start\(\);\s*$/m, '');
  vm.runInNewContext(code + '\n' + tail, context, { filename: file });
  return context.module.exports;
}
module.exports = { load, root };
