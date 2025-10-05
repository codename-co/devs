export const availableMemory = navigator.deviceMemory

interface VideoCardInfo {
  vendor: string
  renderer: string
  brand?: string
  model?: string
  deviceId?: string
}

// Cache the result to avoid redundant computations
let _videoCardInfo: VideoCardInfo

/**
 * Gets information about the user's video card using WebGL.
 * Caches the result after the first call for performance.
 * @return An object containing vendor, renderer, brand, model, and deviceId of the video card.
 * Undefined if WebGL is not supported.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_debug_renderer_info
 */
export const getVideoCardInfo = () => {
  if (_videoCardInfo) return _videoCardInfo

  const gl = document.createElement('canvas').getContext('webgl')
  const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info')
  if (!gl || !debugInfo) {
    return
  }

  const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
  const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)

  const details =
    /(?<renderer>\w+).*?\((?<brand>[A-Za-z\s\.]+?),\s*([^,]+: )?(?<model>[^,(]+)(?:\s*\((?<deviceId>0x[0-9A-Fa-f]+)\))?/.exec(
      renderer,
    )?.groups

  _videoCardInfo = {
    vendor,
    renderer,
    brand: details?.brand,
    model: details?.model,
    deviceId: details?.deviceId,
  }
  return _videoCardInfo
}

export const deviceName = () => {
  const videoCard = getVideoCardInfo()
  return (
    videoCard?.model ?? videoCard?.brand ?? videoCard?.renderer ?? 'Unknown'
  )
}

export const isWebGPUSupported = () => {
  return 'gpu' in navigator
}

export const isMobileDevice = () => {
  return /Mobi|Android/i.test(navigator.userAgent)
}

export const isLandscape = () => {
  return window.innerWidth > window.innerHeight
}

export const isSmallHeight = () => {
  return window.innerHeight < 500
}

/**
 * Check if the device is low-end (less than 2GB RAM or a mobile device).
 * @returns {boolean} True if the device is low-end, false otherwise.
 */
export const isLowEndDevice = () => {
  return (availableMemory ?? 4) <= 2 || isMobileDevice()
}
