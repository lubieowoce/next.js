import type { ActionManifest } from '../../build/webpack/plugins/flight-client-entry-plugin'
import { InvariantError } from '../../shared/lib/invariant-error'
import { normalizeAppPath } from '../../shared/lib/router/utils/app-paths'
import { pathHasPrefix } from '../../shared/lib/router/utils/path-has-prefix'
import { removePathPrefix } from '../../shared/lib/router/utils/remove-path-prefix'

export type ServerModuleMap = Record<
  string,
  | {
      id: string | number
      chunks: string[]
      name: string
    }
  | undefined
>

// This function creates a Flight-acceptable server module map proxy from our
// Server Reference Manifest similar to our client module map.
// This is because our manifest contains a lot of internal Next.js data that
// are relevant to the runtime, workers, etc. that React doesn't need to know.
export function createServerModuleMap({
  serverActionsManifest,
  pageName,
}: {
  serverActionsManifest: ActionManifest
  pageName: string
}): ServerModuleMap {
  return new Proxy({} as ServerModuleMap, {
    get: (target, id: string) => {
      if (id in target) {
        return target[id]!
      }

      const runtime = process.env.NEXT_RUNTIME === 'edge' ? 'edge' : 'node'
      const workerPageName = normalizeWorkerPageName(pageName)
      let moduleId: string | number | undefined =
        serverActionsManifest[runtime][id]?.workers?.[workerPageName]

      if (moduleId === undefined) {
        // FIXME: we can't actually do this, the worker might be in a different lambda!
        // i guess we need to bail out of here, catch the error, and forward instead?
        // try other workers
        const fallbackWorkerPageName = selectWorkerPageNameForForwarding(
          id,
          pageName,
          serverActionsManifest
        )
        if (fallbackWorkerPageName) {
          moduleId =
            serverActionsManifest[runtime][id]?.workers?.[
              fallbackWorkerPageName
            ]
        }
      }

      if (moduleId === undefined) {
        throw new InvariantError(
          `Could not find a worker for action '${id}' on page '${pageName}' in the Server Actions Manifest`
        )
      }

      const result = {
        id: moduleId,
        name: id,
        chunks: [],
      }
      target[id] = result
      return result
    },
  })
}

/**
 * Checks if the requested action has a worker for the current page.
 * If not, it returns the first worker that has a handler for the action.
 */
export function selectWorkerForForwarding(
  actionId: string,
  pageName: string,
  serverActionsManifest: ActionManifest
) {
  const workerPageName = selectWorkerPageNameForForwarding(
    actionId,
    pageName,
    serverActionsManifest
  )
  if (workerPageName === undefined) return
  return denormalizeWorkerPageName(workerPageName)
}

/**
 * Checks if the requested action has a worker for the current page.
 * If not, it returns the id of first worker that has a handler for the action.
 */
function selectWorkerPageNameForForwarding(
  actionId: string,
  pageName: string,
  serverActionsManifest: ActionManifest
) {
  const workers =
    serverActionsManifest[
      process.env.NEXT_RUNTIME === 'edge' ? 'edge' : 'node'
    ][actionId]?.workers
  const workerName = normalizeWorkerPageName(pageName)

  // no workers, nothing to forward to
  if (!workers) return

  // if there is a worker for this page, no need to forward it.
  if (workers[workerName]) {
    return
  }

  // otherwise, grab the first worker that has a handler for this action id
  return Object.keys(workers)[0]
}

/**
 * The flight entry loader keys actions by bundlePath.
 * bundlePath corresponds with the relative path (including 'app') to the page entrypoint.
 */
function normalizeWorkerPageName(pageName: string) {
  if (pathHasPrefix(pageName, 'app')) {
    return pageName
  }

  return 'app' + pageName
}

/**
 * Converts a bundlePath (relative path to the entrypoint) to a routable page name
 */
function denormalizeWorkerPageName(bundlePath: string) {
  return normalizeAppPath(removePathPrefix(bundlePath, 'app'))
}
