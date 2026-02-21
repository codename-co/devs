import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export const AgentsStartPage = () => {
  const navigate = useNavigate()
  const { agentSlug } = useParams<{ agentSlug?: string }>()

  useEffect(() => {
    const path = agentSlug ? `/agents/run/${agentSlug}` : '/agents/run'
    navigate(path, {
      replace: true,
    })
  }, [agentSlug])

  return null
}
