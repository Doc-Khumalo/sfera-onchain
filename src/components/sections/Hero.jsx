import HeroPanel from '../HeroPanel.jsx';
import ChainStack from '../ChainStack.jsx';

/**
 * The hook, not the pitch.
 *
 * The previous hero described the product, which requires a reader to already
 * believe they have a problem. Nobody arrives believing that. So this asks a
 * question they cannot answer about their own wallet, and then offers to
 * answer it in the same breath.
 *
 * The input is the whole idea. The strongest thing this company owns is a page
 * that reads a real wallet and finds authority the owner forgot granting, and
 * burying that behind a nav link wastes it. Show first, explain second.
 *
 * It is a plain form with a GET action, so it works before any JavaScript
 * loads and keeps working if none ever does.
 */
export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-type">
        <h1>
You already said yes.
        </h1>

        <p className="lede">
          Every <em>Approve</em> you have ever tapped may still be live. Reusable,
          unlimited, and with no expiry date. Most people have never seen the
          list.
        </p>

        <form className="probe" method="GET" action="/demo">
          <label htmlFor="hero-addr">See what a wallet can still lose</label>
          <div className="probe-row">
            <input
              id="hero-addr"
              name="address"
              placeholder="Paste any wallet address"
              spellCheck="false"
              autoComplete="off"
              aria-describedby="probe-note"
            />
            <button type="submit" className="btn">Read it</button>
          </div>
          <p id="probe-note" className="probe-note">
            Read-only, and no wallet needed. Nothing is signed, stored, or sent
            anywhere.
          </p>

          <ChainStack total={15} label="chains read the same way" />
        </form>
      </div>

      <div className="hero-art">
        <HeroPanel />
      </div>
    </section>
  );
}
