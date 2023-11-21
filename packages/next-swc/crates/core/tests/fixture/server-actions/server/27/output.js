/* __next_internal_action_entry_do_not_use__ {"6d53ce510b2e36499b8f56038817b9bad86cabb4":"$$ACTION_0"} */ import { createActionProxy } from "private-next-rsc-action-proxy";
import { encryptActionBoundArgs, decryptActionBoundArgs } from "private-next-rsc-action-encryption";
import deleteFromDb from 'db';
export function Item3({ id1, id2 }) {
    const el = <Button action={createActionProxy("6d53ce510b2e36499b8f56038817b9bad86cabb4", $$ACTION_0).bind(null, encryptActionBoundArgs("6d53ce510b2e36499b8f56038817b9bad86cabb4", [
        x,
        id1,
        id2
    ]))}>Delete</Button>;
    const x = 5;
    return el;
    function deleteItem() {}
}
export async function $$ACTION_0($$ACTION_CLOSURE_BOUND) {
    var [$$ACTION_ARG_0, $$ACTION_ARG_1, $$ACTION_ARG_2] = await decryptActionBoundArgs("6d53ce510b2e36499b8f56038817b9bad86cabb4", $$ACTION_CLOSURE_BOUND);
    console.log($$ACTION_ARG_0);
    await deleteFromDb($$ACTION_ARG_1);
    await deleteFromDb($$ACTION_ARG_2);
}
