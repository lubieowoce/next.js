export const unstable_prefetch = { mode: 'static' }

export default async function Page({
  params,
}: {
  params: Promise<{ param: string }>
}) {
  return (
    <main>
      <div>
        <p>Params need a suspense boundary when runtime-prefetched:</p>
        <Runtime params={params} />
      </div>
    </main>
  )
}

async function Runtime({ params }: { params: Promise<{ param: string }> }) {
  const { param } = await params
  return <div id="runtime-content">Param value: {param}</div>
}
