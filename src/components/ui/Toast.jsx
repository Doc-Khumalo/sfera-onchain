import { Toast } from 'radix-ui';

/**
 * Things that went wrong, beside the page rather than instead of it.
 *
 * A failed read used to replace the whole result: the console, the figures and
 * the table all disappeared and a notice stood in their place. That is the
 * wrong trade twice over. A reader who has seen this page once knows what it
 * holds, and a reader who has not learns nothing from an empty screen — and
 * either way, the parts that DID come back are still true and still worth
 * showing. Coverage that failed is a caveat on the reading, not a reason to
 * withhold it.
 *
 * So the page always renders, the figures read zero where there is nothing,
 * and what went wrong arrives here. Nothing is dismissed on the reader's
 * behalf: a toast carries its own reason, and the ones that matter carry the
 * action that would fix them.
 */
export function Toaster({ notes, onDismiss }) {
  return (
    <Toast.Provider swipeDirection="right" duration={9000}>
      {notes.map((n) => (
        <Toast.Root
          key={n.id}
          className={`toast toast-${n.tone || 'warn'}`}
          /* A failure that a reader can act on does not time out under them. */
          duration={n.action ? Infinity : 9000}
          onOpenChange={(open) => { if (!open) onDismiss(n.id); }}
        >
          <Toast.Title className="toast-title">{n.title}</Toast.Title>
          {n.body && <Toast.Description className="toast-body">{n.body}</Toast.Description>}

          <div className="toast-end">
            {n.action && (
              <Toast.Action asChild altText={n.action.label}>
                <button type="button" className="a-pill a-pill-go" onClick={n.action.run}>
                  {n.action.label}
                </button>
              </Toast.Action>
            )}
            <Toast.Close className="toast-close" aria-label="Dismiss">Dismiss</Toast.Close>
          </div>
        </Toast.Root>
      ))}
      <Toast.Viewport className="toast-viewport dash" />
    </Toast.Provider>
  );
}
