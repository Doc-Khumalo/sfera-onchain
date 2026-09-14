const STANDARDS = [
  'ERC-20', 'ERC-721', 'ERC-1155', 'ERC-165', 'EIP-712', 'ERC-2612',
  'Permit2', 'ERC-1271', 'ERC-6492', 'ERC-4337', 'EIP-7702', 'ERC-7715',
  'Base Spend Permissions', 'EIP-5792', 'ERC-7710', 'ERC-7895', 'EIP-8130',
  'ERC-8168',
];

/**
 * Every authority format the product has to read, running as a marquee.
 *
 * Deliberately standards rather than partner logos: no partnership is
 * committed, and implying one would be dishonest. This says the same thing
 * about depth without borrowing anyone's credibility.
 */
export default function Standards() {
  return (
    <section className="standards">
      <p className="strip-label">Authority formats we read</p>
      <div className="marquee" aria-hidden="true">
        <div className="track">
          {[0, 1].map((pass) => (
            <ul key={pass}>
              {STANDARDS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ))}
        </div>
      </div>
      <p className="sr-only">
        Authority formats: {STANDARDS.join(', ')}.
      </p>
    </section>
  );
}
