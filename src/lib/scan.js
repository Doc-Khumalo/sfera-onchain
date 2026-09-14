import { createPublicClient, custom, http, erc20Abi } from 'viem';
import { chainOf, labelFor, shorten, MULTICALL3 } from './chains.js';

/**
 * Read standing permissions from the chain.
 *
 * One Multicall3 batch, not one request per allowance. Base's public RPC rate
 * limits aggressively and a browser issuing a hundred sequential eth_calls
 * gets throttled into a half-read ledger, which for this product is the worst
 * possible failure — a permission that exists but did not load is
 * indistinguishable on screen from one that was never granted. Batching makes
 * the read atomic: it either comes back whole or it fails loudly.
 */

const UINT256_MAX = (2n ** 256n) - 1n;

/** Anything at or above half of uint256 is unbounded in practice. Wallets and
    routers use several different "infinite" constants and they are all far
    above any real balance. */
export const UNBOUNDED_FLOOR = UINT256_MAX / 2n;

export function isUnbounded(value) {
  return typeof value === 'bigint' && value >= UNBOUNDED_FLOOR;
}

/** Read through the connected wallet when we have one. Its RPC is already
    chosen and funded by the wallet vendor, which is kinder than hammering a
    public endpoint from every visitor. */
export function readClient(chain, provider) {
  return createPublicClient({
    transport: provider ? custom(provider) : http(chain.rpc),
  });
}

export async function scan({ chainId, owner, provider }) {
  const chain = chainOf(chainId);
  if (!chain) {
    return { supported: false, chain: null, tokens: [], permissions: [] };
  }

  if (chain.tokens.length === 0) {
    return { supported: true, chain, tokens: [], permissions: [] };
  }

  const client = readClient(chain, provider);

  /* Two passes. Metadata first, because a token that will not answer symbol()
     or decimals() cannot have its allowance rendered as a quantity, and
     guessing eighteen decimals would misstate exposure by orders of
     magnitude. */
  const metaCalls = chain.tokens.flatMap((address) => [
    { address, abi: erc20Abi, functionName: 'symbol' },
    { address, abi: erc20Abi, functionName: 'decimals' },
    { address, abi: erc20Abi, functionName: 'balanceOf', args: [owner] },
  ]);

  /* Multicall3 is at the same address on every chain that has it, and this
     client is built from a bare transport with no chain config, so the address
     is passed rather than looked up. */
  const metaRes = await client.multicall({
    contracts: metaCalls,
    allowFailure: true,
    multicallAddress: MULTICALL3,
  });

  /* allowFailure keeps one broken token from sinking the read, but it also
     swallows a dead RPC: when the transport fails, viem marks every call
     failed rather than throwing, and the ledger renders a confident, empty,
     wrong answer. Nothing failing is a wallet with odd tokens in it. Every
     single thing failing is the chain not being read at all, and on a
     security product those two must never look alike. */
  if (metaRes.length > 0 && metaRes.every((r) => r.status !== 'success')) {
    throw new Error('No call to the chain succeeded. Nothing is shown rather than an empty ledger.');
  }

  const tokens = chain.tokens.map((address, i) => {
    const symbol = metaRes[i * 3]?.result;
    const decimals = metaRes[i * 3 + 1]?.result;
    const balance = metaRes[i * 3 + 2]?.result;
    return {
      address,
      symbol: typeof symbol === 'string' ? symbol : null,
      decimals: typeof decimals === 'number' ? decimals : null,
      balance: typeof balance === 'bigint' ? balance : null,
      readable: typeof symbol === 'string' && typeof decimals === 'number',
    };
  });

  const readable = tokens.filter((t) => t.readable);

  const pairs = [];
  for (const token of readable) {
    for (const spender of chain.spenders) pairs.push({ token, spender });
  }

  const allowRes = await client.multicall({
    contracts: pairs.map(({ token, spender }) => ({
      address: token.address,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [owner, spender],
    })),
    allowFailure: true,
    multicallAddress: MULTICALL3,
  });

  if (allowRes.length > 0 && allowRes.every((r) => r.status !== 'success')) {
    throw new Error('No allowance could be read. Nothing is shown rather than an empty ledger.');
  }

  const unread = allowRes.filter((r) => r.status !== 'success').length;

  const permissions = [];
  pairs.forEach(({ token, spender }, i) => {
    const value = allowRes[i]?.result;
    if (typeof value !== 'bigint' || value === 0n) return; // nothing granted

    permissions.push({
      id: `${token.address}-${spender}`.toLowerCase(),
      token,
      spender,
      app: labelFor(chain, spender),
      spenderShort: shorten(spender),
      allowance: value,
      unbounded: isUnbounded(value),
      /* Exposure is what the spender can actually take right now, which is the
         smaller of what it may take and what you hold. An unlimited allowance
         against an empty balance exposes nothing today and everything
         tomorrow, and the ledger has to say both. */
      reachable: token.balance === null ? null : (value < token.balance ? value : token.balance),
    });
  });

  return {
    supported: true,
    chain,
    tokens,
    permissions,
    checked: { tokens: chain.tokens.length, spenders: chain.spenders.length, pairs: pairs.length },
    unreadable: tokens.filter((t) => !t.readable).length,
    /* Pairs that individually failed. Surfaced rather than counted as absent. */
    unread,
  };
}

/** Re-read one allowance, for verifying an outcome after the wallet returns. */
export async function readAllowance({ chainId, owner, spender, token, provider }) {
  const chain = chainOf(chainId);
  const client = readClient(chain, provider);
  return client.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner, spender],
  });
}
