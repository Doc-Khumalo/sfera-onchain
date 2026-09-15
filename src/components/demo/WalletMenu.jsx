import { useState } from 'react';
import { Popover } from 'radix-ui';
import { ChainMark } from '../ui/ChainMark.jsx';
import { format, isDollar } from '../../lib/api.js';

/**
 * Everything this page knows about the wallet it is reading, and everything
 * the product will do with it.
 *
 * The head carried an address and a pencil. A connected wallet is a great deal
 * more than a string: it is on a chain, it holds balances, it can be switched,
 * re-read, handed a transaction, or let go. None of that was reachable, and
 * the capabilities the product is being built towards were not stated at all.
 *
 * WHAT CANNOT BE DONE IS NOT SHOWN. A menu is a set of things to do, and a
 * row that cannot be pressed is furniture in the way of the ones that can.
 * The roadmap it used to carry — limiting instead of revoking, correcting
 * several at once, signed permissions, account abstraction — belongs on the
 * page that publishes the roadmap, not in the control for one wallet.
 *
 * The page's own limits are still stated where they bear on something: the
 * ledger's note under the table, the readings that say "unknown" outright,
 * and the handoff, which refuses to hand over bytes that do not do what the
 * button said.
 */

/* One row. `soon` turns it into a statement rather than a control, and the
   reason is required — an item disabled without one is just a dead button. */
function Row({ label, hint, onClick, href, soon, mark }) {
  const inner = (
    <>
      {mark && <span className="wm-mark">{mark}</span>}
      <span className="wm-text">
        <b>{label}</b>
        {hint && <em>{hint}</em>}
      </span>
      {soon && <span className="wm-soon">{soon}</span>}
    </>
  );

  /* Not available here: not shown. */
  if (soon) return null;

  /* A row with nothing to do is a statement, not a control. Rendered as a
     button it was focusable, took the ring when the menu opened, and did
     nothing when pressed. */
  if (!onClick && !href) return <li className="wm-row wm-said">{inner}</li>;
  if (href) {
    return (
      <li className="wm-row">
        <a href={href} target="_blank" rel="noopener">{inner}</a>
      </li>
    );
  }
  return (
    <li className="wm-row">
      <button type="button" onClick={onClick}>{inner}</button>
    </li>
  );
}

export default function WalletMenu({
  address, walletName, mode, chain, chains, perms, explorer,
  onReRead, onSwitch, onChange, onForget, scanning,
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const connected = mode === 'wallet';

  /* What we can see of what this wallet holds: the balances the engine
     returned for the tokens it asked about, summed where they are dollars.
     Not a portfolio — it is every token we looked at and no others, and the
     row says so rather than implying a total. */
  const held = perms
    .filter((p) => isDollar(p.symbol) && p.held != null)
    .reduce((n, p) => {
      const d = p.decimals || 0;
      let v = 0n;
      try { v = BigInt(p.held); } catch { v = 0n; }
      return n + (d > 2 ? v / (10n ** BigInt(d - 2)) : v * (10n ** BigInt(2 - d)));
    }, 0n);

  const link = chain?.explorer || explorer;

  function copy() {
    navigator.clipboard?.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }, () => {});
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className="a-wallet-trigger" aria-label="This wallet">
          <span className="a-avatar" aria-hidden="true" />
          <b>{address.slice(0, 6)}…{address.slice(-4)}</b>
          <svg viewBox="0 0 10 6" aria-hidden="true" className="a-wallet-chev">
            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor"
              strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className="wmenu dash" align="start" sideOffset={10} collisionPadding={16}>
          <header className="wm-head">
            <span className="a-avatar" aria-hidden="true" />
            <span>
              <b>{connected ? walletName || 'Connected wallet' : 'Public address'}</b>
              <em>{address}</em>
            </span>
          </header>

          <p className="wm-rule">On chain</p>
          <ul className="wm-list">
            {/* A statement when nothing is connected — a public address is on
                every chain we read and cannot be switched. */}
            <Row
              mark={chain ? <ChainMark chain={chain} size={18} /> : null}
              label={chain?.name ?? 'Every supported chain'}
              hint={`${chains.length} read on every pass`}
              onClick={connected && chains[0] ? () => onSwitch(chains[0].id) : undefined}
            />
            <Row
              label={`$${format(held.toString(), 2, null, true)} in stablecoins`}
              hint="of the tokens we asked about, not a portfolio"
            />
          </ul>

          <p className="wm-rule">Do</p>
          <ul className="wm-list">
            <Row label={scanning ? 'Reading…' : 'Re-read this wallet'}
              hint="asks every supported chain again"
              onClick={scanning ? undefined : onReRead} />
            <Row label={copied ? 'Copied' : 'Copy the address'} onClick={copy} />
            {link && <Row label="Open in the explorer" href={`${link}/address/${address}`} />}
            <Row label="Read a different wallet" onClick={onChange} />
            {connected && (
              <Row label="Disconnect" hint="forgets it here; nothing is revoked" onClick={onForget} />
            )}
          </ul>

          <p className="wm-note">
            We never request recovery phrases or private keys, and we do not
            sign on your behalf.
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
