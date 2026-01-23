// import { cookies } from 'next/headers'
import { ReactNode } from 'react'

export const unstable_prefetch = false

export default async function Layout({ children }: { children: ReactNode }) {
  // await cookies()
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return (
    <>
      <div>This layout blocks the children</div>
      <hr />
      {children}
    </>
  )
}
