import Layout from '@/layouts/Default'
import * as Pages from './index.ts'
import { Link } from 'react-router-dom'
import Section from '@/components/Section.tsx'
import Container from '@/components/Container.tsx'

export const ComparePage = () => {
  return (
    <Layout showBackButton={false}>
      <Section>
        <Container>
          {Object.keys(Pages).map((key, index) => {
            const name = key.replace(/^Compare/, '').replace(/Page$/, '')
            const path = name.toLowerCase()
            return (
              <Link key={index} to={path} className="block text-lg mb-4">
                {name}
              </Link>
            )
          })}
        </Container>
      </Section>
    </Layout>
  )
}
