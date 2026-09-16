import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogClose } from '../ui/Dialog.jsx';

/**
 * Asked once, after a reading, and never again.
 *
 * WHEN. Not on arrival, and not while the chain is being read: a person who
 * has just been shown what their wallet gave away has a reason to care what we
 * do next, and a person who has seen nothing yet does not. It waits until a
 * reading is on screen and then a few seconds more, so the thing they came for
 * is what they are looking at when it appears.
 *
 * ONCE. The answer is kept in this browser, so someone who closes it is not
 * asked again on the next read, or the next visit. A modal that returns is a
 * modal that gets dismissed without being read, and then the one time it
 * matters it is furniture.
 *
 * IT IS DISMISSIBLE BEFORE IT IS ANYTHING ELSE. Escape closes it, the ground
 * closes it, the close button closes it, and the ledger behind it is not
 * altered by any of that.
 */

const SEEN = 'sfera:keep-in-touch';
const WAIT = 6000;

function already() {
  try { return localStorage.getItem(SEEN) === 'done'; } catch { return true; }
}
function remember() {
  try { localStorage.setItem(SEEN, 'done'); } catch { /* private window */ }
}

export default function KeepInTouch({ when }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState('asking'); // asking | sending | done | failed
  const [email, setEmail] = useState('');
  const [said, setSaid] = useState('');
  const fired = useRef(false);

  useEffect(() => {
    if (!when || fired.current || already()) return undefined;
    const t = setTimeout(() => { fired.current = true; setOpen(true); }, WAIT);
    return () => clearTimeout(t);
  }, [when]);

  function close() {
    remember();
    setOpen(false);
  }

  async function send(e) {
    e.preventDefault();
    setState('sending');
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email }),
      });
      const d = await r.json().catch(() => ({}));
      setSaid(d.message || (r.ok ? 'Noted.' : 'That did not save.'));
      setState(r.ok && d.ok ? 'done' : 'failed');
      if (r.ok && d.ok) remember();
    } catch {
      setSaid('We could not reach our own list. Nothing was saved.');
      setState('failed');
    }
  }

  if (!open) return null;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent
        className="kit"
        title="Keep in touch"
        description="Leave an address and we will write when there is something real to show."
      >
        {state === 'done' ? (
          <>
            <p className="rule-label seal">Noted</p>
            <p className="h-body">{said}</p>
            <div className="d-actions">
              <DialogClose asChild>
                <button type="button" className="btn" onClick={close}>Back to the ledger</button>
              </DialogClose>
            </div>
          </>
        ) : (
          <>
            <p className="rule-label">Keep in touch</p>
            <h3 className="kit-h">This is a proof of concept.</h3>
            <p className="h-body">
              It reads standing permissions and builds one correction. The rest —
              limiting instead of revoking, several at once, signed permissions —
              is being built. Leave an address and we will write when there is
              something real to show, which will not be often.
            </p>

            <form className="lookup kit-form" onSubmit={send}>
              <label htmlFor="kit-email">Your email</label>
              <div className={`lookup-row${state === 'failed' ? ' bad' : ''}`}>
                <input
                  id="kit-email"
                  type="email"
                  value={email}
                  onChange={(ev) => { setEmail(ev.target.value); if (state === 'failed') setState('asking'); }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  spellCheck="false"
                  required
                />
                <button type="submit" className="btn ghost" disabled={state === 'sending'}>
                  {state === 'sending' ? 'Sending' : 'Send'}
                </button>
              </div>
              {state === 'failed' && <p className="gate-error">{said}</p>}
            </form>

            {/* What we keep, said where the address is asked for. */}
            <p className="kit-note">
              The address goes on a list and nothing else. It is never joined to
              a wallet, never sold, and one line back to us takes it off again.
            </p>

            <div className="d-actions">
              <DialogClose asChild>
                <button type="button" className="txt" onClick={close}>Not now</button>
              </DialogClose>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
