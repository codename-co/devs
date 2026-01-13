const sharp = require('sharp')
const { join } = require('path')
const { execSync } = require('child_process')

const publicDir = join(__dirname, '..', 'public')

// SVG icon with explicit black color (for light backgrounds)
// const svgIcon = /* svg */ `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
//   <polygon points="12,26 46,17 37,51" fill="#000" stroke="#000" stroke-width="12" stroke-linejoin="round"/>
// </svg>`

// Gradient background using the same colors as PromptArea border animation
// Colors: blue (#3b82f6), purple (#8b5cf6), pink (#ec4899), orange (#f97316), green (#10b981)
const createGradientBackground = (size) => {
  // Use ellipses with radial gradients for organic blob-like color zones
  return /* svg */ `
    <defs>
      <!-- Gaussian blur for soft edges -->
      <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${size * 0.08}"/>
      </filter>

      <!-- Radial gradients with smooth falloff -->
      <radialGradient id="g1" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#3b82f6"/>
        <stop offset="70%" stop-color="#3b82f6" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="g2" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#8b5cf6"/>
        <stop offset="60%" stop-color="#8b5cf6" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="g3" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ec4899"/>
        <stop offset="65%" stop-color="#ec4899" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#ec4899" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="g4" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#f97316"/>
        <stop offset="55%" stop-color="#f97316" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="g5" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#10b981"/>
        <stop offset="50%" stop-color="#10b981" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <!-- Background - vibrant purple base -->
    <rect width="${size}" height="${size}" fill="#2d1f5e"/>

    <!-- Large blurred color blobs creating the mesh effect -->
    <g filter="url(#blur)">
      <!-- Blue blob - top left, stretching right -->
      <ellipse cx="${size * 0.15}" cy="${size * 0.2}" rx="${size * 0.6}" ry="${size * 0.5}" fill="url(#g1)" opacity="1"/>

      <!-- Purple blob - top right -->
      <ellipse cx="${size * 0.85}" cy="${size * 0.15}" rx="${size * 0.55}" ry="${size * 0.55}" fill="url(#g2)" opacity="1"/>

      <!-- Pink blob - bottom right, large -->
      <ellipse cx="${size * 0.9}" cy="${size * 0.85}" rx="${size * 0.65}" ry="${size * 0.6}" fill="url(#g3)" opacity="1"/>

      <!-- Orange blob - bottom left -->
      <ellipse cx="${size * 0.1}" cy="${size * 0.9}" rx="${size * 0.55}" ry="${size * 0.5}" fill="url(#g4)" opacity="1"/>

      <!-- Green blob - center, creates mixing zone -->
      <ellipse cx="${size * 0.5}" cy="${size * 0.55}" rx="${size * 0.45}" ry="${size * 0.4}" fill="url(#g5)" opacity="0.95"/>

      <!-- Secondary mixing blobs for extra vibrancy -->
      <ellipse cx="${size * 0.35}" cy="${size * 0.7}" rx="${size * 0.4}" ry="${size * 0.35}" fill="url(#g2)" opacity="0.85"/>
      <ellipse cx="${size * 0.65}" cy="${size * 0.35}" rx="${size * 0.35}" ry="${size * 0.4}" fill="url(#g3)" opacity="0.85"/>
    </g>

    <!-- Bright highlight overlay for extra pop -->
    <rect width="${size}" height="${size}" fill="url(#g1)" opacity="0.2"/>
  `
}

// Maskable icon needs padding (safe zone is 80% of the icon, centered)
// For a 512x512 icon, the safe zone is 409x409 centered, so we need ~20% padding on each side
const createMaskableSvg = (size) => {
  const padding = Math.floor(size * 0.15) // 15% padding for safe zone
  const iconSize = size - padding * 2
  const scale = iconSize / 64

  return /* svg */ `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${createGradientBackground(size)}
    <g transform="translate(${padding}, ${padding}) scale(${scale})">
      <polygon points="12,26 46,17 37,51" fill="#fff" stroke="#fff" stroke-width="12" stroke-linejoin="round"/>
    </g>
  </svg>`
}

// Standard icon (any purpose) - white icon on gradient background
const createStandardSvg = (size) => {
  const scale = size / 64
  return /* svg */ `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${createGradientBackground(size)}
    <g transform="scale(${scale})">
      <polygon points="12,26 46,17 37,51" fill="#fff" stroke="#fff" stroke-width="12" stroke-linejoin="round"/>
    </g>
  </svg>`
}

const sizes = [192, 512]

// Optimize PNG with OxiPNG (lossless compression)
function optimizePng(filePath) {
  try {
    execSync(`oxipng -o max --strip safe "${filePath}"`, { stdio: 'pipe' })
  } catch {
    console.warn(
      `Warning: oxipng not found or failed. Install with: brew install oxipng`,
    )
  }
}

async function generateIcons() {
  const generatedFiles = []

  for (const size of sizes) {
    // Generate standard icon
    const standardSvg = createStandardSvg(size)
    const standardPath = join(publicDir, `icon-${size}.png`)
    await sharp(Buffer.from(standardSvg)).png().toFile(standardPath)
    generatedFiles.push(standardPath)
    console.log(`Generated icon-${size}.png`)

    // Generate maskable icon with safe zone padding
    const maskableSvg = createMaskableSvg(size)
    const maskablePath = join(publicDir, `icon-${size}-maskable.png`)
    await sharp(Buffer.from(maskableSvg)).png().toFile(maskablePath)
    generatedFiles.push(maskablePath)
    console.log(`Generated icon-${size}-maskable.png`)
  }

  // Also generate Apple Touch Icon (180x180)
  const appleSvg = createStandardSvg(180)
  const applePath = join(publicDir, 'apple-touch-icon.png')
  await sharp(Buffer.from(appleSvg)).png().toFile(applePath)
  generatedFiles.push(applePath)
  console.log('Generated apple-touch-icon.png')

  // Optimize all generated files with OxiPNG
  console.log('\nOptimizing with OxiPNG...')
  for (const filePath of generatedFiles) {
    optimizePng(filePath)
  }

  console.log('\nAll icons generated and optimized successfully!')
}

generateIcons().catch(console.error)
