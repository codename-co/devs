const sharp = require('sharp');
const { join } = require('path');

const publicDir = join(__dirname, '..', 'public');

// SVG icon with explicit black color (for light backgrounds)
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <polygon points="12,26 46,17 37,51" fill="#000" stroke="#000" stroke-width="12" stroke-linejoin="round"/>
</svg>`;

// Maskable icon needs padding (safe zone is 80% of the icon, centered)
// For a 512x512 icon, the safe zone is 409x409 centered, so we need ~20% padding on each side
const createMaskableSvg = (size) => {
  const padding = Math.floor(size * 0.15); // 15% padding for safe zone
  const iconSize = size - (padding * 2);
  const scale = iconSize / 64;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#3366FF"/>
    <g transform="translate(${padding}, ${padding}) scale(${scale})">
      <polygon points="12,26 46,17 37,51" fill="#fff" stroke="#fff" stroke-width="12" stroke-linejoin="round"/>
    </g>
  </svg>`;
};

// Standard icon (any purpose) - white icon on theme color
const createStandardSvg = (size) => {
  const scale = size / 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#3366FF"/>
    <g transform="scale(${scale})">
      <polygon points="12,26 46,17 37,51" fill="#fff" stroke="#fff" stroke-width="12" stroke-linejoin="round"/>
    </g>
  </svg>`;
};

const sizes = [192, 512];

async function generateIcons() {
  for (const size of sizes) {
    // Generate standard icon
    const standardSvg = createStandardSvg(size);
    await sharp(Buffer.from(standardSvg))
      .png()
      .toFile(join(publicDir, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);

    // Generate maskable icon with safe zone padding
    const maskableSvg = createMaskableSvg(size);
    await sharp(Buffer.from(maskableSvg))
      .png()
      .toFile(join(publicDir, `icon-${size}-maskable.png`));
    console.log(`Generated icon-${size}-maskable.png`);
  }

  // Also generate Apple Touch Icon (180x180)
  const appleSvg = createStandardSvg(180);
  await sharp(Buffer.from(appleSvg))
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
