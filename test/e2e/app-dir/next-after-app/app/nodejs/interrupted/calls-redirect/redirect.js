'use client'

import { usePathname, redirect } from 'next/navigation'

export function RedirectWithPathPrefix({ path }) {
  const pathname = usePathname()
  const firstSegment = pathname.match(/^(?<prefix>\/[^/]+?)\/.*/).groups.prefix
  redirect(firstSegment + path)
}
