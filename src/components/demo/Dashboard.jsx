import { useCallback, useEffect, useState } from 'react';
import { discover, connect, watch, switchChain } from '../../lib/wallet.js';
import { scan } from '../../lib/scan.js';
import { summarise, coverage, needsAttention, readingFor, READINGS } from '../../lib/assess.js';
import { CHAINS, DEFAULT_CHAIN, chainOf, shorten } from '../../lib/chains.js';
import { isAddress } from 'viem';
import { TERMS } from '../../data/site.js';
import Ledger from './Ledger.jsx';
import Detail from './Detail.jsx';
import Handoff from './Handoff.jsx';

/** A public Base address carrying unbounded approvals against a real balance.
    Verified before being written down. Used only so the page has something
    honest to show when there is no wallet to hand. */
const EXAMPLE = '0x8ea5ad2a58c1dae75394b1e8636e6518eb6dac50';

const FILTERS = [
  { k: 'all', label: 'All' },
  { k: 'attention', label: 'Needs attention' },
  { k: 'unbounded', label: 'Unbounded' },
];

function match(p, filter) {
  if (filter === 'attention') return needsAttention(p);
  if (filter === 'unbounded') return readingFor(p) === 'UNBOUNDED';
  return true;
}

/**
 * The live permission ledger.
 *
 * This reads a real wallet on a real chain. Every figure on screen came back
 * from an eth_call in the last few seconds, and the only transaction it can
 * build is an ERC-20 approve that the person signs in their own wallet.
 *
 * WHAT THIS IS NOT. The Go decision engine described in ARCHITECTURE.md does
 * not exist yet, so the reading applied here is done in the browser and is
 * limited to what chain state alone can establish. It reports observations
 * rather than decisions, and assess.js carries the reasoning for that.
 */
export default function Dashboard() {
  const [wallets, setWallets] = useState([]);
  const [provider, setProvider] = useState(null);
  const [walletName, setWalletName] = useState(null);
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);

  /* 'wallet' when a wallet is connected, 'lookup' when reading a public
     address nobody signed in for. Lookup is real chain data and offers no
     corrections, because you cannot revoke a permission that is not yours. */
  const [mode, setMode] = useState('wallet');
  const [typed, setTyped] = useState('');

  const [status, setStatus] = useState('idle'); // idle | connecting | scanning | ready | error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [handoff, setHandoff] = useState(null);

  useEffect(() => {
    discover().then(setWallets);
  }, []);

  const refresh = useCallback(
    async (opts = {}) => {
      const who = opts.address ?? address;
      const where = opts.chainId ?? chainId;
      const via = opts.provider ?? provider;
      if (!who || !where) return;

      setStatus('scanning');
      setError(null);
      try {
        const r = await scan({ chainId: where, owner: who, provider: via });
        setResult(r);
        setStatus('ready');
      } catch (e) {
        /* A failed read is reported, never rendered as an empty ledger. A
           permission that exists but did not load must not look like one that
           was never granted. */
        setError(e.shortMessage || e.message || 'The chain could not be read.');
        setResult(null);
        setStatus('error');
      }
    },
    [address, chainId, provider],
  );

  useEffect(() => {
    if (address && chainId) refresh();
  }, [address, chainId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!provider) return undefined;
    return watch(provider, {
      onAccounts: (a) => {
        setAddress(a);
        setOpenId(null);
        setHandoff(null);
        if (!a) setStatus('idle');
      },
      onChain: (c) => {
        setChainId(c);
        setOpenId(null);
        setHandoff(null);
      },
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
      setAddress(a);
      setChainId(c);
    } catch (e) {
      setError(e.message === 'User rejected the request.' ? 'Connection was declined in the wallet.' : e.message);
      setStatus('idle');
    }
  }

  function lookUp(value) {
    const addr = value.trim();
    if (!isAddress(addr)) {
      setError('That is not a valid address.');
      return;
    }
    setError(null);
    setMode('lookup');
    setProvider(null);
    setWalletName(null);
    setAddress(addr);
    setChainId(DEFAULT_CHAIN);
  }

  function disconnect() {
    /* A page cannot revoke its own connection, only forget it. Saying
       disconnected when the wallet still lists the site would be a lie the
       user could check. */
    setProvider(null);
    setAddress(null);
    setChainId(null);
    setResult(null);
    setOpenId(null);
    setHandoff(null);
    setStatus('idle');
    setMode('wallet');
    setTyped('');
  }

  // ---- not connected ------------------------------------------------------

  if (!address) {
    return (
      <section className="gate">
        <p className="gate-kicker">Live</p>
        <h1>The permissions this wallet has already given away.</h1>
        <p className="gate-lede">
          Connect a wallet and this reads its standing token permissions
          directly from the chain. It is read-only until you ask for a change,
          and any change is handed to your wallet unsigned.
        </p>

        {wallets.length === 0 && (
          <p className="gate-none">
            No wallet was found in this browser. Install one, or open this page
            in a wallet browser.
          </p>
        )}

        <div className="wallet-picks">
          {wallets.map((w) => (
            <button
              key={w.info.uuid}
              type="button"
              className="btn"
              disabled={status === 'connecting'}
              onClick={() => onConnect(w)}
            >
              {w.info.icon && <img src={w.info.icon} alt="" width="16" height="16" />}
              {status === 'connecting' ? 'Check your wallet' : w.info.name}
            </button>
          ))}
        </div>

        {error && <p className="gate-error">{error}</p>}

        {/* No wallet is needed to read a public address. This exists so the
            page has something true to show when the wallet you have to hand
            happens to be clean, and so nobody has to connect anything to see
            what the product does. */}
        <form
          className="lookup"
          onSubmit={(e) => {
            e.preventDefault();
            lookUp(typed);
          }}
        >
          <label htmlFor="addr">Or read any public address</label>
          <div className="lookup-row">
            <input
              id="addr"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="0x…"
              spellCheck="false"
              autoComplete="off"
            />
            <button type="submit" className="btn ghost">Read</button>
          </div>
          <button
            type="button"
            className="txt"
            onClick={() => lookUp(EXAMPLE)}
          >
            Use an example address with unbounded permissions
          </button>
        </form>

        <ul className="gate-terms">
          {TERMS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
    );
  }

  // ---- connected ----------------------------------------------------------

  const chain = chainOf(chainId);
  const permissions = result?.permissions ?? [];
  const shown = permissions.filter((p) => match(p, filter));
  const open = permissions.find((p) => p.id === openId) || null;

  return (
    <>
      <section className="wallet-strip">
        <div className="w-id">
          <span className="w-dot" aria-hidden="true" />
          <span className="w-addr">{shorten(address)}</span>
          <span className="w-net">{chain ? chain.name : `Chain ${chainId}`}</span>
        </div>
        <p className="w-note">
          {mode === 'lookup'
            ? 'Public address · read-only · not your wallet'
            : `${walletName} · read-only until you ask for a change`}
        </p>
        <button
          className="btn ghost sm"
          type="button"
          onClick={() => refresh()}
          disabled={status === 'scanning'}
        >
          {status === 'scanning' ? 'Reading' : 'Re-read'}
        </button>
        <button className="btn ghost sm" type="button" onClick={disconnect}>
          {mode === 'lookup' ? 'Clear' : 'Forget'}
        </button>
      </section>

      {!chain && (
        <section className="notice">
          <p className="rule-label">Chain not supported</p>
          <p>
            This ledger knows how to read {Object.values(CHAINS).map((c) => c.name).join(' and ')}.
            It will not guess at chain {chainId}.
          </p>
          <button type="button" className="btn" onClick={() => switchChain(provider, DEFAULT_CHAIN)}>
            Switch to {CHAINS[DEFAULT_CHAIN].name}
          </button>
        </section>
      )}

      {status === 'error' && (
        <section className="notice bad">
          <p className="rule-label">The chain could not be read</p>
          <p>{error}</p>
          <p className="n-why">
            Nothing is shown rather than a partial list, because a permission
            that failed to load and one that was never granted look identical
            on a screen.
          </p>
          <button type="button" className="btn" onClick={() => refresh()}>
            Try again
          </button>
        </section>
      )}

      {chain && status !== 'error' && (
        <>
          <section className="summary">
            <dl>
              {summarise(permissions, result).map(({ k, v, note }) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{status === 'scanning' ? '—' : v}</dd>
                  <dd className="s-note">{note}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="coverage-note">
            <p className="rule-label">What this covers</p>
            <dl>
              {coverage(result).map(({ state, n, body }) => (
                <div key={state}>
                  <dt>
                    {state}
                    <span>{n === null ? '—' : n}</span>
                  </dt>
                  <dd>{body}</dd>
                </div>
              ))}
            </dl>
            <p className="cov-warn">
              This is not complete coverage of the wallet. An allowance cannot be
              listed from chain state, only asked about, so what is missing here
              is stated rather than implied away.
            </p>
          </section>

          <section className="ledger-block">
            <div className="ledger-head">
              <h2>Present authority</h2>
              <div className="filters" role="tablist" aria-label="Filter permissions">
                {FILTERS.map(({ k, label }) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={filter === k}
                    className={filter === k ? 'on' : ''}
                    onClick={() => setFilter(k)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {status === 'scanning' && <p className="empty">Reading the chain.</p>}

            {status === 'ready' && permissions.length === 0 && (
              <p className="empty">
                No standing permission was found among the {result?.checked?.pairs ?? 0} pairs
                checked. That is not the same as none existing.
              </p>
            )}

            {permissions.length > 0 && (
              <Ledger
                rows={shown}
                openId={openId}
                onOpen={(id) => setOpenId(id === openId ? null : id)}
              />
            )}

            {status === 'ready' && permissions.length > 0 && shown.length === 0 && (
              <p className="empty">Nothing under this filter.</p>
            )}

            {permissions.length > 0 && (
              <p className="verdict-key">
                {Object.entries(READINGS).map(([k, v]) => (
                  <span key={k}>
                    <b className={`v ${v.tone}`}>{v.label}</b> {v.means}
                  </span>
                ))}
              </p>
            )}
          </section>

          <section className="reading-note">
            <p className="rule-label">Why these say reading and not verdict</p>
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
        <Detail
          perm={open}
          chain={chain}
          canAct={mode === 'wallet'}
          onClose={() => setOpenId(null)}
          onAct={(action) => setHandoff({ perm: open, action })}
        />
      )}

      {handoff && (
        <Handoff
          perm={handoff.perm}
          action={handoff.action}
          chain={chain}
          owner={address}
          provider={provider}
          onCancel={() => setHandoff(null)}
          onSettle={() => {
            setHandoff(null);
            setOpenId(null);
            refresh();
          }}
        />
      )}
    </>
  );
}
