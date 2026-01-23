'use client'

import type { ReactNode } from 'react'
import { PREFETCH_VALIDATION_BOUNDARY_NAME } from './boundary-constants'

// We use a namespace object to allow us to recover the name of the function
// at runtime even when production bundling/minification is used.
const NameSpace = {
  [PREFETCH_VALIDATION_BOUNDARY_NAME]: function ({
    children,
  }: {
    children: ReactNode
  }) {
    return children
  },
}

export const PrefetchValidationBoundary =
  // We use slice(0) to trick the bundler into not inlining/minifying the function
  // so it retains the name inferred from the namespace object
  NameSpace[
    PREFETCH_VALIDATION_BOUNDARY_NAME.slice(
      0
    ) as typeof PREFETCH_VALIDATION_BOUNDARY_NAME
  ]
