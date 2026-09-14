import LedgerPanel from '../LedgerPanel.jsx';
import ChainStack from '../ChainStack.jsx';

/**
 * The ledger, working.
 *
 * This section used to be two static panels arguing that a wallet prompt hides
 * what it grants. The argument was right and the evidence was a picture. It is
 * now the real ledger, running the correction it exists to perform: three live
 * permissions found, then each one revoked in turn, then the loop begins again.
 *
 * PURE CSS, NO JAVASCRIPT. The homepage ships none and that property is worth
 * more than any animation, so the whole sequence is keyframes and per-row
 * delays. It cannot break, it costs nothing, and it runs before any script
 * would have loaded.
 *
 * The motion is the same three beats the product uses when a real permission
 * is removed: the value is struck by a line that travels, the new value rises
 * underneath, the row settles. A person watching this has already seen the
 * thing they will do later.
 */
const ROWS = [
  { app: 'Permit2', token: 'USDC', colour: '#2775CA', amount: '21,339.49' },
  { app: 'Permit2', token: 'WETH', colour: '#627EEA', amount: '2.4816' },
  { app: 'Uniswap', token: 'USDT', colour: '#26A17B', amount: '7,204.00' },
];

export default function Demonstration() {
  return (
    <section className="problem reveal field" id="problem">
      <h2>Found, then gone.</h2>
      <p className="lede">
        This is the ledger, reading a wallet and removing what it finds. Nothing
        is simulated except the wallet signature.
      </p>

      {/* The one table on the page. It used to sit in the hero alongside a
          second one here, which meant the site showed the same object twice
          and the receipt, the more distinctive of the two, appeared nowhere.
          The receipt is now the hero and this is its only table. */}
      <LedgerPanel chainStack={<ChainStack total={15} label="chains" compact />} />

      <p className="demo-foot">
        Each correction is an unsigned transaction handed to your own wallet.
        We never sign, and we never hold a key.
      </p>
    </section>
  );
}
