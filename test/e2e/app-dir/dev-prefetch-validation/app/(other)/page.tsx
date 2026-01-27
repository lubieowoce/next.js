import { DebugLinkMPA } from '../../components/debug-link'
import { cacheLife } from 'next/cache'

export default async function Page() {
  'use cache'
  cacheLife('minutes')
  return (
    <main>
      <h2>Runtime</h2>
      <ul>
        <li>
          <DebugLinkMPA href="/runtime/suspense-around-dynamic" />
        </li>
        <li>
          <DebugLinkMPA href="/runtime/no-suspense-around-params/123" />
        </li>
        <li>
          <DebugLinkMPA href="/runtime/missing-suspense-around-dynamic" />
        </li>
        <li>
          <DebugLinkMPA href="/runtime/missing-suspense-around-dynamic-layout" />
        </li>
        <li>
          <DebugLinkMPA href="/runtime/suspense-too-high" />
        </li>
      </ul>

      <h2>Static</h2>
      <ul>
        <li>
          <DebugLinkMPA href="/static/suspense-around-dynamic" />
        </li>
        <li>
          <DebugLinkMPA href="/static/missing-suspense-around-dynamic" />
        </li>
        <li>
          <DebugLinkMPA href="/static/missing-suspense-around-params/123" />
        </li>
        <li>
          <DebugLinkMPA href="/static/missing-suspense-around-dynamic-layout" />
        </li>
        <li>
          <DebugLinkMPA href="/static/suspense-too-high" />
        </li>
        <li>
          <DebugLinkMPA href="/static/blocking-layout" />
        </li>
        <li>
          <DebugLinkMPA href="/static/blocking-layout/missing-suspense-around-dynamic" />
        </li>
      </ul>

      <h2>Misc</h2>
      <ul>
        <li>
          <DebugLinkMPA href="/nested/sub" />
        </li>
      </ul>
    </main>
  )
}
