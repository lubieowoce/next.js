import { cookies } from 'next/headers'

export default async function Slot() {
  await cookies()
  return (
    <p>This is a parallel layout slot that awaits cookies() without Suspense</p>
  )
}
