/**
 * Helper type for v2 compat components.
 * Accepts any props (v2 compat) but returns proper JSX (not any).
 */
import type { JSX } from 'react'

/**
 * A component that accepts any props for v2 backward compatibility.
 * This prevents TS2322 errors on v2 props while keeping return types typed.
 */
export type V2Compat = (props: any) => JSX.Element

/**
 * Creates a v2-compat component with compound sub-components.
 * The main component accepts any props, compound members keep their v3 types.
 */
export function withCompound<T extends Record<string, any>>(
  main: (props: any) => JSX.Element,
  compounds: T
): V2Compat & T {
  const result = main as V2Compat & T
  Object.assign(result, compounds)
  return result
}
