'use server'

export async function appendNameAlternate(state, formData) {
  return state + ':' + formData.get('name')
}
