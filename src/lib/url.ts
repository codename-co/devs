/**
 * Fetch a URL via our CORS proxy.
 *
 * In development, this uses the Vite dev server proxy at /api/proxy.
 * In production, this uses the devs-proxy service at proxy.devs.new.
 */
export const fetchViaCorsProxy = async (
  url: string,
  options?: RequestInit,
): Promise<Response> => {
  const isDev =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'

  const proxyBase = isDev ? '/api/proxy' : 'https://proxy.devs.new/api/proxy'

  const proxyUrl = `${proxyBase}?url=${encodeURIComponent(url)}`

  const response = await fetch(proxyUrl, {
    ...options,
    headers: {
      ...options?.headers,
      // Origin header is automatically set by the browser
    },
  })

  if (!response.ok) {
    throw new Error(`CORS proxy error: ${response.status}`)
  }

  return response
}

export const uuidToBase64url = (uuid: string): string => {
  const hex = uuid.replace(/-/g, '')
  const bytes = new Uint8Array(
    hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  )
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export const base64urlToUuid = (base64url: string): string => {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const paddedBase64 = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '=',
  )
  const binary = atob(paddedBase64)
  const hex = Array.from(binary)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
