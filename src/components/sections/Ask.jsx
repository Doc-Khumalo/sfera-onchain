import { CONTACT } from '../../data/site.js';

export default function Ask() {
  return (
    <section className="ask reveal">
      <h2>Build it with us.</h2>
      <p className="lede">
        If your users are granting standing authority and you would rather they
        understood it, we want to build the first integration with you.
      </p>
      <a className="btn" href={CONTACT} target="_blank" rel="noopener">
        Get in touch
      </a>
    </section>
  );
}
