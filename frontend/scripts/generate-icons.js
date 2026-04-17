/**
 * Script to generate PNG icons from SVG
 * Requires: npm install sharp
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'icon.svg');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Error: sharp is not installed!');
  console.log('📦 Please install sharp: npm install sharp');
  console.log('');
  console.log('Alternatively, you can manually convert the SVG:');
  console.log('  - Online: https://convertio.co/svg-png/');
  console.log('  - ImageMagick: magick icon.svg -resize 192x192 icon-192.png');
  console.log('  - Then: magick icon.svg -resize 512x512 icon-512.png');
  process.exit(1);
}

// Check if SVG exists
if (!fs.existsSync(svgPath)) {
  console.error('❌ Error: icon.svg not found at', svgPath);
  process.exit(1);
}

console.log('🔄 Reading SVG file...');
const svgBuffer = fs.readFileSync(svgPath);

async function generateIcons() {
  try {
    console.log('🔄 Generating icon-192.png (192x192)...');
    await sharp(svgBuffer)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'icon-192.png'));
    console.log('✅ Created icon-192.png');

    console.log('🔄 Generating icon-512.png (512x512)...');
    await sharp(svgBuffer)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'icon-512.png'));
    console.log('✅ Created icon-512.png');

    // Verify the icons were created correctly
    const icon192 = await sharp(path.join(publicDir, 'icon-192.png')).metadata();
    const icon512 = await sharp(path.join(publicDir, 'icon-512.png')).metadata();

    console.log('');
    console.log('✅ Icons generated successfully!');
    console.log(`   icon-192.png: ${icon192.width}x${icon192.height} (${(icon192.size / 1024).toFixed(2)} KB)`);
    console.log(`   icon-512.png: ${icon512.width}x${icon512.height} (${(icon512.size / 1024).toFixed(2)} KB)`);
    console.log('');
    console.log('🎉 PWA icons are ready!');
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();

