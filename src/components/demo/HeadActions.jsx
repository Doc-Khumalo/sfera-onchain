import { useState } from 'react';
import { Tooltip } from '../ui/Tooltip.jsx';

/**
 * What can be done to the wallet on screen, on screen.
 *
 * These were inside a popover behind the address. Every one of them is a
 * single action on the thing the bar is already naming, and a single action
 * does not need a menu in front of it — a menu is for when there are more
 * choices than there is room for, and there is room for three marks.
 *
 * Re-read used to be a fourth. The Read button beside the address does exactly
 * that when the address has not been edited, and two controls performing one
 * action is one control too many on a bar this busy.
 *
 * Marks rather than words, because the bar has one line and four labels would
 * take it. Each carries its name in a tooltip and in aria-label, so the mark is
 * a shorthand for people who want one and never the only statement of what a
 * control does.
 */

const Mark = ({ d, fill }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true" fill={fill ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

function Act({ label, onClick, href, disabled, children }) {
  const inner = href
    ? <a className="hact" href={href} target="_blank" rel="noopener" aria-label={label}>{children}</a>
    : (
      <button type="button" className="hact" onClick={onClick} disabled={disabled} aria-label={label}>
        {children}
      </button>
    );

  return (
    <Tooltip label={label}>
      {/* A disabled control fires no pointer events, so the trigger wraps it
          rather than sitting on it. */}
      <span className="inline-flex">{inner}</span>
    </Tooltip>
  );
}

export default function HeadActions({ address, explorer, connected, onForget }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); };
    /* The clipboard API is only there on a secure origin, and it refuses in a
       tab that is not focused. Falling back keeps the mark from being a button
       that does nothing at all in those cases. */
    const old = () => {
      const box = document.createElement('textarea');
      box.value = address;
      box.setAttribute('readonly', '');
      box.style.cssText = 'position:fixed;top:0;left:-9999px';
      document.body.appendChild(box);
      box.select();
      try { if (document.execCommand('copy')) done(); } catch { /* nothing else to try */ }
      box.remove();
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(address).then(done, old);
    else old();
  }

  return (
    <span className="hacts">
      <Act label={copied ? 'Copied' : 'Copy the address'} onClick={copy}>
        {copied
          ? <Mark d="M3.5 8.5l3 3 6-6.5" />
          : <Mark d="M5.5 5.5V3.2A1.2 1.2 0 0 1 6.7 2h6.1A1.2 1.2 0 0 1 14 3.2v6.1a1.2 1.2 0 0 1-1.2 1.2h-2.3M3.2 5.5h6.1A1.2 1.2 0 0 1 10.5 6.7v6.1A1.2 1.2 0 0 1 9.3 14H3.2A1.2 1.2 0 0 1 2 12.8V6.7A1.2 1.2 0 0 1 3.2 5.5Z" />}
      </Act>

      {explorer && (
        <Act label="Open in the explorer" href={`${explorer}/address/${address}`}>
          <Mark d="M9.5 2.5H13.5V6.5M13.5 2.5L7.5 8.5M12 9.8v2.9a1.3 1.3 0 0 1-1.3 1.3H3.8a1.3 1.3 0 0 1-1.3-1.3V5.8a1.3 1.3 0 0 1 1.3-1.3h2.9" />
        </Act>
      )}

      {connected && (
        <Act label="Disconnect: forgets it here, nothing is revoked" onClick={onForget}>
          <Mark d="M6.2 2.5H3.8a1.3 1.3 0 0 0-1.3 1.3v8.4a1.3 1.3 0 0 0 1.3 1.3h2.4M10 11l3-3-3-3M13 8H6" />
        </Act>
      )}
    </span>
  );
}
