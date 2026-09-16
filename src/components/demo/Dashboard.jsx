import { useCallback, useEffect, useState } from 'react';
import ChainStack from '../ChainStack.jsx';
import { isAddress } from 'viem';
import { discover, connect, watch, switchChain } from '../../lib/wallet.js';
import { chains as fetchChains, permissions as fetchPermissions, format, isDollar, ApiError } from '../../lib/api.js';
import { reading, explain } from '../../lib/readings.js';
import Ledger from './Ledger.jsx';
import Detail from './Detail.jsx';
import Handoff from './Handoff.jsx';
import Verdict from './Verdict.jsx';
import { ChainPicker } from '../ui/ChainPicker.jsx';
import WalletField, { rememberRecent } from './WalletField.jsx';
import HeadActions from './HeadActions.jsx';
import ConnectButton from './ConnectButton.jsx';
import KeepInTouch from './KeepInTouch.jsx';
import { EXAMPLES } from '../../data/site.js';
import { Counter } from '../ui/Counter.jsx';
import { Toaster } from '../ui/Toast.jsx';
import { TooltipProvider } from '../ui/Tooltip.jsx';

/* The examples themselves live in data/site.js, each verified against the live
   engine before being written down — see the note there. This is only the
   chain a handed-over address falls back to when the list has not loaded. */
const EXAMPLE = EXAMPLES[0];

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

      {/* Two steps, not three. "Read a wallet" was a rung between the site
          and the wallet on screen, and it named the page you are already on:
          the Back button leaves, the address says where you are, and the
          middle step was a link to here from here. */}
      <ol>
        <li><a href="/">Sfera Onchain</a></li>
        <li>
          {atResult ? (
            <span aria-current="page">
              {address.slice(0, 6)}…{address.slice(-4)}
              {chain && <em> · {chain.name}</em>}
            </span>
          ) : (
            <span aria-current="page">Read a wallet</span>
          )}
        </li>
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

/* `picked` is a set of chain ids. Empty means every chain — a filter that
   selects nothing selects everything, which is what "All chains" is. */
function match(p, f, picked) {
  if (picked.size > 0 && !picked.has(p.chain?.id)) return false;
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
  /* A set, empty by default, which is every chain: a reader should not have to
     already suspect a chain to be shown what is on it. It was one id, so the
     ledger could be narrowed to exactly one chain or to all fifteen and
     nothing in between — and "the two I actually use" is the ordinary case. */
  const [chainFilter, setChainFilter] = useState(() => new Set());
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

    /* A record that this address was read — see functions/api/probe.js for
       what is kept and what is deliberately not. Fire and forget: the reading
       is already on screen and nothing about it waits on our bookkeeping. */
    fetch('/api/probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address,
        chains: ok.map((r) => r.chain.id),
        found: merged.permissions.length,
      }),
    }).catch(() => {});

    rememberRecent(address, merged.permissions.length);

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
    const addr = (value ?? '').trim();
    if (!isAddress(addr)) {
      const bad = new ApiError({ code: 'ADDRESS_INVALID', message: 'That is not a valid address.' });
      setError(bad);
      note({ key: 'addr', tone: 'bad', title: 'That is not a valid address',
             body: 'An address is 42 characters and begins 0x. Nothing was sent.' });
      return;
    }
    setNotes((ns) => ns.filter((n) => n.key !== 'addr'));
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

  /* Change the wallet: clear the reading and put the address back in the
     field, so the ordinary case — one character wrong — is an edit rather
     than retyping forty-two of them. */
  function editAddress() {
    const was = address;
    forget();
    setTyped(was ?? '');
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
  /* THERE IS NO GATE.
   *
   * It was a screen of its own: a headline, a sentence and a field, standing
   * between a reader and the thing this page is. Someone who had never seen
   * the ledger had to commit an address to it before learning what it would
   * do with one — and it was a second layout to keep in step with the first,
   * which is where most of this page's alignment bugs came from.
   *
   * So the field moved into the console, where the wallet's identity sits once
   * there is one, and the ledger is on screen from the first frame: the
   * figures read zero, the table says nothing has been read yet, and the
   * vocabulary underneath is there to be read while a reader decides. Nothing
   * is hidden behind an act of faith.
   */
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
  const narrowed = filter !== 'all' || chainFilter.size > 0;

  /* A zero that has not been established. Scanning and failure both produce
     one, and neither is a finding — so neither may wear the mint that means
     "clear", and neither may be captioned "nothing is waiting on you". This is
     the same rule that keeps a filtered zero neutral, applied to the case
     where it matters far more: a wallet that could not be read must never look
     like a wallet with nothing on it. */
  const unread = !address || status !== 'ready';
  const uncertain = narrowed || unread;
  const unreadCap = !address
    ? 'nothing asked yet'
    : status === 'scanning' ? 'reading the chain' : 'the chain did not answer';
  const toSeeToHere = shown.filter(task).length;
  const takersHere = new Set(
    shown.filter((p) => p.attention).map((p) => (p.label || p.beneficiary).toLowerCase())
  ).size;

  /* What the table says when it has nothing to list. Named rather than
     described: which chain was asked, how many pairs, and the way back. */
  /* Named only when one chain is picked: "Nothing on Base and Unichain" is a
     sentence about two places, and the row has one line to say it in. */
  const onlyChain = chainFilter.size === 1
    ? supported.find((c) => chainFilter.has(c.id)) || null
    : null;
  const onChain = onlyChain;
  const filterName = FILTERS.find((f) => f.k === filter)?.label;
  const emptyShape = !address ? {
    title: 'Nothing read yet',
    /* Whether this browser has a wallet in it is a fact about the reader's
       machine, not about the field — so it says so here rather than taking a
       line in the bar, and it never tells someone to connect a wallet that
       is not there. */
    where: wallets.length > 0
      ? 'give an address above, or connect a wallet'
      : 'give an address above, since no wallet was found in this browser',
    note: null,
    onReset: null,
  } : status === 'scanning' ? {
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
      : 'Everything read is still there. This view is narrowed, so widen it to see the rest.',
    onReset: narrowed
      ? () => { setFilter('all'); setChainFilter(new Set()); }
      : null,
  };

  /* What we can see of what this wallet holds: the balances the engine returned
     for the tokens it asked about, summed where they are dollars. Not a
     portfolio — every token we looked at and no others. */
  const heldCents = perms
    .filter((p) => isDollar(p.symbol) && p.held != null)
    .reduce((n, p) => {
      const d = p.decimals || 0;
      let v = 0n;
      try { v = BigInt(p.held); } catch { v = 0n; }
      return n + (d > 2 ? v / (10n ** BigInt(d - 2)) : v * (10n ** BigInt(2 - d)));
    }, 0n);
  const held = perms.length ? `$${format(heldCents.toString(), 2, null, true)}` : null;

  const takers = new Set(
    perms.filter((p) => p.attention).map((p) => (p.label || p.beneficiary).toLowerCase())
  ).size;
  const unbounded = perms.filter((p) => p.reading === 'UNBOUNDED').length;
  const apps = new Set(perms.map((p) => p.beneficiary.toLowerCase())).size;

  return (
    /* One provider for the page. It lived inside the ledger, around the table,
       which was fine while every tooltip was on a row — the head's controls
       then threw "`Tooltip` must be used within `TooltipProvider`" and took
       the whole island down with them. */
    <TooltipProvider>
    <div className="dash">
      {/* The chain in the trail is the one the picker is showing — and none
          when it is showing all of them. It used to name `chain`, which is
          whichever chain happened to be current, so a ledger reading fourteen
          chains put "· Ethereum" in its own breadcrumb and claimed a scope it
          did not have. */}
      {!embedded && (
        <Crumbs
          address={address}
          chain={onlyChain}
          onBack={address ? leaveResult : forget}
        />
      )}

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
            waiting={!address}
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
              {/* ONE BAR, WHATEVER IS IN IT. The address is a field you can
                  type in — see demo/WalletField.jsx — and the four things you
                  can do to the wallet it names sit beside it rather than
                  behind a menu. It was a string, a pencil, and a popover
                  holding re-read, copy, explorer and disconnect: four single
                  actions on the thing the bar was already naming. */}
              <div className="a-console-head">
                {/* The address, the other way to give one, and the things that
                    can be done to whatever is on screen: one group. They were
                    at opposite ends of a 1250px bar, which made both the marks
                    and the connect button read as belonging to the chain
                    control they were sitting next to. */}
                <span className="a-console-who">
                  <WalletField
                    address={address}
                    walletName={walletName}
                    connected={!!provider}
                    busy={status === 'scanning'}
                    held={held}
                    recentsKey={result?.readAt}
                    onRead={(addr, forceChain) => lookUp(addr, forceChain)}
                  />

                  {/* Discovery runs on mount, so this is whatever is actually
                      installed.

                      `mode` starts at 'wallet' — it names which gate used to be
                      showing, not whether anything is connected, and a
                      condition on it hid this button exactly when nobody had a
                      wallet. A provider is the only thing that means connected. */}
                  {!provider && (
                    <ConnectButton
                      wallets={wallets}
                      busy={status === 'connecting'}
                      onConnect={onConnect}
                      onAddress={(a) => lookUp(a)}
                    />
                  )}

                  {address && (
                    <HeadActions
                      address={address}
                      explorer={(onlyChain || result?.chainsRead?.[0])?.explorer}
                      connected={!!provider}
                      onForget={forget}
                    />
                  )}
                </span>

                <span className="a-console-acts">

                  {/* The stacked marks ARE the chain control — see
                      ui/ChainPicker.jsx. */}
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
                            : `of ${perms.length}, and the rest need nothing`}
                    </span>
                  </div>
                </dl>
              )}

              {(
                <Ledger
                  rows={shown}
                  /* What makes this a different list rather than the same one
                     re-rendered. The ledger holds back rows past the first
                     screenful, and any of these three means the reader is
                     looking at something else and should not inherit however
                     far they had expanded the last one. */
                  resetKey={`${address}|${filter}|${[...chainFilter].sort().join(',')}`}
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
            {/* The vocabulary, when there are rows wearing it. On an empty
                table it is six definitions of nothing. */}
            {shown.length > 0 && (
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

      {/* Beside every screen, not inside one of them. */}
      {/* Asked once, a few seconds after a reading is on screen — see
          demo/KeepInTouch.jsx for why not sooner and why not twice. */}
      <KeepInTouch when={status === 'ready' && !!result} />

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
    </TooltipProvider>
  );
}

export { format };
