import { CONTACT } from '../../data/site.js';
import Receipt from '../Receipt.jsx';

/**
 * Marketing Plan §7.4 — the developer pitch.
 *
 * WHAT AN INTEGRATOR IS BUYING IS WHAT THEIR USERS SEE.
 *
 * This section used to be a sixteen-line JSON response. The argument for it
 * was that specificity is credibility, which is true, but it answered the
 * wrong question. Nobody reads a full payload on a landing page: they register
 * "there is an API" and move on, so the details worth being proud of — decimal
 * strings for a uint256, the enum that is not a risk score — were invisible to
 * everyone except a reader already in the docs. And it restated the four
 * claims below it in a drier form rather than adding anything.
 *
 * The replacement was a dark decision card built for this section — which was
 * a mistake of its own, and a more embarrassing one: the Access Receipt
 * already existed, already carried exactly this content (App request Unlimited
 * to 100 USDC, Reachable now 8,420 to 100, Access ends Never to On use), and
 * already animated the correction. Building a second, static, dark-mode
 * version of the company's signature artefact is worse than either using it or
 * leaving the section alone.
 *
 * So this is the Receipt. It is also literally the first of the four
 * capabilities listed underneath — "Access Receipt, rendered from a structured
 * decision" — so showing it is showing the claim rather than illustrating it,
 * and cream paper against a page of dark panels is the one moment of contrast
 * the site has.
 *
 * The one line underneath keeps the technical credibility a developer wants
 * without making a landing page do a reference's job.
 *
 * The four-item strip that used to sit below — Access Receipt, Exposure,
 * Comparison, Remediation — is gone. It named the same ground The method
 * covers in the next section, flatter and without the order that makes the
 * loop a loop, and nothing that reads as a glossary belongs directly under the
 * artefact it is trying to describe.
 */

export default function Developers() {
  return (
    <section className="dev reveal" id="developers">
      <div className="dev-top">
        <div className="col-type">
          <h2>One integration.</h2>
          <p className="lede">
            Explain authority, compare it with user intent and offer a safer
            permission across supported EVM standards - without building every
            decoder and control flow yourself.
          </p>

          {/* The honest version of a feature list: what you stop owning. */}
          <ul className="dev-not">
            <li>A decoder per standard, and per standard after that</li>
            <li>A state reader per chain, and its quirks</li>
            <li>The control flow around a correction that must not be signed by you</li>
          </ul>

          <a className="btn ghost" href={CONTACT} target="_blank" rel="noopener">
            Talk to us about an integration
          </a>
        </div>

        {/* What your user meets. The artefact itself, not a picture of it. */}
        <div className="dev-receipt">
          {/* No "Access Receipt" chip: the receipt prints its own header, and
              labelling it twice is the kind of thing that makes a page feel
              assembled rather than designed. */}
          <p className="dr-label"><em>what your users see</em></p>

          <Receipt />

          <p className="dr-foot">
            Rendered from four fields - <b>reading</b>, <b>reachableNow</b>,{' '}
            <b>because</b>, <b>remediable</b> - and a plan whose <b>signed</b> is
            always false.
          </p>
        </div>
      </div>

    </section>
  );
}
