import { cookies } from 'next/headers'

export const unstable_prefetch = { mode: 'static' }

export default async function Page() {
  await cookies()
  return (
    <main>
      <p>This page blocks when navigating inside the parent layout</p>
    </main>
  )
}
