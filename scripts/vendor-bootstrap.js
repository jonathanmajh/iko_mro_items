// Copies the two Bootstrap files the renderers actually use out of the
// (dev-only) npm package into committed, vendored copies.
// Usage: npm install -D bootstrap@<new-version> && npm run vendor:bootstrap
// The packaged app never ships node_modules/bootstrap (devDeps are pruned),
// so only renderer/vendor-bootstrap.* matter at runtime.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = [
  ['node_modules/bootstrap/dist/js/bootstrap.bundle.min.js', 'renderer/vendor-bootstrap.bundle.min.js'],
  ['node_modules/bootstrap/dist/css/bootstrap.min.css', 'renderer/vendor-bootstrap.min.css'],
];

for (const [src, dest] of files) {
  const from = path.join(root, src);
  const to = path.join(root, dest);
  if (!fs.existsSync(from)) {
    console.error(`missing ${src} — run npm install first`);
    process.exit(1);
  }
  fs.copyFileSync(from, to);
  const version = require(path.join(root, 'node_modules/bootstrap/package.json')).version;
  console.log(`vendored Bootstrap ${version}: ${dest}`);
}
