import { useEffect, useState } from 'react'

interface UrlFragmentParams {
  p?: string // Prompt parameter
}

/**
 * Custom hook to read and parse URL fragment parameters
 *
 * @example
 * // URL: https://example.com/#p=My%20Little%20Prompt
 * const { prompt } = useUrlFragment()
 * // prompt = "My Little Prompt"
 *
 * @returns Object containing parsed fragment parameters
 */
export function useUrlFragment() {
  const [params, setParams] = useState<UrlFragmentParams>({})

  useEffect(() => {
    const parseFragment = () => {
      const hash = window.location.hash.slice(1) // Remove leading #

      if (!hash) {
        setParams({})
        return
      }

      // Parse URL-style parameters (e.g., p=value&other=value2)
      const searchParams = new URLSearchParams(hash)
      const parsedParams: UrlFragmentParams = {}

      // Extract prompt parameter
      const promptValue = searchParams.get('p')
      if (promptValue) {
        parsedParams.p = decodeURIComponent(promptValue)
      }

      setParams(parsedParams)
    }

    // Parse on mount
    parseFragment()

    // Listen for hash changes
    const handleHashChange = () => {
      parseFragment()
    }

    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  return {
    prompt: params.p,
    hasPrompt: !!params.p,
  }
}
