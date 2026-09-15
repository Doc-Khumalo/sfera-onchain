import { Counter, Amount } from '../ui/Counter.jsx';
import { format, isDollar } from '../../lib/api.js';
import { reading } from '../../lib/readings.js';
import { PermissionReceipt } from '../Receipt.jsx';

/**
 * The line a person actually came for.
 *
 * ONE SENTENCE, EVERY STATE. It used to be five: a headline for reading, one
 * for nothing found, one for a failed read, one for an unbounded wallet and
 * one for a bounded one — each a different length, so the section changed
 * shape at every step and a reader lost their place twice per read. Now there
 * is one sentence and its two figures climb into it, from nought before
 * anything is known to whatever the chain returned. The words stay put; only
 * the numbers move.
 *
 * It states quantities per asset rather than one converted total, because
 * converting to a currency needs a price feed the proof of concept does not
 * have, and a single invented figure on a security product is worse than five
 * honest ones. The one figure it does give is a sum of dollar stablecoins,
 * which is arithmetic rather than conversion — and it says "at least" whenever
 * something reachable could not join that sum.
 */

/* What the engine knows about expiry, in the words the table uses. The payload
   carries no expiry field, so this comes from its own reasoning. */
function expiryOf(p) {
  if ((p.because ?? []).some((b) => /no expiry/i.test(b))) return 'Never';
  if (p.reading === 'EXPIRED') return 'Expired';
  if (p.reading === 'REMOVED') return 'Removed';
  return 'Not established';
}

const rawOf = (p) => {
  try { return BigInt(p.reachableNow ?? '0'); } catch { return 0n; }
};

/* Rescaled to hundredths so tokens of different decimals can be added: USDC's
   six and DAI's eighteen both turn up, and they are the same dollar. */
function toCents(p) {
  const d = p.decimals || 0;
  const v = rawOf(p);
  return d > 2 ? v / (10n ** BigInt(d - 2)) : v * (10n ** BigInt(2 - d));
}

export default function Verdict({ perms, readAt, scanning, failed, waiting }) {
  /* Everything with something to take today, whatever its reading. A bounded
     permission over a live balance can still take that balance; leaving it out
     of the sentence would understate what is reachable, and understating is
     the one direction that makes a wallet look safer than it is. */
  const live = perms.filter((p) => rawOf(p) > 0n);
  const apps = new Set(live.map((p) => (p.label || p.beneficiary).toLowerCase()));
  const unbounded = perms.filter((p) => p.reading === 'UNBOUNDED');
  const attention = perms.filter((p) => p.attention);

  const dollars = live.filter((p) => isDollar(p.symbol));
  const cents = dollars.reduce((n, p) => n + toCents(p), 0n);
  /* Reachable in something the sum cannot hold. The figure is then a floor,
     and the sentence says so. */
  const unpriced = live.filter((p) => !isDollar(p.symbol));

  const otherTotals = Object.values(
    unpriced.reduce((acc, p) => {
      const k = p.symbol || 'unreadable';
      acc[k] = acc[k] ?? { total: 0n, decimals: p.decimals, symbol: p.symbol };
      acc[k].total += rawOf(p);
      return acc;
    }, {}),
  );
  const others = otherTotals.map((a) => format(a.total.toString(), a.decimals, a.symbol));

  /* One permission gets printed, and it is the one with most at stake — which
     means the largest DOLLAR exposure, not the largest raw number.
   *
     Ranking on base units is the mistake this codebase already caught once
     in the console's figures: 5.9315 WETH carries eighteen decimals and
     $14,707.73 of USDC carries six, so the raw comparison put the WETH row on
     the receipt and printed "5.9315 WETH" where a figure anyone can read
     belonged. Rescaling by decimals does not fix it either — one WETH and one
     USDC are not comparable amounts.
   *
     So: rank the dollar-denominated permissions against each other, where the
     comparison is real, and print the largest. A wallet holding nothing in
     dollars falls back to the first permission worth acting on, in its own
     units, because there is no honest way to rank across assets without a
     price feed this page does not have. */
  const pool = attention.length > 0 ? attention : perms;
  const priced = pool.filter((p) => isDollar(p.symbol) && rawOf(p) > 0n);
  const worst = priced.length
    ? priced.reduce((a, b) => (toCents(b) > toCents(a) ? b : a))
    : (pool.length ? pool[0] : null);

  /* Money is shown as money, and it climbs to its figure the way every other
     number on this page does. A dollar asset prints with the mark and no
     ticker — "$14,707.73" reads at a glance where "14,707.73 USDC" asks the
     reader to know what USDC is. */
  const asMoney = (p, raw) => (isDollar(p.symbol)
    ? <Amount raw={raw ?? '0'} decimals={p.decimals} money prefix="$" />
    : <Amount raw={raw ?? '0'} decimals={p.decimals} symbol={p.symbol} />);

  const blank = waiting || scanning || failed || perms.length === 0;

  /* A ZERO THAT WAS EARNED. Nothing reachable is a win and the figures say so
     in mint — but only when the zero is a finding. Before a read, during one,
     and after one that failed, the same zero means "not established", and mint
     there is the all-clear this page exists not to give.
   *
     Nor when the read simply found nothing: Marketing Plan §30 — no issue
     detected is not presented as guaranteed safety, and an empty result is
     the case that sentence was written for. Mint is for a wallet whose
     permissions were read, counted, and reach nothing. */
  const clear = !blank && perms.length > 0 && live.length === 0;
  const tone = attention.length > 0 ? 'bad' : clear ? 'ok clear' : 'ok';

  const kicker = waiting ? 'Not read yet'
    : scanning ? 'Reading the chain'
    : failed ? 'Not read'
    : perms.length === 0 ? 'Nothing found'
    : readAt ? `Read ${new Date(readAt).toLocaleTimeString()}`
    : 'Read from the chain';

  const receiptState = waiting ? 'Not read yet'
    : scanning ? 'Reading'
    : failed ? 'Not read'
    : 'Nothing found';

  const sub = waiting
    ? 'Give an address above, or connect a wallet, and this reads its standing token permissions directly from the chain. Read-only until you ask for a change, and any change is handed to your wallet unsigned.'
    : failed
      ? 'A zero here is a failure to read, not a finding of nothing. What this wallet has granted is unchanged by our not being able to see it.'
      : perms.length === 0
        ? 'That is not the same as this wallet having none. It means the applications we know to ask about do not hold one.'
        : attention.length > 0
          ? (cents === 0n && unpriced.every((p) => rawOf(p) === 0n)
            ? 'The balances these reach are empty. The authority is not: it covers whatever arrives next, without being asked again.'
            : 'Each of these was granted once and has been live ever since. Removing one is a transaction your own wallet signs.')
          : 'Bounded is not safe. It is a smaller blast radius, not none.';

  return (
    <section className={`verdict ${tone} split`}>
      <p className="v-kicker">
        {scanning && (
          <span className="live-dot mr-2 inline-block h-1.5 w-1.5 rounded-full bg-ok align-middle" />
        )}
        {kicker}
      </p>

      {/* The same sentence, always, with the numbers climbing into it. */}
      <h2 className="v-line">
        <b><Counter value={apps.size} /></b>{' '}
        {apps.size === 1 ? 'application can take' : 'applications can take'}{' '}
        <b>
          {(unpriced.length > 0 && cents > 0n) || otherTotals.length > 1 ? 'at least ' : ''}
          {/* A dollar figure when there is one. When the wallet holds nothing
              this page can price, "$0.00" beside "can take" is a zero that is
              not true — 4.2 UNI is reachable and the sentence would be saying
              nothing is. It states the largest amount it can name instead, in
              that asset's own units. */}
          {cents > 0n || otherTotals.length === 0 ? (
            <Amount raw={cents.toString()} decimals={2} money prefix="$" />
          ) : (
            <Amount
              raw={otherTotals[0].total.toString()}
              decimals={otherTotals[0].decimals}
              symbol={otherTotals[0].symbol}
            />
          )}
        </b>{' '}
        from this wallet.
        {unbounded.length > 0 && <> Nothing expires.</>}
      </h2>

      {/* The receipt, printed from what was actually read — and printed on
          every state, with the figures it has, which before a read is none of
          them. It was hidden while scanning, so the column emptied for the
          length of every read and the section changed shape twice. */}
      {blank || !worst ? (
        <PermissionReceipt
          state={receiptState}
          allowance="0"
          reachable="0"
          expires="Not established"
          action={scanning ? 'Asking every application we know' : '$0.00 reachable across this wallet'}
        />
      ) : (
        <PermissionReceipt
          perm={{ ...worst, readingLabel: reading(worst.reading).label }}
          allowance={worst.unbounded ? 'Unlimited' : asMoney(worst, worst.granted)}
          reachable={asMoney(worst, worst.reachableNow)}
          expires={expiryOf(worst)}
          /* The wallet's whole reach, in the units it can be said in — and
             without a "$0.00" clause when there are no dollars in it. */
          action={cents > 0n
            ? `$${format(cents.toString(), 2, null, true)} reachable across this wallet${others.length ? `, and ${others.join(' · ')}` : ''}`
            : others.length
              ? `${others.join(' · ')} reachable across this wallet`
              : 'Nothing reachable across this wallet'}
        />
      )}

      {scanning ? (
        /* The sweep is the work, not a spinner. The engine really is moving
           through pairs, so the page shows that rather than a shape that only
           says something is happening somewhere. */
        <p className="v-sub"><span className="v-scan"><span className="scan-line" /></span></p>
      ) : (
        <p className="v-sub">{sub}</p>
      )}
    </section>
  );
}
