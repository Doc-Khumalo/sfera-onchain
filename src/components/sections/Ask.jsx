import { CONTACT, BOOKING } from '../../data/site.js';

/**
 * The close. Two things a reader might want and one they might offer.
 *
 * The email form is plain HTML posting to our own endpoint. No third party
 * script, no tracking pixel, no embedded widget. DEPLOYMENT.md forbids that on
 * a signing surface and there is no reason to hold the company page to a lower
 * standard than the product page.
 *
 * What we ask for is an address and nothing else. A form that also wanted a
 * name, a company and a role would collect more and convert worse, and we have
 * nothing to do with any of it yet.
 */
export default function Ask() {
  return (
    <section className="ask reveal" id="ask">
      <h2>Build it with us.</h2>
      <p className="lede">
        If your users are granting standing authority and you would rather they
        understood it, we want to build the first integration with you.
      </p>

      <div className="ask-grid">
        <div className="ask-card">
          <h3>Talk to us</h3>
          <p className="ask-body">
            Thirty minutes with the people building it. No deck unless you want
            one.
          </p>
          {BOOKING ? (
            <a className="btn" href={BOOKING} target="_blank" rel="noopener">
              Book a call
            </a>
          ) : (
            <a className="btn" href={CONTACT} target="_blank" rel="noopener">
              Get in touch
            </a>
          )}
        </div>

        <div className="ask-card">
          <h3>Follow the build</h3>
          <p className="ask-body">
            We are pre-release. Leave an address and we will write when there is
            something real to show, which will not be often.
          </p>

          {/* Posts to our own endpoint. Works without JavaScript. */}
          <form className="sub" method="POST" action="/api/subscribe">
            <label htmlFor="email" className="sr-only">Email address</label>
            <div className="sub-row">
              <input
                id="email"
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                aria-describedby="sub-note"
              />
              <button type="submit" className="btn">Keep me posted</button>
            </div>
            <p id="sub-note" className="sub-note">
              One address, nothing else. No tracking on this page, and we will
              not pass it on.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
