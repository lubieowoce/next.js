'use client'

import { ComponentProps } from 'react'

export function DebugLinkMPA({
  href,
  ...props
}: Omit<ComponentProps<'a'>, 'children'>) {
  return <a href={href}>{href}</a>
}
