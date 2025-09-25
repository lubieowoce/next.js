import { InvariantError } from '../../shared/lib/invariant-error'

/**
 * This is a utility function to make scheduling sequential tasks that run back to back easier.
 * We schedule on the same queue (setImmediate) at the same time to ensure no other events can sneak in between.
 */
export function scheduleInSequentialTasks<R>(
  render: () => R | Promise<R>,
  followup: () => void
): Promise<R> {
  if (process.env.NEXT_RUNTIME === 'edge') {
    throw new InvariantError(
      '`scheduleInSequentialTasks` should not be called in edge runtime.'
    )
  } else {
    return new Promise((resolve, reject) => {
      let pendingResult: R | Promise<R>
      setImmediate(() => {
        try {
          pendingResult = render()
        } catch (err) {
          reject(err)
        }
      })
      setImmediate(() => {
        followup()
        resolve(pendingResult)
      })
    })
  }
}

/**
 * This is a utility function to make scheduling sequential tasks that run back to back easier.
 * We schedule on the same queue (setImmediate) at the same time to ensure no other events can sneak in between.
 * The function that runs in the second task gets access to the first tasks's result.
 */
export function pipelineInSequentialTasks<A, B>(
  render: () => A,
  followup: (a: A) => B | Promise<B>
): Promise<B> {
  if (process.env.NEXT_RUNTIME === 'edge') {
    throw new InvariantError(
      '`pipelineInSequentialTasks` should not be called in edge runtime.'
    )
  } else {
    return new Promise((resolve, reject) => {
      let renderResult: A = undefined!
      setImmediate(() => {
        try {
          renderResult = render()
        } catch (err) {
          clearImmediate(followupId)
          reject(err)
        }
      })
      const followupId = setImmediate(() => {
        // if `render` threw, then the `followup` immediate would've been cleared,
        // so if we got here, we're guaranteed to have a `renderResult`.
        try {
          resolve(followup(renderResult))
        } catch (err) {
          reject(err)
        }
      })
    })
  }
}
