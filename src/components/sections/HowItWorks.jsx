import { LOOP } from '../../data/site.js';

/**
 * The loop, as a sequence rather than a list.
 *
 * This was a definition list: five rows of term and description, which is
 * how you set a glossary and not how you show a process. The five beats are
 * ordered and each one depends on the one before it, so they are numbered,
 * connected, and given a mark that says what happens at that step.
 *
 * UX Specification §2 — Understand, Compare, Limit, Sign, Verify.
 *
 * Icons are drawn here as stroked SVG on a 24px grid rather than pulled from
 * a set, so they share a weight with the rules and hairlines around them and
 * recolour with the text. None of them is decorative: each draws the thing
 * its step actually does.
 */
const MARKS = {
  Understand: (
    <>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  Compare: (
    <>
      <path d="M5 7h6M5 12h14M5 17h9" />
      <path d="M17 5v4M20 7h-6" opacity="0.45" />
    </>
  ),
  Limit: (
    <>
      <path d="M8 4v12a4 4 0 0 0 4 4h4" />
      <path d="M4 8h12a4 4 0 0 1 4 4v4" opacity="0.45" />
    </>
  ),
  Sign: (
    <>
      <path d="M4 18c3-1 4-9 7-9s2 7 5 7 4-2 4-2" />
      <path d="M3 21h18" opacity="0.45" />
    </>
  ),
  Verify: (
    <>
      <path d="M4 13l5 5L20 7" />
    </>
  ),
};

export default function HowItWorks() {
  return (
    <section className="how reveal" id="how">
      <h2>The method</h2>
      <p className="lede">
        Five beats, in order. Each one needs the answer from the one before it.
      </p>

      <ol className="loop">
        {LOOP.map(({ step, title, body }, i) => (
          <li className="loop-step" key={step}>
            <span className="ls-rail" aria-hidden="true" />

            <span className="ls-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                {MARKS[step]}
              </svg>
            </span>

            <span className="ls-n">{String(i + 1).padStart(2, '0')}</span>
            <h3>{step}</h3>
            <p className="ls-q">{title}</p>
            <p className="ls-body">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
