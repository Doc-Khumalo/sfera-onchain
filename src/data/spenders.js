/**
 * Who a spender actually is, in words a reader has a chance with.
 *
 * The engine names the well-known ones, and the name it returns is the name
 * the contract goes by — "Permit2". That is correct and it is also, to anyone
 * who has not read the ERC, meaningless: the rows said an application called
 * Permit2 could take everything, and left the reader no way to find out what
 * that is or whether they ever agreed to it.
 *
 * So each entry carries two things the engine does not: the name people would
 * recognise, and one sentence saying what the contract does and why a wallet
 * ends up granting it. The sentence is the point. A name is only worth
 * printing if it answers "should this be there?", and for a shared contract
 * nobody remembers approving, only the sentence does.
 *
 * KEYED BY ADDRESS, LOWERCASED, AND ONLY WHERE THE ADDRESS IS CERTAIN.
 * A wrong name on a spender is worse than no name: it tells someone their
 * money is reachable by a company that has nothing to do with it. Every entry
 * below is a contract whose address is published by the project itself and
 * identical across chains. To add one, verify the address against the
 * project's own documentation — not against a block explorer's user-submitted
 * label, which is where wrong names come from.
 */

export const SPENDERS = {
  /* Uniswap's Permit2, deployed at the same address on every chain it is on.
     A wallet grants this once, usually on its first swap, and from then on the
     approval is shared: any application that routes through Permit2 uses the
     same standing permission. That is the whole reason it is worth naming:
     the reader is looking for the app they used, and this is not it. */
  '0x000000000022d473030f116ddee9f6b43ac78ba3': {
    name: 'Uniswap Permit2',
    /* `short` goes on the row, where there is one line and it has to earn it.
       `what` goes where the reader has asked — the row's menu and the evidence
       panel — and can take the sentence it needs. */
    short: 'shared approval contract, used by many apps',
    what: 'A shared approval contract. A wallet grants it once, usually on a first swap, and from then on every application that routes through Permit2 uses the same standing permission. It is rarely the app you remember approving.',
  },
};

/** The entry for a spender, or null. Address casing never matters. */
export function spender(address) {
  return SPENDERS[String(address || '').toLowerCase()] || null;
}
