import { useEffect, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { isAddress } from 'viem';

/**
 * The two ways to name a wallet that is not this browser's.
 *
 * A wallet installed here gives an address AND the ability to sign a
 * correction, so the table stops being read-only. Scanning gives an address and
 * nothing else — every wallet app shows its address as a code on the receive
 * screen, and pointing a laptop camera at a phone is faster and less
 * error-prone than reading 42 characters aloud.
 *
 * The wallets listed are whatever answered EIP-6963 in this browser. Nothing is
 * hardcoded: if MetaMask, Rabby and Frame are all installed, all three are here
 * under their own names, and if none are, that is said plainly rather than
 * showing a button that opens nothing.
 */

const Mark = ({ d }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/**
 * What a wallet puts in its code. Usually the bare address; often EIP-681
 * (`ethereum:0x…@1`, sometimes with a `/transfer?` tail). Either way the
 * address is the only part we want, and anything without one is not an answer.
 */
export function addressIn(text) {
  const hit = String(text || '').match(/0x[a-fA-F0-9]{40}/);
  return hit && isAddress(hit[0]) ? hit[0] : null;
}

function Scanner({ onFound, onFail }) {
  const video = useRef(null);
  const [state, setState] = useState('starting');

  useEffect(() => {
    let stream = null;
    let raf = 0;
    let live = true;

    async function run() {
      let decode;
      try {
        const m = await import('jsqr');
        decode = m.default || m;
      } catch {
        if (live) { setState('nolib'); onFail?.(); }
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
      } catch {
        if (live) { setState('denied'); onFail?.(); }
        return;
      }
      if (!live) { stream.getTracks().forEach((t) => t.stop()); return; }

      const el = video.current;
      el.srcObject = stream;
      await el.play().catch(() => {});
      setState('looking');

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const tick = () => {
        if (!live) return;
        if (el.readyState === el.HAVE_ENOUGH_DATA) {
          canvas.width = el.videoWidth;
          canvas.height = el.videoHeight;
          ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const hit = decode(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' });
          const addr = hit && addressIn(hit.data);
          if (addr) { onFound(addr); return; }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    run();
    return () => {
      live = false;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="scanbox">
      <div className="scanview">
        <video ref={video} playsInline muted aria-label="What the camera sees" />
        <span className="scanframe" aria-hidden="true" />
      </div>
      <p className="scannote">
        {state === 'starting' && 'Asking for the camera…'}
        {state === 'looking' && 'Hold a wallet’s receive code up to the camera.'}
        {state === 'denied' && 'The camera was refused, or there is none. Type or paste the address instead.'}
        {state === 'nolib' && 'The scanner could not be loaded. Type or paste the address instead.'}
      </p>
    </div>
  );
}

export default function ConnectButton({ wallets = [], busy, onConnect, onAddress }) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => { if (!open) setScanning(false); }, [open]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className="cbtn" disabled={busy}>
          <Mark d="M2 5.2A1.2 1.2 0 0 1 3.2 4h9.6A1.2 1.2 0 0 1 14 5.2v5.6a1.2 1.2 0 0 1-1.2 1.2H3.2A1.2 1.2 0 0 1 2 10.8V5.2Zm8.5 2.8h1.5" />
          {busy ? 'Connecting…' : 'Connect'}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className="cdrop dash" align="start" sideOffset={8} collisionPadding={16}>
          {wallets.length > 0 ? (
            <>
              <p className="xgroup">In this browser</p>
              <ul className="xsub">
                {wallets.map((w) => (
                  <li key={w.info.uuid}>
                    <button type="button" className="crow" onClick={() => { setOpen(false); onConnect(w); }}>
                      {w.info.icon
                        ? <img src={w.info.icon} alt="" width="20" height="20" />
                        : <span className="crow-blank" aria-hidden="true" />}
                      <span className="crow-text">
                        <b>{w.info.name}</b>
                        <em>connects, and can sign a correction</em>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="wdrop-none">
              No wallet answered in this browser. Scan one below, or type an
              address into the field. Neither needs a wallet installed here.
            </p>
          )}

          <p className="xgroup">From a phone</p>
          {!scanning ? (
            <button type="button" className="crow" onClick={() => setScanning(true)}>
              <Mark d="M2.5 6V3.2A.7.7 0 0 1 3.2 2.5H6m4 0h2.8a.7.7 0 0 1 .7.7V6m0 4v2.8a.7.7 0 0 1-.7.7H10m-4 0H3.2a.7.7 0 0 1-.7-.7V10M4 8h8" />
              <span className="crow-text">
                <b>Scan a wallet’s code</b>
                <em>reads the address off the screen, grants nothing</em>
              </span>
            </button>
          ) : (
            <Scanner onFound={(a) => { setOpen(false); onAddress(a); }} />
          )}

          <p className="cdrop-foot">
            Nothing is signed here and no key is ever asked for. A scanned
            address is read exactly like one you type.
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
