import { useCallback, useEffect, useState } from 'react';
import { Popover } from 'radix-ui';
import ChainStack from '../ChainStack.jsx';
import { isAddress } from 'viem';
import { discover, connect, watch, switchChain } from '../../lib/wallet.js';
import { chains as fetchChains, permissions as fetchPermissions, format, isDollar, ApiError } from '../../lib/api.js';
import { reading, explain } from '../../lib/readings.js';
import Ledger from './Ledger.jsx';
import Detail from './Detail.jsx';
import Handoff from './Handoff.jsx';
import Bento from './Bento.jsx';
import Gate from './Gate.jsx';
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
  { k: 'attention', label: 'Attention' },
  { k: 'unbounded', label: 'Unbounded' },
];

/* How many rows each filter would show. The artboard puts the count in the
   tab, which is the difference between a filter you try and one you choose. */
function filterCount(k, perms) {
  if (k === 'attention') return perms.filter((p) => p.attention).length;
  if (k === 'unbounded') return perms.filter((p) => p.reading === 'UNBOUNDED').length;
  return perms.length;
}

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
 * Pushed only after a read succeeds. An address in the URL is a claim that
 * this page has a reading for it, not a record of an attempted request.
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
  /* The input screen exits completely before the result view is revealed.
     Both stay mounted, so neither loses state during a handoff or refresh. */
  const [view, setView] = useState('gate'); // gate | leaving | demo

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
  /* Which chain is being asked again, so its own row can say so. */
  const [retryingChain, setRetryingChain] = useState(null);
  /* Whether the address field is the thing being used right now. */
  const [searching, setSearching] = useState(false);
  /* WHICH QUESTION THE BOX IS ASKING.
     Reading an address and connecting a wallet are two different acts with
     two different consequences, and one of them needs no wallet at all. They
     were a field with a button beside it, which said they were the same act
     with a shortcut. */
  const [entry, setEntry] = useState('read');
  /* FIRST PAINT DOES NOT ANIMATE.
   *
   * The address is taken from the URL in an effect, so a reader arriving on a
   * shared link renders the gate for one frame and then flips to the reading.
   * With transitions live that flip is a visible half second of the headline
   * collapsing and the field shrinking, on a page they asked to open already
   * read. Transitions are for a state the reader changed, not for catching up
   * with the state they arrived in. */
  /* THE DASHBOARD IS A VIEW OF RESULTS, NOT A VIEW OF AN ADDRESS.
     Keyed on a finished read rather than on something being typed: a failed
     read produced a full screen of zeros captioned "the chain did not answer",
     which is a dashboard pretending to be one. No result means the page is
     still the searching screen. A read that finished and found nothing IS a
     result, and keeps the dashboard: see demo/States and the emptyShape rules. */
  /* A READING YOU ALREADY HAVE IS STILL A READING WHILE IT IS BEING REFRESHED.
     Keyed on `status === 'ready'` this flipped to false the moment a re-read
     started, so the whole dashboard unmounted, the gate appeared for the
     length of the request, and everything flashed back. `refresh` keeps the
     previous result until a new one replaces it, and keeps it on failure too,
     so the presence of a result is the right condition. */
  const hasResult = !!result;

  useEffect(() => {
    if (view !== 'leaving') return undefined;
    const timer = window.setTimeout(() => setView('demo'), 520);
    return () => window.clearTimeout(timer);
  }, [view]);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(r);
  }, []);

  /* What went wrong, carried beside the page instead of in place of it — see
     ui/Toast.jsx. Keyed, so a re-read replaces the previous complaint about
     the same thing rather than stacking a second copy of it. */
  const [notes, setNotes] = useState([]);
  const note = useCallback((n) => {
    setNotes((ns) => [...ns.filter((x) => x.key !== n.key), { id: `${n.key}-${Date.now()}`, ...n }]);
  }, []);
  const dismiss = useCallback((id) => setNotes((ns) => ns.filter((n) => n.id !== id)), []);

  useEffect(() => {
    const report = (reason) => {
      const message = reason?.shortMessage || reason?.message || String(reason || 'Unexpected error.');
      if (!message || message === '[object Object]') return;
      const wallet = /wallet|metamask|rabby|ethereum|connect/i.test(message);
      note({
        key: `runtime:${message}`,
        tone: 'bad',
        title: wallet ? 'Wallet connection failed' : 'Something went wrong',
        body: message,
      });
    };
    const onError = (event) => {
      if (event.filename && !event.filename.startsWith(window.location.origin)) return;
      report(event.error || event.message);
    };
    const onRejection = (event) => {
      const message = event.reason?.message || String(event.reason || '');
      if (/failed to connect to metamask|metamask extension not found/i.test(message)) return;
      report(event.reason);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [note]);

  useEffect(() => {
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
        setAddress(null); setResult(null); setStatus('idle'); setView('gate');
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
      /* A newly-entered address stays in the field on failure, but never
         becomes a shareable result URL. A URL handed to us is also removed if
         it cannot be restored and there is no earlier result to preserve. */
      if (!result) writeAddress(null);
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
    if (view !== 'demo') setView('leaving');
    /* Commit the address to history only once there is actual data on screen.
       Re-reads retain their existing URL; a first successful read creates the
       one Back entry that returns to the input screen. */
    if (readAddress()?.toLowerCase() !== address.toLowerCase()) {
      writeAddress(address, { push: true });
    }
    setStatus('ready');
  }, [address, supported, result, note, view]);

  useEffect(() => {
    if (address && supported.length) refresh();
  }, [address, supported]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * One chain, asked again.
   *
   * `refresh` re-reads all fifteen, which for a single refusal spends fifteen
   * requests and discards fourteen answers that were fine. This asks the one
   * that failed and merges what comes back, so the rest of the reading on
   * screen is not disturbed by a retry of something else.
   *
   * A SECOND REFUSAL LEAVES THE CHAIN WHERE IT WAS. It stays in chainsFailed
   * and stays counted as unread, because the alternative is a chain that
   * quietly stops being listed as unreadable while still being unread.
   */
  const retryChain = useCallback(async (chain) => {
    if (!address || retryingChain) return;
    setRetryingChain(chain.id);
    try {
      const r = await fetchPermissions(chain.id, address);
      setResult((was) => {
        if (!was) return was;
        const kept = (was.permissions ?? []).filter((p) => p.chain?.id !== chain.id);
        const fresh = (r.permissions ?? []).map((p) => ({ ...p, chain, id: `${chain.id}:${p.id}` }));
        return {
          ...was,
          permissions: [...kept, ...fresh],
          checked: (was.checked ?? 0) + (r.checked ?? 0),
          chainsRead: [...(was.chainsRead ?? []).filter((c) => c.id !== chain.id), chain],
          chainsFailed: (was.chainsFailed ?? []).filter((c) => c.id !== chain.id),
        };
      });
      setNotes((ns) => ns.filter((n) => n.key !== 'partial'));
    } catch (e) {
      note({ key: `retry-${chain.id}`, tone: 'bad',
             title: `${chain.name} did not answer again`,
             body: `${explain(e)} It is still counted as unread.` });
    } finally {
      setRetryingChain(null);
    }
  }, [address, retryingChain, note]);

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
      setEntry('read');
      setMode('wallet');
      setAddress(a);
      setChainId(c);
    } catch (e) {
      const rejected = e?.code === 4001 || /reject|denied|declined/i.test(e?.message || '');
      const message = e?.shortMessage || e?.message || 'The wallet did not return an account.';
      const failure = new ApiError({
        code: 'DECLINED',
        message: rejected ? 'Connection was declined in the wallet.' : message,
      });
      setError(failure);
      note({
        key: 'connect',
        tone: 'bad',
        title: rejected ? 'Wallet connection was declined' : 'Could not connect to the wallet',
        body: message,
      });
      setStatus('idle');
    }
  }

  const discoverWallets = useCallback(async () => {
    setWallets(await discover());
  }, []);

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
    setView('gate');
    setMode('lookup');
    setProvider(null);
    setWalletName(null);
    setAddress(addr);
    setChainId(forceChain ?? supported[0]?.id ?? 8453);
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
    setOpenId(null); setHandoff(null); setStatus('idle'); setMode('wallet'); setTyped(''); setView('gate');
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
  const emptyAddressActions = (
    <div className="wfield-tabs" role="group" aria-label="Read or connect a wallet">
      <button type="button" aria-label="Read an address" title="Read an address">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
      </button>
      <ConnectButton
        wallets={wallets}
        busy={status === 'connecting'}
        onConnect={onConnect}
        onAddress={(addr) => lookUp(addr)}
        onOpen={discoverWallets}
        trigger={(
          <button type="button" aria-label="Connect a wallet" title="Connect a wallet">
            {wallets[0]?.info?.icon
              ? <img src={wallets[0].info.icon} alt="" width="20" height="20" />
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 7V4a1.2 1.2 0 0 0-1.2-1.2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                </svg>}
          </button>
        )}
      />
    </div>
  );

  return (
    /* One provider for the page. It lived inside the ledger, around the table,
       which was fine while every tooltip was on a row — the head's controls
       then threw "`Tooltip` must be used within `TooltipProvider`" and took
       the whole island down with them. */
    <TooltipProvider>
    <div className={`dash ${view === 'demo' ? 'is-read' : 'is-gate'}${view === 'leaving' ? ' is-leaving' : ''}${(searching || (status === 'scanning' && view !== 'demo')) ? ' is-searching' : ''}${ready ? '' : ' no-anim'}`}>
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
          {/* THE FIRST THING, AND FOR A MOMENT THE ONLY THING.
              Mounted in both states and collapsed by CSS in the second, so the
              field below it keeps its place in the tree and can animate from
              the middle of the page to the top of it. Unmounting this would
              move the field, and a remounted input is a new input. */}
          <div className="gate-say" aria-hidden={address ? true : undefined}>
            <h1>Who can take from your wallet <em>right now?</em></h1>
            <p>
              Apps you approved months ago can still move your tokens today. Most of
              those permissions never expire, and nothing tells you they are there.
            </p>
          </div>

          {/* TWO ACTS, NAMED, ON BOTH INPUTS.
              Reading an address and connecting a wallet are different acts
              with different consequences, and one of them needs no wallet at
              all. This sits above the field in every state: in the gate, on
              the bar over a reading, and on the field the search overlay
              grows back out of the bar. */}
          {/* THE ADDRESS BAR, ABOVE EVERYTHING IT ACTS ON.
              It used to sit inside the console header, which made the wallet
              read as a property of the table rather than as the thing the
              whole page is about. See demo/WalletField.jsx for why it is a
              field you can type in rather than a string with a menu. */}
          <div className={`b-top entry-${entry}`}>
            <div className="b-top-row">
            <WalletField
              tabs={address ? (
                <span className="wfield-acts">
                  <HeadActions
                    address={address}
                    explorer={(onlyChain || result?.chainsRead?.[0])?.explorer}
                    connected={!!provider}
                    onForget={forget}
                  />
                </span>
              ) : emptyAddressActions}
              emptyTabs={emptyAddressActions}
              address={address}
              placeholder={address ? 'Read any public address' : 'Paste your wallet address'}
              onActive={setSearching}
              walletName={walletName}
              connected={!!provider}
              busy={status === 'scanning'}
              held={held}
              recentsKey={result?.readAt}
              onRead={(addr, forceChain) => lookUp(addr, forceChain)}
              onClear={forget}
            />
            </div>
            {status === 'scanning' && (
              <p className="b-search-progress" role="status">
                Reading this address across {supported.length} chains…
              </p>
            )}
          </div>

          <Gate
            supported={supported}
            wallets={wallets}
            busy={status === 'scanning' || status === 'connecting'}
            hidden={hasResult}
            onRead={(addr, forceChain) => lookUp(addr, forceChain)}
            onConnect={() => wallets[0] && onConnect(wallets[0])}
          />

          {/* Naked on the ground rather than inside a panel. The page says what
              it is before it says what it found, and a heading that is not in a
              box is the cheapest way to stop everything reading as one
              undifferentiated stack of cards. */}
          <div className="b-head">
            <h1>Present authority</h1>
            <p>
              {!address
                ? 'Give an address above, or connect a wallet. Read-only until you ask for a change, and any change is handed to your wallet unsigned.'
                : status === 'scanning'
                  ? <>Reading <b>{address.slice(0, 6)}…{address.slice(-4)}</b> across {supported.length} chains.</>
                  : status === 'error'
                    ? <>The chain did not answer for <b>{address.slice(0, 6)}…{address.slice(-4)}</b>. Nothing below has been refreshed.</>
                    : <>
                        Read from <b>{address.slice(0, 6)}…{address.slice(-4)}</b>
                        {result?.readAt ? ` at ${new Date(result.readAt).toLocaleTimeString()}` : ''}
                        {`, across ${result?.chainsRead?.length ?? 0} of ${supported.length} chains.`}
                      </>}
            </p>
          </div>

          <Bento
            perms={perms}
            supported={supported}
            perChain={perChain}
            result={result}
            status={status}
            takersHere={takersHere}
            toSeeToHere={toSeeToHere}
            takers={takers}
            toSeeTo={toSeeTo}
            narrowed={narrowed}
            unread={unread}
            uncertain={uncertain}
            unreadCap={unreadCap}
            onRetryChain={retryChain}
            retryingChain={retryingChain}
            onRefresh={address ? refresh : null}
            ledgerHead={(
              <div className="b-ledger-head">
                <div className="b-ledger-title">
                  <h2>
                    {!address ? 'Nothing read yet'
                      : narrowed ? `${shown.length} of ${perms.length} shown`
                      : `${perms.length} permission${perms.length === 1 ? '' : 's'}`}
                  </h2>
                  <Popover.Root>
                    <Popover.Trigger asChild>
                      <button type="button" className="b-ledger-info" aria-label="About these permissions">
                        <svg viewBox="0 0 16 16" aria-hidden="true">
                          <circle cx="8" cy="8" r="6.25" />
                          <path d="M8 7.1v4.05M8 4.6v.1" />
                        </svg>
                      </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content className="b-ledger-pop dash" side="bottom" align="start" sideOffset={8} collisionPadding={16}>
                        Each of these was granted once and has been live ever since. Removing one is a transaction your own wallet signs.
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>
                <span className="b-ledger-controls">
                  {/* The chain control filters THIS table, so it lives in this
                      table's header. In the address bar it read as a property
                      of the wallet, which is the one thing it is not. */}
                  {supported.length > 1 && (
                    <ChainPicker
                      chains={supported}
                      value={chainFilter}
                      counts={perChain}
                      onChange={setChainFilter}
                    />
                  )}
                  <div className="filters" role="tablist" aria-label="Filter permissions">
                    {FILTERS.map(({ k, label }) => (
                      <button key={k} type="button" role="tab" aria-selected={filter === k}
                        className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
                        {label} <span className="f-n">{filterCount(k, perms)}</span>
                      </button>
                    ))}
                  </div>
                </span>
              </div>
            )}
            ledger={(
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
          />

          {/* The legend uses the same chips the rows do, from global.css. A
              key drawn in a different style from the thing it explains makes a
              reader match them up by reading rather than by looking, which is
              the one job a key has. The card above counts the readings; this
              says what each word means, and they are different jobs. */}
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

          <p className="b-foot">
            Nothing here is signed and nothing is a recommendation. A correction is built
            by the engine, handed to your wallet unsigned, and read back off the chain
            afterwards.
          </p>

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
