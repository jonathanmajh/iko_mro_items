// Electron Forge packager/maker configuration.
//
// Size-optimization notes:
// - `asar: true` packs app code into a single archive (fewer files, better
//   Squirrel compression). Native modules (*.node) must stay unpacked or
//   better-sqlite3 fails to load, hence the `unpack` glob.
// - `prune: true` drops devDependencies (electron, typescript, vitest, ...).
// - `ignore` keeps dev/runtime junk out of the installer: local DB copies,
//   tests/docs, sourcemaps, better-sqlite3 C sources, etc.
// - `afterCopy` strips unused Chromium locales (46MB -> ~0.5MB, en-US only).

const fs = require('fs');
const path = require('path');

const ignorePatterns = [
  // Repo junk that must never ship
  /[/\\]\.github([/\\]|$)/,
  /[/\\]\.vscode([/\\]|$)/,
  /[/\\]test([/\\]|$)/,
  /[/\\]docs([/\\]|$)/,
  /[/\\]out([/\\]|$)/,
  // Local runtime databases (gitignored). Fresh installs recreate the schema
  // via indexDB.js and sync via remotedb.js program.zip download.
  /[/\\]assets[/\\][^/\\]*\.db$/,
  /\.db-journal$/,
  /\.db-wal$/,
  /\.db-shm$/,
  // Sourcemaps: ~20MB across firebase/exceljs/jimp/bootstrap, never needed
  // at runtime.
  /\.map$/,
  // Type definitions never required at runtime.
  /\.d\.ts$/,
  // better-sqlite3 C source + tests (~9MB sqlite3.c alone). The compiled
  // binding in build/Release is kept (and unpacked from asar, see below).
  /[/\\]better-sqlite3[/\\]deps([/\\]|$)/,
  /[/\\]better-sqlite3[/\\]test([/\\]|$)/,
  // Test fixtures in transitive deps (e.g. gifwrap 1.3MB gif).
  /[/\\]gifwrap[/\\]test([/\\]|$)/,
  // lodash is no longer a runtime dep (native intersection in indexDB.js);
  // the hoisted copy belongs to @electron-forge dev tooling.
  /[/\\]node_modules[/\\]lodash([/\\]|$)/,
  // Firebase SDK (~121MB): assets/firestore.js loads the esbuild-bundled
  // tree-shaken copy (assets/firestore.bundle.cjs, 170KB) instead, so the
  // SDK and its exclusive transitive deps never ship. Verified via
  // `npm ls`: idb, @grpc/*, protobufjs, @protobufjs/*, long are firebase-only
  // (zod/await-to-js belong to jimp and are handled with Phase 4).
  /[/\\]node_modules[/\\]firebase([/\\]|$)/,
  /[/\\]node_modules[/\\]@firebase([/\\]|$)/,
  /[/\\]node_modules[/\\]idb([/\\]|$)/,
  /[/\\]node_modules[/\\]@grpc([/\\]|$)/,
  /[/\\]node_modules[/\\]protobufjs([/\\]|$)/,
  /[/\\]node_modules[/\\]@protobufjs([/\\]|$)/,
  /[/\\]node_modules[/\\]long([/\\]|$)/,
  // Raw SDK source: packaged app uses the bundle (see above).
  /[/\\]assets[/\\]firestore\.sdk\.js$/,
  // jimp removed in favor of OffscreenCanvas/createImageBitmap in
  // assets/maximo.js padImage() (worker context). Belt-and-braces in case a
  // transitive dep ever pulls it back in.
  /[/\\]node_modules[/\\]jimp([/\\]|$)/,
  /[/\\]node_modules[/\\]@jimp([/\\]|$)/,
  // exceljs main entry (excel.js) loads ./lib/exceljs.nodejs.js; the whole
  // dist/ folder (es5/browser bundles, ~20MB) is never required in Node.
  // Verified: all in-repo requires are bare require('exceljs').
  /[/\\]exceljs[/\\]dist([/\\]|$)/,
  // jimp require() resolves via exports.require to dist/commonjs; the
  // browser (+3.6MB) and esm builds are dead weight in Electron.
  /[/\\]jimp[/\\]dist[/\\]browser([/\\]|$)/,
  /[/\\]jimp[/\\]dist[/\\]esm([/\\]|$)/,
  // better-sqlite3 C++ sources: only lib/*.js + build/Release/*.node run.
  /[/\\]better-sqlite3[/\\]src([/\\]|$)/,
  /binding\.gyp$/,
  // Test/snapshot/type artifacts shipped inside dependencies (jimp ships
  // .ts sources, snapshot PNGs, etc.). Never require()d at runtime.
  /__snapshots__([/\\]|$)/,
  /__image_snapshots__([/\\]|$)/,
  /__tests__([/\\]|$)/,
  /\.test\.(js|mjs|cjs|ts)$/,
  /\.spec\.(js|ts)$/,
  /\.snap$/,
  /\.ts$/,
  // Markdown docs (READMEs, CHANGELOGs) across node_modules.
  /\.md$/,
  // Config/docs that are not needed at runtime.
  /forge\.config\.js$/,
  /eslint\.config\.js$/,
  /vitest\.config\.mjs$/,
  /[/\\]\.gitignore$/,
];

// Strip all Chromium locales except en-US.pak (Squirrel/Windows).
// Saves ~45MB unpacked. Runs after Electron dist is copied, before asar.
// NOTE: electron-packager calls afterCopy hooks with buildPath set to
// <staging>/resources/app (not the staging root), so locales live two
// levels up.
function stripLocales(buildPath, _electronVersion, platform, _arch, callback) {
  try {
    if (platform !== 'win32') {
      if (typeof callback === 'function') callback();
      return;
    }
    const localesDir = path.resolve(buildPath, '..', '..', 'locales');
    if (!fs.existsSync(localesDir)) {
      if (typeof callback === 'function') callback();
      return;
    }
    let removed = 0;
    for (const file of fs.readdirSync(localesDir)) {
      if (file.endsWith('.pak') && file !== 'en-US.pak') {
        try {
          fs.unlinkSync(path.join(localesDir, file));
          removed++;
        } catch (_e) {
          // best-effort: keep going so one locked file can't fail the build
        }
      }
    }
    console.log(`[forge] stripLocales: removed ${removed} locale packs, kept en-US.pak`);
    if (typeof callback === 'function') callback();
  } catch (err) {
    if (typeof callback === 'function') callback(err);
    else throw err;
  }
}

module.exports = {
  packagerConfig: {
    icon: 'AppIcon.ico',
    asar: {
      unpack: '**/*.node',
    },
    prune: true,
    ignore: ignorePatterns,
    afterCopy: [stripLocales],
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'iko_utility',
        setupIcon: 'AppIcon.ico',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'jonathanmajh',
          name: 'iko_mro_items',
        },
        draft: false,
        prerelease: false,
        generateReleaseNotes: true,
      },
    },
  ],
};
