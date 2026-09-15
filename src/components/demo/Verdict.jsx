import { Counter, Amount } from '../ui/Counter.jsx';
import { format, isDollar } from '../../lib/api.js';

/**
 * The line a person actually came for.
 *
 * Four equal tiles reading 3, 3, 3, 1 make someone do arithmetic to find out
 * whether they should care. This says it once, in a sentence, and then shows
 * the amounts underneath.
 *
 * It states quantities per asset rather than one converted total, because
 * converting to a currency needs a price feed the proof of concept does not
 * have, and a single invented figure on a security product is worse than five
 * honest ones.
 */
export default function Verdict({ perms, readAt, scanning, failed }) {
  if (scanning) {
    return (
      <section className="verdict">
        <p className="v-kicker">
          <span className="live-dot mr-2 inline-block h-1.5 w-1.5 rounded-full bg-ok align-middle" />
          Reading the chain
        </p>
        <h2 className="v-line">Asking every application we know.</h2>
        {/* The sweep is the work, not a spinner. The engine really is moving
            through pairs, so the page shows that rather than a shape that
            only says something is happening somewhere. */}
        <div className="relative mt-9 h-px overflow-hidden bg-line">
          <span className="scan-line" />
        </div>
      </section>
    );
  }

  const unbounded = perms.filter((p) => p.reading === 'UNBOUNDED');
  const attention = perms.filter((p) => p.attention);
  const apps = new Set(attention.map((p) => (p.label || p.beneficiary).toLowerCase()));

  /* A read that failed is not a wallet with nothing on it, and must never be
     written as one. The page still stands — the console, the table and the
     legend are all below this — but the sentence at the top of it says what
     actually happened. */
  if (failed) {
    return (
      <section className="verdict split">
        <p className="v-kicker">Not read</p>
        <h2 className="v-line">This wallet has not been read.</h2>
        <ul className="v-amounts">
          <li>
            <span className="va-n zero">0</span>
            <span className="va-l">permissions read · the chain did not answer</span>
          </li>
        </ul>
        <p className="v-sub">
          A zero here is a failure to read, not a finding of nothing. What this
          wallet has granted is unchanged by our not being able to see it.
        </p>
      </section>
    );
  }

  if (perms.length === 0) {
    return (
      <section className="verdict ok split">
        <p className="v-kicker">{readAt ? `Read ${new Date(readAt).toLocaleTimeString()}` : 'Read from the chain'}</p>
        <h2 className="v-line">
          No standing permission turned up in what we asked about.
        </h2>
        <ul className="v-amounts">
          <li>
            <span className="va-n zero">0</span>
            <span className="va-l">reachable by anything we asked about</span>
          </li>
        </ul>
        <p className="v-sub">
          That is not the same as this wallet having none. It means the
          applications we know to ask about do not hold one.
        </p>
      </section>
    );
  }

  const raw = (p) => { try { return BigInt(p.reachableNow ?? '0'); } catch { return 0n; } };

  /* ONE FIGURE. The panel listed every permission's reachable amount, which is
     the Reachable column of the table directly underneath it — the same five
     numbers, twice, with the second copy dressed as a summary. A summary that
     repeats its source is not a summary.
   *
   * So: what can be added, added. Dollar stablecoins are denominated in the
   * same unit and sum honestly — this is arithmetic on USDC and USDT, not a
   * price feed, and it is the figure a person actually wants. What cannot be
   * added does not get added: WETH and UNI are named underneath in their own
   * units, because converting them would need a price this page does not have
   * and will not invent.
   *
   * MARKETING PLAN §30 and the note this file already carried: no single
   * converted total. A sum of dollars is not a conversion. */
  const scope = attention.length > 0 ? attention : perms;

  const dollars = scope.filter((p) => isDollar(p.symbol));
  const dollarTotal = dollars.reduce((n, p) => {
    /* Rescale each to hundredths before adding: two dollar tokens do not
       have to share a decimals value, and USDC's 6 and DAI's 18 are both
       common. */
    const d = p.decimals || 0;
    const v = raw(p);
    return n + (d > 2 ? v / (10n ** BigInt(d - 2)) : v * (10n ** BigInt(2 - d)));
  }, 0n);

  const others = scope.filter((p) => !isDollar(p.symbol));
  const lead = dollars.length > 0
    ? { figure: `${(dollarTotal / 100n).toLocaleString('en-US')}.${(dollarTotal % 100n).toString().padStart(2, '0')}`,
        label: dollars.length > 1
          ? `reachable now, across ${[...new Set(dollars.map((p) => p.symbol))].join(' and ')}`
          : `reachable by ${dollars[0].label || 'an unverified spender'}`,
        zero: dollarTotal === 0n }
    : others.length > 0
      ? { figure: format(others[0].reachableNow ?? '0', others[0].decimals, others[0].symbol),
          label: `reachable by ${others[0].label || 'an unverified spender'}`,
          zero: raw(others[0]) === 0n }
      : { figure: '0', label: 'reachable by anything we asked about', zero: true };

  /* Everything that cannot join that sum, named in its own unit — one entry
     per asset, not one per permission. Two Permit2 approvals over the same
     WETH produced "0 WETH · 0 WETH", which reads as a mistake because it is
     one: the line is a list of assets, and an asset appears once. */
  const rest = Object.entries(
    (dollars.length > 0 ? others : others.slice(1)).reduce((acc, p) => {
      const key = p.symbol || 'unreadable';
      acc[key] = acc[key] ?? { total: 0n, decimals: p.decimals, symbol: p.symbol };
      acc[key].total += raw(p);
      return acc;
    }, {}),
  ).map(([, a]) => format(a.total.toString(), a.decimals, a.symbol));

  const tone = attention.length > 0 ? 'bad' : 'ok';
  const shape = ' split';

  return (
    <section className={`verdict ${tone}${shape}`}>
      <p className="v-kicker">{readAt ? `Read ${new Date(readAt).toLocaleTimeString()}` : 'Read from the chain'}</p>

      {attention.length > 0 ? (
        <h2 className="v-line">
          {/* Two counts in one sentence read badly: an application count
              followed by a permission count made "1 application ... none of
              them expires". The expiry clause stands on its own instead. */}
          <b><Counter value={apps.size} /></b> {apps.size === 1 ? 'application can' : 'applications can'} take
          from this wallet.
          {unbounded.length > 0 && <> Nothing expires.</>}
        </h2>
      ) : (
        <h2 className="v-line">Everything found is bounded.</h2>
      )}

      {/* No entrance on the panel: it is the frame, not the news. The figures
          inside it climb, and they are the same figures the table's Reachable
          column shows, so they climb the same way. Red is reserved for an
          amount actually at stake — a zero is a fact, not an alarm. */}
      <ul className="v-amounts">
        <li>
          <span className={`va-n${lead.zero ? ' zero' : ''}`}>{lead.figure}</span>
          <span className="va-l">{lead.label}</span>
          {rest.length > 0 && (
            <span className="va-rest">
              and {rest.join(' · ')} — different units, not added to it
            </span>
          )}
        </li>
      </ul>

      <p className="v-sub">
        {attention.length > 0
          ? lead.zero && rest.every((r) => /^0(\.00)? /.test(r) || r === '0')
            /* Zero reachable is the case people misread as safe, so the
               sentence says what the zero does not mean. Under the figure,
               not instead of it. */
            ? 'The balances these reach are empty. The authority is not: it covers whatever arrives next, without being asked again.'
            : 'Each of these was granted once and has been live ever since. Removing one is a transaction your own wallet signs.'
          : 'Bounded is not safe. It is a smaller blast radius, not none.'}
      </p>
    </section>
  );
}
