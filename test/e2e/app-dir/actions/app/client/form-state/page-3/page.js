import { appendName } from '../actions'
import { Form } from './client'

export default function Page() {
  return (
    <Form
      action={async (state, formData) => {
        'use server'
        return appendName(state, formData)
      }}
    />
  )
}
