import { useCallback, useEffect, useState } from 'react';
import { isAddress } from 'viem';
import { discover, connect, watch, switchChain } from '../../lib/wallet.js';
import { chains as fetchChains, permissions as fetchPermissions, format, ApiError } from '../../lib/api.js';
import { reading, explain } from '../../lib/readings.js';
import { TERMS } from '../../data/site.js';
import Ledger from './Ledger.jsx';
import Detail from './Detail.jsx';
import Handoff from './Handoff.jsx';
import HowItReads from './HowItReads.jsx';
import Verdict from './Verdict.jsx';
import { Select } from '../ui/Select.jsx';

/** A public address carrying unbounded approvals against a real balance.
    Verified before being written down, so the page has something honest to
    show when there is no wallet to hand. */
const EXAMPLE = { address: '0x8ea5ad2a58c1dae75394b1e8636e6518eb6dac50', chainId: 8453 };

const FILTERS = [
  { k: 'all', label: 'All' },
  { k: 'attention', label: 'Needs attention' },
  { k: 'unbounded', label: 'Unbounded' },
];

function match(p, f) {
  if (f === 'attention') return p.attention;
  if (f === 'unbounded') return p.reading === 'UNBOUNDED';
  return true;
}

/**
 * The permission ledger.
 *
 * The reading and the deciding happen in the engine, not here. This component
 * connects a wallet, asks the engine what it found, renders it, and hands any
 * correction back to the wallet unsigned. ARCHITECTURE.md: Go owns anything
 * that decides, TypeScript owns anything a wallet has to import.
 */
export default function Dashboard() {
  const [wallets, setWallets] = useState([]);
  const [provider, setProvider] = useState(null);
  const [walletName, setWalletName] = useState(null);
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [mode, setMode] = useState('wallet');
  const [typed, setTyped] = useState('');

  const [supported, setSupported] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  /* The reading before the last refresh, keyed by permission id. A row uses
     it to animate from the old value to the new one, which is the moment the
     whole product exists to produce. */
  const [previous, setPrevious] = useState(null);

  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [handoff, setHandoff] = useState(null);

  useEffect(() => {
    discover().then(setWallets);
    fetchChains()
      .then((cs) => {
        setSupported(cs);
        /* The homepage hands an address over in the query string. Completing
           the read here rather than presenting an empty form is the point of
           asking for it there. */
        const handed = new URLSearchParams(window.location.search).get('address');
        if (handed && isAddress(handed.trim())) {
          setMode('lookup');
          setAddress(handed.trim());
          setChainId(EXAMPLE.chainId);
        }
      })
      .catch(() => setSupported([]));
  }, []);

  const refresh = useCallback(async () => {
    if (!address || !chainId) return;
    setStatus('scanning');
    setError(null);
    try {
      const next = await fetchPermissions(chainId, address);
      setResult((was) => {
        if (was) {
          setPrevious(Object.fromEntries((was.permissions ?? []).map((p) => [p.id, p])));
        }
        return next;
      });
      setStatus('ready');
    } catch (e) {
      /* A failed read is reported, never rendered as an empty ledger. */
      setError(e);
      setResult(null);
      setStatus('error');
    }
  }, [address, chainId]);

  useEffect(() => {
    if (address && chainId) refresh();
  }, [address, chainId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!provider) return undefined;
    return watch(provider, {
      onAccounts: (a) => { setAddress(a); setOpenId(null); setHandoff(null); if (!a) setStatus('idle'); },
      onChain: (c) => { setChainId(c); setOpenId(null); setHandoff(null); },
    });
  }, [provider]);

  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return;
      if (handoff) setHandoff(null);
      else if (openId) setOpenId(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handoff, openId]);

  async function onConnect(w) {
    setStatus('connecting');
    setError(null);
    try {
      const { address: a, chainId: c } = await connect(w.provider);
      setProvider(w.provider);
      setWalletName(w.info.name);
      setMode('wallet');
      setAddress(a);
      setChainId(c);
    } catch (e) {
      setError(new ApiError({ code: 'DECLINED', message: 'Connection was declined in the wallet.' }));
      setStatus('idle');
    }
  }

  function lookUp(value, forceChain) {
    const addr = value.trim();
    if (!isAddress(addr)) {
      setError(new ApiError({ code: 'ADDRESS_INVALID', message: 'That is not a valid address.' }));
      return;
    }
    setError(null);
    setMode('lookup');
    setProvider(null);
    setWalletName(null);
    setAddress(addr);
    setChainId(forceChain ?? supported[0]?.id ?? 8453);
  }

  function forget() {
    setProvider(null); setAddress(null); setChainId(null); setResult(null);
    setOpenId(null); setHandoff(null); setStatus('idle'); setMode('wallet'); setTyped('');
  }

  if (!address) {
    return (
      <section className="gate">
        <p className="gate-kicker">Live</p>
        <h1>What this wallet gave away.</h1>
        <p className="gate-lede">
          Connect a wallet and this reads its standing token permissions
          directly from the chain. Read-only until you ask for a change, and any
          change is handed to your wallet unsigned.
        </p>

        {wallets.length === 0 && (
          <p className="gate-none">
            No wallet was found in this browser. You can still read any public
            address below.
          </p>
        )}

        <div className="wallet-picks stagger">
          {wallets.map((w) => (
            <button key={w.info.uuid} type="button" className="btn"
              disabled={status === 'connecting'} onClick={() => onConnect(w)}>
              {w.info.icon && <img src={w.info.icon} alt="" width="16" height="16" />}
              {status === 'connecting' ? 'Check your wallet' : w.info.name}
            </button>
          ))}
        </div>

        {error && <p className="gate-error">{explain(error)}</p>}

        <form className="lookup" onSubmit={(e) => { e.preventDefault(); lookUp(typed); }}>
          <label htmlFor="addr">Or read any public address</label>
          <div className="lookup-row">
            <input id="addr" value={typed} onChange={(e) => setTyped(e.target.value)}
              placeholder="0x…" spellCheck="false" autoComplete="off" />
            <button type="submit" className="btn ghost">Read</button>
          </div>
          <button type="button" className="txt" onClick={() => lookUp(EXAMPLE.address, EXAMPLE.chainId)}>
            Use an example address with unbounded permissions
          </button>
        </form>

        {supported.length > 0 && (
          <p className="gate-chains">
            Reads {supported.map((c) => c.name).join(', ')}.
          </p>
        )}

        <ul className="gate-terms">{TERMS.map((t) => <li key={t}>{t}</li>)}</ul>
      </section>
    );
  }

  const chain = supported.find((c) => c.id === Number(chainId));
  const perms = result?.permissions ?? [];
  const shown = perms.filter((p) => match(p, filter));
  const open = perms.find((p) => p.id === openId) || null;
  const attention = perms.filter((p) => p.attention).length;
  const unbounded = perms.filter((p) => p.reading === 'UNBOUNDED').length;
  const apps = new Set(perms.map((p) => p.beneficiary.toLowerCase())).size;

  return (
    <>
      <section className="wallet-strip">
        <div className="w-id">
          <span className="w-dot live-dot" aria-hidden="true" />
          <span className="w-addr">{address.slice(0, 6)}…{address.slice(-4)}</span>
          <span className="w-net">{chain ? chain.name : `Chain ${chainId}`}</span>
        </div>
        <p className="w-note">
          {mode === 'lookup'
            ? 'Public address · read-only · not your wallet'
            : `${walletName} · read-only until you ask for a change`}
        </p>
        {supported.length > 1 && (
          <Select
            value={Number(chainId) || ''}
            items={supported.map((c) => ({ value: c.id, label: c.name }))}
            onValueChange={(v) => {
              const id = Number(v);
              if (mode === 'wallet' && provider) switchChain(provider, id).catch(() => {});
              else setChainId(id);
            }}
          />
        )}
        <button className="btn ghost sm" type="button" onClick={refresh} disabled={status === 'scanning'}>
          {status === 'scanning' ? 'Reading' : 'Re-read'}
        </button>
        <button className="btn ghost sm" type="button" onClick={forget}>
          {mode === 'lookup' ? 'Clear' : 'Forget'}
        </button>
      </section>

      {!chain && status !== 'scanning' && (
        <section className="notice">
          <p className="rule-label">Chain not supported</p>
          <p>This ledger reads {supported.map((c) => c.name).join(', ')}. It will not guess at chain {chainId}.</p>
          {provider && supported[0] && (
            <button type="button" className="btn" onClick={() => switchChain(provider, supported[0].id)}>
              Switch to {supported[0].name}
            </button>
          )}
        </section>
      )}

      {status === 'error' && (
        <section className="notice bad">
          <p className="rule-label">The chain could not be read</p>
          <p>{explain(error)}</p>
          <p className="n-why">
            Nothing is shown rather than a partial list, because a permission
            that failed to load and one that was never granted look identical on
            a screen.
          </p>
          {error?.retryable !== false && (
            <button type="button" className="btn" onClick={refresh}>Try again</button>
          )}
        </section>
      )}

      {chain && status !== 'error' && (
        <>
          <Verdict
            perms={perms}
            readAt={result?.readAt}
            scanning={status === 'scanning'}
          />

          <HowItReads
            checked={result?.checked}
            tokens={result?.coverage?.tokens}
            spenders={result?.coverage?.spenders}
            chain={chain?.name}
          />

          <section className="coverage-note">
            <p className="rule-label">Not covered</p>
            <ul className="not-covered">
              {(result?.coverage?.notCovered ?? []).map((x) => <li key={x}>{x}</li>)}
            </ul>
            <p className="cov-warn">
              Finding nothing here is not the same as there being nothing. This
              is the honest limit of asking rather than listing, and it is
              stated rather than implied away.
            </p>
          </section>

          <section className="ledger-block">
            <div className="ledger-head">
              <h2>Present authority</h2>
              <div className="filters" role="tablist" aria-label="Filter permissions">
                {FILTERS.map(({ k, label }) => (
                  <button key={k} type="button" role="tab" aria-selected={filter === k}
                    className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{label}</button>
                ))}
              </div>
            </div>

            {status === 'scanning' && <p className="empty">Reading the chain.</p>}

            {status === 'ready' && perms.length === 0 && (
              <p className="empty">
                No standing permission was found among the {result?.checked ?? 0} pairs
                checked. That is not the same as none existing.
              </p>
            )}

            {perms.length > 0 && (
              <Ledger
                rows={shown}
                previous={previous}
                openId={openId}
                canAct={mode === 'wallet'}
                explorer={result?.explorer}
                chain={chain?.name}
                onOpen={(id) => setOpenId(id === openId ? null : id)}
                onRevoke={(p) => setHandoff({ perm: p })}
              />
            )}

            {status === 'ready' && perms.length > 0 && shown.length === 0 && (
              <p className="empty">Nothing under this filter.</p>
            )}

            {perms.length > 0 && (
              <p className="verdict-key">
                {['UNBOUNDED', 'OVER_WIDE', 'BOUNDED', 'UNKNOWN'].map((k) => {
                  const r = reading(k);
                  return <span key={k}><b className={`v ${r.tone}`}>{r.label}</b> {r.means}</span>;
                })}
              </p>
            )}
          </section>

          <section className="reading-note">
            <p className="rule-label">Reading, not verdict</p>
            <p>
              A verdict compares the authority an application asked for against
              what your action actually required. Nothing is being asked for
              here, so there is nothing to compare against, and calling a
              standing permission correct or incorrect would mean inventing the
              comparison. These are observations. The verdict belongs to the
              loop, where the intent is known.
            </p>
          </section>
        </>
      )}

      {open && !handoff && (
        <Detail perm={open} chain={chain} explorer={result?.explorer}
          canAct={mode === 'wallet'} onClose={() => setOpenId(null)}
          onAct={() => setHandoff({ perm: open })} />
      )}

      {handoff && (
        <Handoff perm={handoff.perm} chain={chain} chainId={chainId} owner={address}
          provider={provider} explorer={result?.explorer}
          onCancel={() => setHandoff(null)}
          onSettle={() => { setHandoff(null); setOpenId(null); refresh(); }} />
      )}
    </>
  );
}

export { format };
