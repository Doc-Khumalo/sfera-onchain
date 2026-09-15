import {
  PermissionTable, PermissionRows, PermissionRow, AppCell, StateChip,
} from '../ui/PermissionTable.jsx';
import { AssetMark } from '../ui/AssetMark.jsx';

/**
 * The example console's rows, on the shared table.
 *
 * This was written inline in alt.astro. It moved here for one reason: an
 * Astro template cannot hand markup to a component, so as long as the rows
 * lived in the page, the page had to own the <table> too — which is exactly
 * how the demo ended up with a second one. As a component it passes React
 * nodes into the shared shell, and the data stays in alt.astro where its
 * invariants are checked.
 *
 * Rendered without a client directive, so it still ships no JavaScript. Every
 * moving part below is a CSS animation bound by class name in alt.css:
 * `a-s{set}-r{row}` swaps a cell's old value for its new one, `au-*` rolls a
 * figure, `a-s{set}-f{row}` runs the row's own colour from fault to corrected.
 * The markup's whole job is to carry those names.
 */

/* A figure that rolls rather than being already there. The three <i>s are the
   digit columns alt.css spells out; they carry no text of their own. */
const Roll = ({ className }) => (
  <span className={className}>
    <span className="rnum"><i className="m" /><i className="g" /><i className="p" /></span>
  </span>
);

/* The old value and the new one, stacked in one grid cell so the row cannot
   change height as one replaces the other. */
const Swap = ({ className, was, wasClass, now, nowClass }) => (
  <span className={`a-sw ${className}`}>
    <span className={['was', wasClass].filter(Boolean).join(' ')}>{was}</span>
    <span className={['now', nowClass].filter(Boolean).join(' ')}>{now}</span>
  </span>
);

export default function ConsoleTable({ wallets }) {
  return (
    <PermissionTable>
      {wallets.map((w, si) => {
        const set = si + 1;
        return (
          <PermissionRows key={w.id} className={`a-set a-set-${set}`}>
            {w.rows.map((r) => {
              /* The corrected rows animate their own tint and marker, so they
                 take no static reading class; the rest wear theirs. */
              const swap = `a-s${set}-r${r.fault}`;

              return (
                <PermissionRow
                  key={`${r.app}-${r.via}`}
                  tone={r.fault ? null : r.status}
                  className={r.fault ? `a-s${set}-f${r.fault}` : null}

                  /* The asset is in the mark now, so the line beneath the
                     name says the two things a mark cannot: which contract
                     holds the authority, and which chain — in words, because a
                     14px badge is a reminder, not a label. */
                  app={
                    <AppCell
                      mark={
                        <AssetMark
                          symbol={r.asset}
                          chainFile={r.chain}
                          chainName={r.chainName}
                          size={28}
                        />
                      }
                      name={r.app}
                      meta={`${r.via} · ${r.chainName}`}
                    />
                  }

                  allowance={
                    r.grantTo
                      ? <Swap className={swap}
                          was={r.grant} wasClass={r.tone}
                          now={r.grantTo} nowClass={r.toneTo} />
                      : <span className={r.tone}>{r.grant}</span>
                  }

                  reachable={
                    r.roll ? (
                      <Roll className={`roll a-count ${r.roll} au-s${set}r1`} />
                    ) : r.usd ? (
                      /* The one row whose asset is not itself money: the count
                         of items, and under it what they are worth. */
                      <span className="a-reach">
                        <span className="a-reach-n">
                          <Roll className={`roll a-count au-s${set}r2`} />
                          <span className="a-nfts">&nbsp;{r.suffix}</span>
                        </span>
                        <Roll className={`roll usd a-count a-reach-usd au-s${set}r2u`} />
                      </span>
                    ) : r.third ? (
                      <Roll className={`roll a-count d2 au-s${set}r3`} />
                    ) : (
                      <span className="quiet">{r.still}</span>
                    )
                  }

                  expires={
                    r.endsTo
                      ? <Swap className={swap} was={r.ends} now={r.endsTo} />
                      : r.ends
                  }

                  state={
                    r.stateTo
                      ? <Swap className={swap}
                          was={r.state} wasClass={`state ${r.stateTone}`}
                          now={r.stateTo} nowClass={`state ${r.stateToneTo}`} />
                      : <StateChip tone={r.stateTone.replace('st-', '')}>{r.state}</StateChip>
                  }

                  action={
                    r.done ? (
                      /* The press is animated too — the pill dips at the moment
                         the loop acts, so the correction reads as something
                         done rather than something that was always true. */
                      <Swap className={`${swap} a-s${set}-p${r.fault}`}
                        was={r.verb} wasClass="a-pill a-pill-go"
                        now={r.done} nowClass={`a-pill ${r.fault === 1 ? 'a-pill-ok' : 'a-pill-gone'}`} />
                    ) : (
                      <span className="a-none">{r.act}</span>
                    )
                  }
                />
              );
            })}
          </PermissionRows>
        );
      })}
    </PermissionTable>
  );
}
