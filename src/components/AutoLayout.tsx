import React from 'react'

import { cn } from '@/lib/utils'

const SPACING_MATRIX = new Map<string, string>()

// Example spacing matrix
SPACING_MATRIX.set('DEFAULT,DEFAULT', 'mb-8')
SPACING_MATRIX.set('Title,Input', 'mb-16')
SPACING_MATRIX.set('Input,Button', 'mb-2')

interface AutoLayoutProps {
  children: React.ReactNode
  direction?: 'vertical' | 'horizontal'
}

function getComponentType(child: React.ReactNode): string | undefined {
  if (React.isValidElement(child)) {
    const component = child.type as React.ComponentType<object>
    return component.displayName || component.name
  }
  return undefined
}

interface ComponentWithProps {
  className?: string
  children?: React.ReactNode
}

export const AutoLayout = ({
  children,
  direction = 'vertical',
}: AutoLayoutProps) => {
  const childrenArray = React.Children.toArray(children)

  return (
    <div className={`flex ${direction === 'vertical' ? 'flex-col' : ''}`}>
      {childrenArray.map((child, index) => {
        if (!React.isValidElement<ComponentWithProps>(child)) {
          return child
        }

        const newProps: ComponentWithProps & {
          [key: string]: React.ReactNode
        } = {
          ...child.props,
        }

        // Recursive step
        if (newProps.children && typeof newProps.children !== 'string') {
          newProps.children = (
            <AutoLayout direction={direction}>{newProps.children}</AutoLayout>
          )
        }

        // Spacing step
        if (index < childrenArray.length - 1) {
          const currentChildType = getComponentType(child)
          const nextChild = childrenArray[index + 1]
          const nextChildType = getComponentType(nextChild)

          if (currentChildType && nextChildType) {
            const spacingClass =
              SPACING_MATRIX.get(`${currentChildType},${nextChildType}`) ||
              SPACING_MATRIX.get(`${currentChildType},DEFAULT`) ||
              SPACING_MATRIX.get(`DEFAULT,${nextChildType}`) ||
              SPACING_MATRIX.get(`DEFAULT,DEFAULT`)

            newProps.className = cn(child.props.className, spacingClass)
          }
        }

        return React.cloneElement(child, newProps)
      })}
    </div>
  )
}
