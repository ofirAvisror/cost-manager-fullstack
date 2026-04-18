/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const srcTtf = path.join(__dirname, '..', 'public', 'fonts', 'NotoSansHebrew-Regular.ttf');
const outJs = path.join(__dirname, '..', 'src', 'lib', 'notoSansHebrewFontBase64.js');

const buf = fs.readFileSync(srcTtf);
const b64 = buf.toString('base64');
const content =
  '/* eslint-disable max-len */\n' +
  '/** Noto Sans Hebrew Regular — embedded for PDF (PWA/mobile/offline). OFL license. */\n' +
  'const notoSansHebrewFontBase64 = \'' +
  b64 +
  '\';\n' +
  'export default notoSansHebrewFontBase64;\n';

fs.writeFileSync(outJs, content, 'utf8');
console.log('Wrote', outJs, 'bytes', buf.length, 'base64 length', b64.length);
