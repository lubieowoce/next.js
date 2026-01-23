'use client'

import { use } from 'react'

const promise = new Promise<never>(() => {})

export function Log({ message }) {
  console.log('Hi from log!', message)
  use(promise)
  return null
}
