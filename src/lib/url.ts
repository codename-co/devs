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
