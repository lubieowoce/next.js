import { unstable_after as after } from 'next/server'
import { cliLog } from '../../../../utils/log'
import { RedirectWithPathPrefix } from './redirect'

export default function Page() {
  after(() => {
    cliLog({
      source: '[page] /interrupted/calls-redirect',
    })
  })
  // we don't know if we're in "/node" or "/edge" and can't get the pathname,
  // so we can't do this:
  //   redirect(prefix + '/interrupted/redirect-target')
  // instead, we have to do it with a client component
  return <RedirectWithPathPrefix path={'/interrupted/redirect-target'} />
}
