import { connection } from 'next/server'
import { Suspense } from 'react'

export const unstable_prefetch = { mode: 'static' }

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <p>
        The page blocks on dynamic content, but shows a fallback, so it's still
        instant when navigating from <code>/nested/*</code>
      </p>
      <Dynamic />
    </Suspense>
  )
}

async function Dynamic() {
  await connection()
  return 'Dynamic content from page'
}
