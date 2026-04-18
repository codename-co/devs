const sharp = require('sharp')
const { join } = require('path')
const { execSync } = require('child_process')

const publicDir = join(__dirname, '..', 'public')

// SVG icon with explicit black color (for light backgrounds)
// const svgIcon = /* svg */ `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
//   <polygon points="12,26 46,17 37,51" fill="#000" stroke="#000" stroke-width="12" stroke-linejoin="round"/>
// </svg>`

// Maskable icon needs padding (safe zone is 80% of the icon, centered)
// For a 512x512 icon, the safe zone is 409x409 centered, so we need ~20% padding on each side
const createMaskableSvg = (size) => {
  const padding = Math.floor(size * 0.15) // 15% padding for safe zone
  const iconSize = size - padding * 2
  const scale = iconSize / 96

  return /* svg */ `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#6aa1ff"/>
    <g fill="#fff" transform="translate(${padding}, ${padding}) scale(${scale})">
      <defs><radialGradient id="b" cx="30%" cy="25%" r="55%"><stop stop-color="#fff"/><stop offset="40%" stop-color="#fff"/></radialGradient><filter id="a"><feGaussianBlur stdDeviation="4"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 10 -5"/></filter></defs><g filter="url(#a)"><circle cx="38" cy="42.2" r="5.8"/><circle cx="58" cy="42.2" r="5.8"/><g fill="url(#b)"><circle cx="28" cy="59.5" r="16"/><circle cx="48" cy="24.9" r="16"/><circle cx="68" cy="59.5" r="16"/></g></g>
    </g>
  </svg>`
}

// Standard icon (any purpose) - white icon
const createStandardSvg = (size) => {
  const scale = size / 96
  return /* svg */ `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#6aa1ff"/>
    <g fill="#fff" transform="scale(${scale})">
      <defs><radialGradient id="b" cx="30%" cy="25%" r="55%"><stop stop-color="#fff"/><stop offset="40%" stop-color="#fff"/></radialGradient><filter id="a"><feGaussianBlur stdDeviation="4"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 10 -5"/></filter></defs><g filter="url(#a)"><circle cx="38" cy="42.2" r="5.8"/><circle cx="58" cy="42.2" r="5.8"/><g fill="url(#b)"><circle cx="28" cy="59.5" r="16"/><circle cx="48" cy="24.9" r="16"/><circle cx="68" cy="59.5" r="16"/></g></g>
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
