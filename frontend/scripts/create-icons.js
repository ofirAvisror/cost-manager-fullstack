/**
 * Create PNG icons from SVG using canvas
 * Run: node scripts/create-icons.js
 */

const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

async function createIcon(size) {
  try {
    // Load the SVG
    const svgPath = path.join(__dirname, '..', 'public', 'icon.svg');
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    
    // Create canvas
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // For SVG, we need to convert it to image first
    // Since canvas doesn't support SVG directly, we'll create a simple icon
    // with gradient background matching the SVG colors
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#8b5cf6');
    
    // Draw rounded rectangle background
    const cornerRadius = size * 0.2;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, cornerRadius);
    ctx.fill();
    
    // Draw a simple wallet/card icon
    const centerX = size / 2;
    const centerY = size / 2;
    const cardWidth = size * 0.55;
    const cardHeight = size * 0.4;
    
    // Card background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.roundRect(centerX - cardWidth/2, centerY - cardHeight/2, cardWidth, cardHeight, size * 0.04);
    ctx.fill();
    
    // Card chip
    const chipSize = size * 0.1;
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.roundRect(centerX - cardWidth/2 + size * 0.05, centerY - chipSize/2, chipSize, chipSize, size * 0.01);
    ctx.fill();
    
    // Dollar sign
    ctx.fillStyle = '#6366f1';
    ctx.font = `bold ${size * 0.12}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', centerX + cardWidth/2 - size * 0.08, centerY);
    
    // Save as PNG
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(__dirname, '..', 'public', `icon-${size}.png`);
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`✅ Created icon-${size}.png (${size}x${size} pixels)`);
  } catch (error) {
    console.error(`❌ Error creating icon-${size}.png:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('Creating PWA icons...\n');
  
  try {
    await createIcon(192);
    await createIcon(512);
    
    console.log('\n✅ All icons created successfully!');
    console.log('Run: npm run build');
  } catch (error) {
    console.error('\n❌ Failed to create icons:', error);
    process.exit(1);
  }
}

main();

