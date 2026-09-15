import { useCallback, useEffect, useState } from 'react';
import ChainStack from '../ChainStack.jsx';
import { isAddress } from 'viem';
import { discover, connect, watch, switchChain } from '../../lib/wallet.js';
import { chains as fetchChains, permissions as fetchPermissions, format, ApiError } from '../../lib/api.js';
import { reading, explain } from '../../lib/readings.js';
import { TERMS } from '../../data/site.js';
import Ledger from './Ledger.jsx';
import Detail from './Detail.jsx';
import Handoff from './Handoff.jsx';
import Verdict from './Verdict.jsx';
import { ChainPicker } from '../ui/ChainPicker.jsx';
import { Counter } from '../ui/Counter.jsx';
import { Toaster } from '../ui/Toast.jsx';

/** A public address carrying unbounded approvals against a real balance.
    Verified before being written down, so the page has something honest to
    show when there is no wallet to hand. */
const EXAMPLE = { address: '0x8ea5ad2a58c1dae75394b1e8636e6518eb6dac50', chainId: 8453 };

const FILTERS = [
  { k: 'all', label: 'All' },
  { k: 'attention', label: 'Needs attention' },
  { k: 'unbounded', label: 'Unbounded' },
];

/* Reading -> the shared state vocabulary in global.css, so the demo's chips
   and the marketing pages' chips are the same objects. */
const KEY_TONE = {
  UNBOUNDED: 'bad',
  OVER_WIDE: 'wide',
  BOUNDED:   'ok',
  REMOVED:   'gone',
  EXPIRED:   'old',
  UNKNOWN:   'unk',
};

/**
 * Where you are, and the way back out.
 *
 * This page has two levels and used to signal neither: a reader who arrived
 * from a link had no indication they had left the site's main path, and the
 * only way back from a result was a "Clear" button sitting in the wallet strip
 * that reads as "empty the field" rather than "go up".
 *
 * Back always means one level up the trail, which is two different things
 * depending on where you are — from a result it returns to the gate, from the
 * gate it leaves the page. History is used rather than a hard link to `/`
 * because the demo is now reached from more than one page, and sending
 * everyone to the same place would be wrong for whoever did not come from
 * there.
 */
function Crumbs({ address, chain, onBack }) {
  const atResult = Boolean(address);

  function leave() {
    if (atResult) { onBack(); return; }
    /* No history means a direct link or a fresh tab; a back that does nothing
       is worse than one that goes somewhere sensible. */
    if (typeof window !== 'undefined' && window.history.length > 1) window.history.back();
    else window.location.assign('/');
  }

  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <button type="button" className="crumb-back" onClick={leave}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M14 8H3M7 4L3 8l4 4" fill="none" stroke="currentColor"
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <ol>
        <li><a href="/">Sfera Onchain</a></li>
        <li>
          {atResult
            ? <button type="button" onClick={onBack}>Read a wallet</button>
            : <span aria-current="page">Read a wallet</span>}
        </li>
        {atResult && (
          <li>
            <span aria-current="page">
              {address.slice(0, 6)}…{address.slice(-4)}
              {chain && <em> · {chain.name}</em>}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}

/**
 * The address a page is reading, in its own URL.
 *
 * A result that lives only in React state is a result that a reload throws
 * away, and reloading is what people do when something looks wrong — which on
 * this page is the moment they most want to keep what they were looking at.
 * So the address goes in the query string: the read survives a refresh, the
 * browser's own Back leaves a result the way the crumb does, and a reader can
 * send someone the exact thing they are looking at.
 *
 * The homepage's form already posted here with ?address=, so this is the same
 * contract written down rather than a new one.
 *
 * Pushed when a read begins, so Back returns to the gate; replaced when it
 * ends, so leaving does not leave an entry behind that would walk back into
 * the result that was just cleared.
 */
function writeAddress(addr, { push = false } = {}) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (addr) url.searchParams.set('address', addr);
  else url.searchParams.delete('address');
  const next = url.pathname + url.search + url.hash;
  window.history[push ? 'pushState' : 'replaceState']({ address: addr ?? null }, '', next);
}

function readAddress() {
  if (typeof window === 'undefined') return null;
  const handed = new URLSearchParams(window.location.search).get('address');
  return handed && isAddress(handed.trim()) ? handed.trim() : null;
}

function match(p, f, onChain) {
  if (onChain && p.chain?.id !== onChain) return false;
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
/**
 * `embedded` is the same ledger mounted inside the home page rather than on its own
 * page. It drops the two things that only make sense on a page of its own —
 * the breadcrumb trail and the top-level heading — and changes nothing else,
 * because a reader who scrolls to it and a reader who opens /demo should be
 * looking at the same instrument.
 */
export default function Dashboard({ embedded = false }) {
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
  /* 0 means every chain, which is the default: a reader should not have to
     already suspect a chain to be shown what is on it. */
  const [chainFilter, setChainFilter] = useState(0);
  const [openId, setOpenId] = useState(null);
  const [handoff, setHandoff] = useState(null);

  /* What went wrong, carried beside the page instead of in place of it — see
     ui/Toast.jsx. Keyed, so a re-read replaces the previous complaint about
     the same thing rather than stacking a second copy of it. */
  const [notes, setNotes] = useState([]);
  const note = useCallback((n) => {
    setNotes((ns) => [...ns.filter((x) => x.key !== n.key), { id: `${n.key}-${Date.now()}`, ...n }]);
  }, []);
  const dismiss = useCallback((id) => setNotes((ns) => ns.filter((n) => n.id !== id)), []);

  useEffect(() => {
    discover().then(setWallets);

    /* Whatever is in the URL is what this page is reading — whether the
       homepage's form put it there, a reload is picking it back up, or someone
       was sent the link. It resumes read-only in every case: a wallet
       connection is not something a query string can restore, and implying
       otherwise would be the one dishonest thing this page could do with an
       address.
     *
     * Taken before the chain list and not inside it. Chained to that request,
     * a failure to reach the engine silently dropped the address and returned
     * an empty form — the page saying "read a wallet" while its own URL said
     * it was already reading one. What the reader asked for survives the
     * request; whether it can be answered is reported below. */
    const handed = readAddress();
    if (handed) {
      setMode('lookup');
      setAddress(handed);
    }

    fetchChains()
      .then((cs) => {
        setSupported(cs);
        if (handed) setChainId((c) => c ?? cs[0]?.id ?? EXAMPLE.chainId);
      })
      .catch((e) => {
        setSupported([]);
        /* With no address there is nothing to report yet and the gate stands.
           With one, this is a failed read and it says so rather than sitting
           at "idle" forever behind a chain-not-supported notice. */
        if (handed) {
          setError(e);
          setStatus('error');
          note({ key: 'chains', tone: 'bad', title: 'The chain list could not be read',
                 body: explain(e), action: { label: 'Try again', run: () => window.location.reload() } });
        }
      });
  }, []);

  /* The browser's own Back, honoured. Without this it changes the URL and
     nothing else, which leaves the page showing a result its own address bar
     says it is not showing. */
  useEffect(() => {
    function onPop() {
      const handed = readAddress();
      if (handed) {
        setMode('lookup'); setProvider(null); setWalletName(null);
        setAddress(handed); setChainId((c) => c ?? supported[0]?.id ?? EXAMPLE.chainId);
      } else {
        setAddress(null); setResult(null); setStatus('idle');
      }
      setOpenId(null); setHandoff(null);
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [supported]);

  /**
   * Read every supported chain, not just the selected one.
   *
   * A permission you forgot about is most likely on a chain you forgot about,
   * so asking one chain at a time hid exactly the rows this page exists to
   * surface — you had to already suspect a chain to be shown its permissions.
   *
   * Fifteen requests against a sixty-per-minute allowance, and the engine
   * caches each for thirty seconds, so a reader re-reading costs one scan.
   *
   * A CHAIN THAT FAILED IS NOT A CHAIN WITH NOTHING ON IT. Each result is
   * settled independently and the failures are kept and named, because the
   * whole point of this page is that silence is not the same as safety.
   */
  const refresh = useCallback(async () => {
    if (!address || supported.length === 0) return;
    setStatus('scanning');
    setError(null);

    const settled = await Promise.allSettled(
      supported.map((c) =>
        fetchPermissions(c.id, address).then((r) => ({ ...r, chain: c }))
      )
    );

    const ok = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    const failed = supported.filter((_, i) => settled[i].status === 'rejected');

    /* Every chain refused. That is a failure to read, not an empty wallet. */
    if (ok.length === 0) {
      const why = settled[0]?.reason ?? new ApiError({ code: 'UNKNOWN', message: 'No chain could be read.' });
      setError(why);
      /* The previous reading is NOT thrown away. It was read from the chain
         and it was true when it was read; what is no longer true is that it is
         current, and the toast says so. Blanking the page would replace
         something dated with nothing at all. */
      setStatus('error');
      note({ key: 'read', tone: 'bad', title: 'The chain could not be read',
             body: `${explain(why)} Nothing below has been refreshed.`,
             action: why?.retryable !== false ? { label: 'Try again', run: refresh } : null });
      return;
    }

    const merged = {
      readAt: Date.now(),
      /* Tagged with the chain it came from, so a row can say where it lives
         and the explorer link points at the right one. */
      permissions: ok.flatMap((r) =>
        (r.permissions ?? []).map((p) => ({ ...p, chain: r.chain, id: `${r.chain.id}:${p.id}` }))
      ),
      checked: ok.reduce((n, r) => n + (r.checked ?? 0), 0),
      coverage: {
        tokens: ok[0]?.coverage?.tokens,
        spenders: ok[0]?.coverage?.spenders,
        notCovered: ok[0]?.coverage?.notCovered ?? [],
      },
      chainsRead: ok.map((r) => r.chain),
      chainsFailed: failed,
    };

    /* A chain that failed is not a chain with nothing on it. The figures below
       count what came back; this says what did not, because the difference is
       the whole argument of the page. */
    if (failed.length > 0) {
      note({ key: 'partial', tone: 'warn',
             title: `${failed.length} of ${supported.length} chains could not be read`,
             body: `${failed.map((c) => c.name).join(', ')}. What they hold is not shown, and not nothing.`,
             action: { label: 'Try again', run: refresh } });
    } else {
      setNotes((ns) => ns.filter((n) => n.key !== 'partial' && n.key !== 'read'));
    }

    setResult((was) => {
      if (was) {
        setPrevious(Object.fromEntries((was.permissions ?? []).map((p) => [p.id, p])));
      }
      return merged;
    });
    setStatus('ready');
  }, [address, supported]);

  useEffect(() => {
    if (address && supported.length) refresh();
  }, [address, supported]); // eslint-disable-line react-hooks/exhaustive-deps

  /* A wallet sitting on a chain this ledger does not read. It used to replace
     the page with a notice; the reading still runs across every supported
     chain, so the page stands and this says what is not covered — carrying the
     same switch it always offered. */
  useEffect(() => {
    if (mode !== 'wallet' || !chainId || supported.length === 0) return;
    if (supported.some((c) => c.id === Number(chainId))) return;
    note({
      key: 'unsupported', tone: 'warn',
      title: `This ledger does not read chain ${chainId}`,
      body: `It reads ${supported.map((c) => c.name).join(', ')}, and will not guess at the rest.`,
      action: provider && supported[0]
        ? { label: `Switch to ${supported[0].name}`, run: () => switchChain(provider, supported[0].id) }
        : null,
    });
  }, [mode, chainId, supported, provider, note]);

  useEffect(() => {
    if (!provider) return undefined;
    return watch(provider, {
      onAccounts: (a) => { setAddress(a); writeAddress(a); setOpenId(null); setHandoff(null); if (!a) setStatus('idle'); },
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
      writeAddress(a, { push: true });
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
    writeAddress(addr, { push: true });
  }

  /* Leaving a result is a step back up the trail, and there is now a history
     entry for that step — so take it, and let popstate clear the page. Calling
     forget() directly would change the page without changing the URL, and
     leave a forward entry pointing at a read that is no longer on screen. */
  function leaveResult() {
    if (typeof window !== 'undefined' && window.history.state?.address) {
      window.history.back();
      return;
    }
    forget();
  }

  function forget() {
    writeAddress(null);
    setProvider(null); setAddress(null); setChainId(null); setResult(null);
    setOpenId(null); setHandoff(null); setStatus('idle'); setMode('wallet'); setTyped('');
  }

  /* ONE TRAIL, ONE HEADER, IN ONE PLACE.
   *
   * The gate used to return early with its own <Crumbs> inside `section.gate`,
   * and the result rendered a second one as a sibling of it — the same
   * component twice, in two different containers, so the trail sat on a
   * different line and a different gutter depending on which screen you were
   * on. Two of a thing that must not differ is two chances for it to differ,
   * and it took them.
   *
   * Now the gate is a value rather than a return, both screens hang off one
   * root, and the trail is rendered once above whichever of them is showing.
   * `/` mounts this without it, because there the ledger is a section of a
   * page that already has a header and a place in it. */
  const gate = (
      <section className="gate">
        {/* What this is, and what it does with an address: two halves of one
            screen, and they sit beside each other rather than one under the
            other. The sentence explains; the field acts. Stacked, a reader
            scrolled past the explanation to reach the only control on the
            page, and the right half of the screen held nothing at all. */}
        <div className="gate-say">
          {embedded
            ? <h2>What this wallet gave away.</h2>
            : <h1>What this wallet gave away.</h1>}
          <p className="gate-lede">
            Connect a wallet and this reads its standing token permissions
            directly from the chain. Read-only until you ask for a change, and any
            change is handed to your wallet unsigned.
          </p>
        </div>

        {/* The right half is an object, not a pile.
         *
         * It was a status line, a label, a field, a link and a row of chain
         * marks floating in space beside a very large headline — five loose
         * fragments where the composition needed one thing with weight. So it
         * is a panel, in the same frame the console and the detail sheet use,
         * and the parts inside it run in the order they are used: read an
         * address, or connect the wallet that holds one.
         *
         * "No wallet was found" moved to the bottom of it. It is a fact about
         * this browser, not the first thing anyone came to read. */}
        <div className="gate-do">
          <form className="lookup" onSubmit={(e) => { e.preventDefault(); lookUp(typed); }}>
            <label htmlFor="addr">Read any public address</label>
            <div className={`lookup-row${error ? ' bad' : ''}`}>
              <input
                id="addr"
                value={typed}
                onChange={(e) => { setTyped(e.target.value); if (error) setError(null); }}
                placeholder="0x…"
                spellCheck="false"
                autoComplete="off"
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? 'addr-error' : undefined}
              />
              <button type="submit" className="btn ghost">Read</button>
            </div>

            {/* The error belongs to the field, not to the page: under the
                input it failed on, with the input marked invalid so assistive
                technology says so too. */}
            {error && (
              <p className="gate-error" id="addr-error" role="alert">
                {explain(error)}
              </p>
            )}

            <button type="button" className="txt" onClick={() => lookUp(EXAMPLE.address, EXAMPLE.chainId)}>
              Use an example address with unbounded permissions
            </button>
          </form>

          <div className="gate-or">
            {wallets.length > 0 ? (
              <>
                <p className="gate-or-label">or connect a wallet</p>
                <div className="wallet-picks">
                  {wallets.map((w) => (
                    <button key={w.info.uuid} type="button" className="btn"
                      disabled={status === 'connecting'} onClick={() => onConnect(w)}>
                      {w.info.icon && <img src={w.info.icon} alt="" width="16" height="16" />}
                      {status === 'connecting' ? 'Check your wallet' : w.info.name}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="gate-none">
                No wallet was found in this browser. Any public address reads
                the same way.
              </p>
            )}

            {supported.length > 0 && (
              <p className="gate-chains" title={supported.map((c) => c.name).join(', ')}>
                <ChainStack label={`${supported.length} chains, all read the same way`} compact />
              </p>
            )}
          </div>
        </div>

        {/* The commitments belong to the screen, not to either half of it.
            They are the reasons it is safe to paste an address, so they run
            the full width underneath both columns rather than being tucked
            into one of them. */}
        <ul className="gate-terms">
          {TERMS.map((t) => (
            <li key={t}><span className="gt-tick" aria-hidden="true">✓</span>{t}</li>
          ))}
        </ul>
      </section>
  );

  const chain = supported.find((c) => c.id === Number(chainId));
  const perms = result?.permissions ?? [];
  const shown = perms.filter((p) => match(p, filter, chainFilter));
  const open = perms.find((p) => p.id === openId) || null;
  const attention = perms.filter((p) => p.attention).length;

  /* Distinct applications, which is the figure the headline sentence counts.
   *
   * A "largest exposure" figure sat here first and was wrong: it compared raw
   * base units across assets, so 1.8269 WETH (18 decimals) outranked 21,014
   * USDC (6). Rescaling by decimals would not fix it either — one WETH and one
   * USDC are not comparable amounts. Ranking exposure across assets needs a
   * price feed, and this page does not have one, which is exactly why it shows
   * every amount in its own asset and no total. */
  /* What was found on each chain, so the picker can say so on every row. A
     chain with nothing on it still shows, and shows zero: a chain missing from
     a list and a chain with no permission on it look identical otherwise, and
     that difference is most of what this page is for. */
  const perChain = perms.reduce((n, p) => {
    if (p.chain?.id) n[p.chain.id] = (n[p.chain.id] ?? 0) + 1;
    return n;
  }, {});

  /* A task is a permission that is both worth changing and changeable. An
     UNKNOWN one is neither: DECISION §75 forbids offering a correction for an
     authority we could not read, and counting it as outstanding work would ask
     for something nobody can do. */
  const task = (p) => p.attention && p.remediable;
  const toSeeTo = perms.filter(task).length;

  /* THE FIGURES COUNT WHAT IS ON SCREEN. They used to count the whole read
     while the table below them showed one chain, so filtering to a chain with
     nothing on it produced a console stating "2 permissions · 2 to see to"
     directly above a row reading "Nothing on Gnosis". A header and a body
     that contradict each other are worse than either alone.
   *
   * The captions carry the other half: what the view is narrowed FROM. A
   * count of zero under a narrowed view must never be able to read as an
   * all-clear, because on this page that is the one lie that matters. */
  const narrowed = filter !== 'all' || chainFilter !== 0;

  /* A zero that has not been established. Scanning and failure both produce
     one, and neither is a finding — so neither may wear the mint that means
     "clear", and neither may be captioned "nothing is waiting on you". This is
     the same rule that keeps a filtered zero neutral, applied to the case
     where it matters far more: a wallet that could not be read must never look
     like a wallet with nothing on it. */
  const unread = status !== 'ready';
  const uncertain = narrowed || unread;
  const unreadCap = status === 'scanning' ? 'reading the chain' : 'the chain did not answer';
  const toSeeToHere = shown.filter(task).length;
  const takersHere = new Set(
    shown.filter((p) => p.attention).map((p) => (p.label || p.beneficiary).toLowerCase())
  ).size;

  /* What the table says when it has nothing to list. Named rather than
     described: which chain was asked, how many pairs, and the way back. */
  const onChain = supported.find((c) => c.id === chainFilter) || null;
  const filterName = FILTERS.find((f) => f.k === filter)?.label;
  const emptyShape = status === 'scanning' ? {
    title: 'Reading the chain',
    where: `asking ${supported.length} chains`,
    note: null,
    onReset: null,
  } : status === 'error' ? {
    title: 'Nothing was read',
    where: 'the chain did not answer',
    note: 'This is a failure to read, not a finding of nothing. What the wallet has granted is unchanged by our not being able to see it.',
    onReset: null,
  } : {
    title: onChain ? `Nothing on ${onChain.name}` : 'Nothing under this filter',
    where: perms.length === 0
      ? `${result?.checked ?? 0} pairs asked · none held a permission`
      : `${perms.length} read · ${filter === 'all' ? 'none on this chain' : `none ${filterName.toLowerCase()}`}`,
    note: perms.length === 0
      ? 'Nothing found is not the same as nothing existing. This asks a known list of tokens and spenders, and what it did not ask about is listed below.'
      : 'Everything read is still there — this view is narrowed. Widen it to see the rest.',
    onReset: (filter !== 'all' || chainFilter !== 0)
      ? () => { setFilter('all'); setChainFilter(0); }
      : null,
  };

  const takers = new Set(
    perms.filter((p) => p.attention).map((p) => (p.label || p.beneficiary).toLowerCase())
  ).size;
  const unbounded = perms.filter((p) => p.reading === 'UNBOUNDED').length;
  const apps = new Set(perms.map((p) => p.beneficiary.toLowerCase())).size;

  return (
    <div className="dash">
      {/* The chain in the trail is the one the picker is showing — and none
          when it is showing all of them. It used to name `chain`, which is
          whichever chain happened to be current, so a ledger reading fourteen
          chains put "· Ethereum" in its own breadcrumb and claimed a scope it
          did not have. */}
      {!embedded && (
        <Crumbs
          address={address}
          chain={supported.find((c) => c.id === chainFilter) || null}
          onBack={address ? leaveResult : forget}
        />
      )}

      {!address ? gate : (
      <>
      {/* ALWAYS THE WHOLE PAGE. This was gated on `chain && status !== 'error'`,
          so a wallet on an unlisted chain, or one read that came back 429, and
          the console, the figures, the table and the legend all vanished — and
          a reader learned nothing about what this page is, on top of learning
          nothing about their wallet. Both gates are gone. What failed is said
          in a toast, what is missing reads zero, and the shape of the thing
          stays on screen. */}
      <>
          <Verdict
            perms={perms}
            readAt={result?.readAt}
            scanning={status === 'scanning'}
            failed={status === 'error'}
          />

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

            {/* One console, the way the marketing page shows it: who the wallet
                is, then what is true of it, then the rows. These were three
                separate objects — a pill floating above the page, a heading and
                a panel — which is why the table looked considered and
                everything around it did not. */}
            <div className="a-console">
              {/* The read, drawn as work. `/`'s console sweeps because its
                  loop is always reading; this one sweeps only while it is. */}
              {status === 'scanning' && <span className="scan-line" aria-hidden="true" />}

              {/* Two tiers, the same two `/` uses: who the wallet is, then
                  what is true of it. This had its own vocabulary — a strip, a
                  dot, a note — for a header doing the identical job beside an
                  identical table, which is most of why the two pages read as
                  two products. */}
              <div className="a-console-head">
                <span className="a-wallet">
                  <span className="a-avatar" aria-hidden="true" />
                  <b>{address.slice(0, 6)}…{address.slice(-4)}</b>
                  {/* No chip. It said "Public address · read-only · not your
                      wallet" beside the address, which the note under the
                      table already says in a sentence — and says better,
                      because it says what follows from it. No single-chain
                      chip either: every chain is read, and the picker opposite
                      says how many. */}
                </span>

                <span className="a-console-acts">
                  {/* The stacked marks ARE the chain control — see
                      ui/ChainPicker.jsx. They used to sit beside a dropdown
                      that named the same chains, so the console depicted its
                      coverage in one place and let you act on it in another. */}
                  {supported.length > 1 && (
                    <ChainPicker
                      chains={supported}
                      value={chainFilter}
                      counts={perChain}
                      onChange={setChainFilter}
                    />
                  )}
                </span>
              </div>

              {/* Always. Not "once a read has finished", not "if anything was
                  found" — always. Every gate on this console was a way for the
                  page to teach a reader nothing at the exact moment they most
                  needed to understand it. Zero is a reading; so is a figure
                  that could not be fetched. */}
              {(
                <dl className="a-figs">
                  {/* No price feed, so no single total: the largest exposure
                      states the stake honestly and the count says how many
                      more sit behind it. */}
                  {/* Counted up rather than printed. The chain was read to
                      get these, and the climb is the only part of the screen
                      that says so. */}
                  <div>
                    <dt>Applications</dt>
                    {/* Mint is a finding, not an arithmetic result. Under a
                        filter a zero means "not here", so it is left neutral —
                        green would say "clear" about a wallet this view is not
                        showing. */}
                    <dd className={takersHere ? 'bad' : uncertain ? undefined : 'ok'}>
                      <Counter value={takersHere} />
                    </dd>
                    <span className="cap">
                      {unread
                        ? unreadCap
                        : narrowed
                          ? `in this view · ${takers} in the whole wallet`
                          : 'can take from this wallet'}
                    </span>
                  </div>
                  <div>
                    <dt>Permissions</dt>
                    <dd><Counter value={shown.length} /></dd>
                    <span className="cap">
                      {unread
                        ? unreadCap
                        : narrowed
                          ? `in this view · ${perms.length} in the whole wallet`
                          : `found in ${result?.checked ?? 0} token and spender pairs`}
                    </span>
                  </div>
                  {/* A list with an end to it. "Need attention" counted
                      problems; this counts what is left to do, and says so
                      when there is nothing — which is the moment a person came
                      here for and the page never used to give them. */}
                  <div>
                    <dt>To see to</dt>
                    <dd className={toSeeToHere ? 'bad' : uncertain ? undefined : 'ok'}>
                      <Counter value={toSeeToHere} />
                    </dd>
                    <span className="cap">
                      {unread
                        /* Never "nothing is waiting on you" when nothing was
                           read: that sentence is the all-clear, and an
                           all-clear on a failed read is the one lie this page
                           cannot tell. */
                        ? unreadCap
                        : narrowed
                        /* Nor under a filter: the work is elsewhere, not
                           absent. And never in the page's own shorthand —
                           "here · 5 across the whole read" was written by
                           someone who already knew what it meant. */
                        ? `in this view · ${toSeeTo} in the whole wallet`
                        : toSeeTo === 0
                          ? 'nothing is waiting on you'
                          : toSeeTo === perms.length
                            ? 'every permission found'
                            : `of ${perms.length} — the rest need nothing`}
                    </span>
                  </div>
                </dl>
              )}

              {(
                <Ledger
                  rows={shown}
                  previous={previous}
                  openId={openId}
                  canAct={mode === 'wallet'}
                  explorer={result?.explorer}
                  empty={emptyShape}
                  onOpen={(id) => setOpenId(id === openId ? null : id)}
                  onRevoke={(p) => setHandoff({ perm: p, intent: { kind: 'revoke' } })}
                  onLimit={(p, to) => setHandoff({ perm: p, intent: { kind: 'limit', ...to } })}
                />
              )}
            </div>


            {/* The legend uses the same chips the rows do, from global.css. A
                key drawn in a different style from the thing it explains makes
                a reader match them up by reading rather than by looking, which
                is the one job a key has. */}
            {/* The vocabulary, whether or not there is anything wearing it.
                It is how a reader learns what the six words mean, and an empty
                result is exactly when they have the attention to read it. */}
            {(
              <ul className="verdict-key">
                {['UNBOUNDED', 'OVER_WIDE', 'BOUNDED', 'EXPIRED', 'REMOVED', 'UNKNOWN'].map((k) => {
                  const r = reading(k);
                  return (
                    <li key={k}>
                      <span className={`state st-${KEY_TONE[k]}`}>{r.label}</span>
                      <p>{r.means}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

      </>

      {open && !handoff && (
        <Detail perm={open} chain={open.chain ?? chain} explorer={open.chain?.explorer ?? result?.explorer}
          canAct={mode === 'wallet'} onClose={() => setOpenId(null)}
          onAct={() => setHandoff({ perm: open, intent: { kind: 'revoke' } })} />
      )}

      </>
      )}

      {/* Beside every screen, not inside one of them. */}
      <Toaster notes={notes} onDismiss={dismiss} />

      {/* On the permission's own chain, not on whichever one is current. The
          ledger reads every chain at once, so the two are usually different —
          and building an approve for the wrong chain, then reading it back
          from the wrong chain, is the one mistake this panel must not make. */}
      {handoff && (
        <Handoff perm={handoff.perm}
          intent={handoff.intent}
          chain={handoff.perm.chain ?? chain}
          chainId={handoff.perm.chain?.id ?? chainId}
          owner={address}
          provider={provider} explorer={result?.explorer}
          onCancel={() => setHandoff(null)}
          onSettle={() => { setHandoff(null); setOpenId(null); refresh(); }} />
      )}
    </div>
  );
}

export { format };
