/**
 * Wallet connection. EIP-6963 for discovery, EIP-1193 for everything after.
 *
 * No wallet library. EIP-6963 is an announcement protocol: the page dispatches
 * one event, every installed wallet answers with its own provider, and the
 * person picks. That is a few dozen lines and it supports whatever they have
 * installed, where hardcoding `window.ethereum` silently picks whichever
 * extension won the race to overwrite it.
 *
 * This module never signs and never holds a key. It asks a wallet for an
 * address and passes requests through. Marketing Plan §30 — we do not sign on
 * your behalf.
 */

/** Discover installed wallets. Resolves after giving providers time to answer. */
export function discover(timeout = 350) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve([]);

    const found = new Map();

    function onAnnounce(event) {
      const { info, provider } = event.detail || {};
      if (info?.uuid && provider) found.set(info.uuid, { info, provider });
    }

    window.addEventListener('eip6963:announceProvider', onAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce);
      const list = [...found.values()];

      /* A wallet that predates EIP-6963 only exposes window.ethereum. Include
         it, but only when nothing announced itself, so a modern wallet is not
         listed twice under two names. */
      if (list.length === 0 && window.ethereum) {
        list.push({
          info: { uuid: 'injected', name: 'Browser wallet', icon: null },
          provider: window.ethereum,
        });
      }

      resolve(list);
    }, timeout);
  });
}

export async function connect(provider) {
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  const chainId = await provider.request({ method: 'eth_chainId' });
  if (!accounts?.length) throw new Error('No account was returned.');
  return { address: accounts[0], chainId: Number(chainId) };
}

/** Ask the wallet to move chains. The wallet may refuse, and that is its right. */
export async function switchChain(provider, chainId) {
  await provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: `0x${chainId.toString(16)}` }],
  });
}

/** Subscribe to account and chain changes. Returns an unsubscribe function. */
export function watch(provider, { onAccounts, onChain }) {
  if (!provider?.on) return () => {};
  const a = (accts) => onAccounts?.(accts?.[0] ?? null);
  const c = (id) => onChain?.(Number(id));
  provider.on('accountsChanged', a);
  provider.on('chainChanged', c);
  return () => {
    provider.removeListener?.('accountsChanged', a);
    provider.removeListener?.('chainChanged', c);
  };
}

/**
 * Hand an unsigned transaction to the wallet.
 *
 * This is the whole doctrine in one function. We construct the payload, we
 * describe it, and then we stop. The wallet asks for the signature and the
 * person gives it or does not. We never see a key and we cannot proceed
 * without them.
 */
export async function send(provider, tx) {
  return provider.request({ method: 'eth_sendTransaction', params: [tx] });
}
