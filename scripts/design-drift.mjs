/**
 * Does the code still say what the design says?
 *
 * This exists because it turned out not to. The artboards under
 * design/demo-canvas are the specification, and src/styles/bento.css drifted
 * from them repeatedly because it was written from recollection of those
 * files rather than from the files. Recollection is not a process. This is.
 *
 * Each rule below names a property, the artboard that states it, and the
 * selector in the implementation that is meant to restate it. A mismatch
 * prints both values and the run exits non-zero.
 *
 * Run: node scripts/design-drift.mjs
 */
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

/** The text inside the block that opens at `open`, brace-counted. */
function blockOf(css, open) {
  let depth = 1, k = open + 1;
  while (k < css.length && depth > 0) {
    if (css[k] === '{') depth++;
    else if (css[k] === '}') depth--;
    k++;
  }
  return css.slice(open + 1, k - 1);
}

/**
 * Comments out, and EVERY RULE CARRIES THE WIDTH IT APPLIES AT.
 *
 * This used to "step into @media" and flatten everything together, on the
 * reasoning that the rules inside still declare values. They do — for another
 * width. The artboards are per width (Dashboard.css is desktop, Mobile.css is
 * the phone) and `prop` takes the last declaration on a matching selector, so
 * a phone override was winning the comparison against a desktop artboard.
 *
 * It reported `.b-ledger` as drifting on background and border when the
 * desktop rule matches the artboard exactly: the values it printed came out of
 * `@media (max-width: 760px)`, where the panel deliberately becomes the cards
 * it holds and drops its own outline. Two of nine "drifted" and neither was
 * real. A gate that cries wolf is worse than no gate, and this one was mine.
 *
 * Skipping at-rules outright was the wrong repair — it made the MOBILE rules
 * compare against base declarations that the phone block overrides, so two
 * different false positives took their place. So the context is recorded and
 * `prop` models the cascade: desktop reads the base only, the phone reads the
 * base and then lets a narrow override win, which is what a browser does.
 */
function rules(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let i = 0;
  while (i < clean.length) {
    const open = clean.indexOf('{', i);
    if (open === -1) break;
    const head = clean.slice(i, open).trim();
    if (head.startsWith('@')) {
      /* Step in, but remember what we stepped into, so the rules inside are
         attributed to their width rather than to every width. */
      const inner = rules(blockOf(clean, open));
      for (const r of inner) out.push({ ...r, media: r.media ?? head });
      i = open + blockOf(clean, open).length + 2;
      continue;
    }
    let depth = 1, j = open + 1;
    while (j < clean.length && depth > 0) {
      if (clean[j] === '{') depth++;
      else if (clean[j] === '}') depth--;
      j++;
    }
    out.push({ sel: head.replace(/^[};\s]+/, ''), body: clean.slice(open + 1, j - 1), media: null });
    i = j;
  }
  return out;
}

/* Both vocabularies, so a comparison is of colours rather than of names: the
   artboards speak shadcn (--card, --secondary) and the app speaks its own
   (--deck, --void). */
const TOKENS = Object.fromEntries(
  ['design/demo-canvas/_ui.css', 'src/styles/global.css']
    .flatMap((f) => [...read(f).matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{3,8})/g)])
    .map((m) => [m[1], m[2].toUpperCase()]),
);
/* the app names the same colours differently; this is the whole mapping */
const ALIAS = { card: 'deck', secondary: 'deck2', muted: 'deck2', background: 'void', border: 'line2', input: 'line2' };
const resolve = (v) => v
  .replace(/var\(--([a-z0-9-]+)\)/g, (_, n) => TOKENS[n] || TOKENS[ALIAS[n]] || `var(--${n})`)
  .toUpperCase().replace(/\s+/g, ' ').trim();

/**
 * The value that wins AT ONE WIDTH: the last base declaration, then — on the
 * phone — the last narrow override, which is the order a browser applies.
 */
function prop(parsed, selector, name, width = 'desktop') {
  const declared = (r) => {
    const listed = r.sel.split(',').some((s) => s.trim() === selector);
    if (!listed) return null;
    const hit = [...r.body.matchAll(new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'g'))].pop();
    return hit ? hit[1].trim() : null;
  };
  /* A phone artboard is compared at 390, so only a max-width block counts as
     an override; a min-width one is a wider screen and must not. */
  const narrow = (m) => m !== null && /max-width/.test(m);
  let out = null;
  for (const r of parsed) {
    if (r.media !== null) continue;
    const v = declared(r);
    if (v !== null) out = v;
  }
  if (width === 'phone') {
    for (const r of parsed) {
      if (!narrow(r.media)) continue;
      const v = declared(r);
      if (v !== null) out = v;
    }
  }
  return out;
}

const IMPL = rules(read('src/styles/bento.css'));
const GLOBAL = rules(read('src/styles/global.css'));
const WHERE = { bento: IMPL, global: GLOBAL };
const ART = {
  mobile: rules(read('design/demo-canvas/parts/Mobile.css')),
  dash: rules(read('design/demo-canvas/parts/Dashboard.css')),
};

/* artboard, design selector, property, implementation selector, impl property */
const RULES = [
  ['mobile', '.card', 'background', '.b-card', 'background'],
  ['mobile', '.card', 'border', '.b-card', 'border'],
  ['mobile', '.fact', 'background', '.b-ledger .a-table td[data-col="Allowance"]', 'background'],
  /* the frame moved from the wrapper to the field itself, so the rule follows it */
  ['mobile', '.field', 'background', '.b-top .wfield', 'background'],
  ['mobile', '.field', 'border', '.b-top .wfield', 'border'],
  ['mobile', '.mark', 'background', '.b-ledger .a-table .mark', 'background'],
  ['dash', '.ledger', 'background', '.b-ledger', 'background'],
  ['dash', '.ledger', 'border', '.b-ledger', 'border'],
  /* the page ground is set once, on body, in the app's own stylesheet */
  ['dash', '.stage', 'background', 'body', 'background', 'global'],
];

let bad = 0, checked = 0;
for (const [art, ds, dp, is, ip, where = 'bento'] of RULES) {
  const want = prop(ART[art], ds, dp);
  if (want === null) { console.log(`?  ${art} artboard states no ${dp} on ${ds} — rule is stale`); continue; }
  checked++;
  /* The artboard names the width: Mobile.css is the phone, Dashboard.css is
     the desktop, so each comparison reads the value that wins at ITS width. */
  const got = prop(WHERE[where], is, ip, art === 'mobile' ? 'phone' : 'desktop');
  const a = resolve(want);
  const b = got === null ? '(absent)' : resolve(got);
  if (a !== b) { bad++; console.log(`DRIFT  ${is} { ${ip} }\n   ${art}/${ds}: ${a}\n   bento.css: ${b}`); }
}
console.log(bad === 0 ? `\nok: ${checked} design properties match` : `\n${bad} of ${checked} drifted`);
process.exit(bad ? 1 : 0);
