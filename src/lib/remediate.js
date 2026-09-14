import { encodeFunctionData, erc20Abi, parseUnits } from 'viem';

/**
 * Construct the correction, unsigned.
 *
 * UX Specification §51, the wallet handoff principle: TX Guard must never
 * create ambiguity about where authorization happens. This module returns a
 * transaction object and nothing else. It does not send it, it cannot sign it,
 * and the calldata it builds is a plain ERC-20 `approve` that anyone can
 * decode and check for themselves.
 */

export function buildRevoke({ token, spender }) {
  return {
    to: token,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, 0n],
    }),
    value: '0x0',
  };
}

export function buildLimit({ token, spender, amount, decimals }) {
  const value = typeof amount === 'bigint' ? amount : parseUnits(String(amount), decimals);
  return {
    to: token,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, value],
    }),
    value: '0x0',
  };
}

/**
 * Some tokens, USDT on Ethereum being the well known one, revert when an
 * allowance is changed from one non-zero value to another. The safe sequence
 * is to zero it first. The proof of concept does not chain two transactions,
 * so it offers revoke rather than a reduction that might revert, and says why.
 *
 * UX Specification §62 reaches the same conclusion from the other direction:
 * the specification intentionally prevents automatic one-step replacement of
 * an arbitrary existing non-zero allowance.
 */
export function canReduceDirectly(permission) {
  return permission.allowance === 0n;
}
