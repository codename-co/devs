import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export const AgentsStartPage = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const path = (location.pathname + location.hash).replace(
      /\/start#/,
      '/run#',
    )
    navigate(path, {
      replace: true,
    })
  }, [])

  return null
}
