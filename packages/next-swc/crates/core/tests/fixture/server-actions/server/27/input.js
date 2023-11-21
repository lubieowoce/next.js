import deleteFromDb from 'db'

export function Item3({ id1, id2 }) {
  const el = <Button action={deleteItem}>Delete</Button>
  const x = 5
  return el
  async function deleteItem() {
    'use server'
    console.log(x)
    await deleteFromDb(id1)
    await deleteFromDb(id2)
  }
}
