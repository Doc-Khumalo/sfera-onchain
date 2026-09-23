/**
 * The adapter, against both /v1 shapes.
 *
 * WHY THIS EXISTS. /v1 changed shape in place, so for the length of the
 * cutover the same path answers in either shape depending on which deployment
 * is in front of it. A site that reads one of them is broken for the other,
 * and the failure is silent in the direction that matters: an allowance read
 * as a figure it never was, or a wallet that looks clear because the rows that
 * failed were never on the wire. So every field the page consumes is asserted
 * to come out of BOTH shapes as the same internal value.
 *
 * THE FIXTURES ARE REAL RESPONSES. `old-*` came from https://api.sferaonchain.xyz
 * and `new-*` from https://api-next.sferaonchain.xyz, captured on 2026-09-23
 * for 0x8ea5ad2a58c1dae75394b1e8636e6518eb6dac50 — the same address, the same
 * minute, the same routes, so a difference between them is a difference of
 * shape and not of chain state.
 *
 * The `derived-*` pair is built from those envelopes by hand, because this
 * wallet holds only unbounded permissions and the states that matter most are
 * the other ones: bounded, removed, expired, uncorrectable — and the row only
 * the new shape can express, a pair whose allowance() call reverted. Its
 * envelope, spenders, assets and vocabulary are the live ones; the readings
 * are composed.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  adaptChains, adaptScan, adaptPermission, adaptPlan, say, format,
} from '../src/lib/api.js';
import { exposure } from '../src/lib/exposure.js';
import { explain } from '../src/lib/readings.js';

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));

const OLD_CHAINS = fixture('old-chains');
const NEW_CHAINS = fixture('new-chains');
const OLD_BASE = fixture('old-permissions-base');
const NEW_BASE = fixture('new-permissions-base');
const OLD_EMPTY = fixture('old-permissions-ethereum-empty');
const NEW_EMPTY = fixture('new-permissions-ethereum-empty');
const OLD_STATES = fixture('derived-old-permissions-states');
const NEW_STATES = fixture('derived-new-permissions-states');
const OLD_REVOKE = fixture('old-remediation-revoke');
const NEW_REVOKE = fixture('new-remediation-revoke');
const OLD_LIMIT = fixture('old-remediation-limit-asked');
const NEW_LIMIT = fixture('new-remediation-limit-asked');

/* ---- the chain list ----------------------------------------------------- */

test('chains: both shapes produce the same internal list', () => {
  const o = adaptChains(OLD_CHAINS);
  const n = adaptChains(NEW_CHAINS);
  assert.equal(o.length, 15);
  assert.deepEqual(
    o.map((c) => [c.id, c.name, c.explorer, c.tokens, c.spenders]),
    n.map((c) => [c.id, c.name, c.explorer, c.tokens, c.spenders]),
  );
});

test('chains: `id` is what callers read, from `id` or from `chainId`', () => {
  assert.equal(adaptChains(OLD_CHAINS)[0].id, 1);
  assert.equal(adaptChains(NEW_CHAINS)[0].id, 1);
  /* Both spellings survive, so a caller reading either is right. */
  assert.equal(adaptChains(OLD_CHAINS)[0].chainId, 1);
  assert.equal(adaptChains(NEW_CHAINS)[0].chainId, 1);
});

/* ---- the scan envelope -------------------------------------------------- */

const envelope = (s) => [s.id, s.chainId, s.chain, s.explorer, s.holder, s.checked];
const cover = (s) => [s.coverage.tokens, s.coverage.spenders, s.coverage.notCovered.length];

test('permissions: the envelope reads the same out of both shapes', () => {
  assert.deepEqual(envelope(adaptScan(OLD_BASE)), envelope(adaptScan(NEW_BASE)));
  assert.deepEqual(cover(adaptScan(OLD_BASE)), cover(adaptScan(NEW_BASE)));
  assert.deepEqual(envelope(adaptScan(OLD_EMPTY)), envelope(adaptScan(NEW_EMPTY)));
});

/* Every field on a row that any of the six components reads. Wire spellings
   are not in this list — the components never see them. */
const row = (p) => ({
  id: p.id,
  beneficiary: p.beneficiary,
  label: p.label,
  asset: p.asset,
  symbol: p.symbol,
  decimals: p.decimals,
  standard: p.standard,
  granted: p.granted,
  grantedKey: p.grantedKey,
  held: p.held,
  reachableNow: p.reachableNow,
  futureExposed: p.futureExposed,
  reading: p.reading,
  attention: p.attention,
  remediable: p.remediable,
  unreadable: p.unreadable,
  because: p.because,
});

test('permissions: every row field is identical across shapes (live capture)', () => {
  const o = adaptScan(OLD_BASE).permissions;
  const n = adaptScan(NEW_BASE).permissions;
  assert.equal(o.length, 3);
  assert.equal(n.length, 3);
  /* Paired by id rather than by position. The two engines return the same
     three rows in different orders — the new one ranks them by what they
     reach — and the order a table shows rows in is the engine's to decide,
     not a field whose value has to survive the crossing. */
  const paired = Object.fromEntries(n.map((p) => [p.id, p]));
  assert.deepEqual(new Set(o.map((p) => p.id)), new Set(Object.keys(paired)));
  for (const p of o) assert.deepEqual(row(p), row(paired[p.id]));
});

test('permissions: every row field is identical across shapes (every reading)', () => {
  const o = adaptScan(OLD_STATES).permissions;
  const n = adaptScan(NEW_STATES).permissions;
  assert.equal(o.length, 5);
  /* The sixth new-shape row is the one the old wire cannot carry at all. */
  assert.equal(n.length, 6);
  for (let i = 0; i < o.length; i += 1) assert.deepEqual(row(o[i]), row(n[i]));
});

/* ---- a field at a time -------------------------------------------------- */

const byId = (scan) => Object.fromEntries(adaptScan(scan).permissions.map((p) => [p.symbol, p]));

test('granted: UNBOUNDED out of both shapes, and never a figure in either', () => {
  const o = byId(OLD_STATES).USDC;
  const n = byId(NEW_STATES).USDC;
  assert.deepEqual(o.granted, { kind: 'UNBOUNDED', amount: null });
  assert.deepEqual(n.granted, o.granted);
  /* The old wire said the word "Unlimited" in the amount field. It does not
     survive as text, and it certainly does not become 2^256-1. */
  assert.equal(o.granted.amount, null);
  assert.equal(say(o.granted, o.decimals, o.symbol), 'Unlimited');
  assert.equal(say(n.granted, n.decimals, n.symbol), 'Unlimited');
});

test('granted: FINITE keeps its exact base units, uint256-wide', () => {
  const o = byId(OLD_STATES).DEGEN;
  const n = byId(NEW_STATES).DEGEN;
  assert.deepEqual(o.granted, { kind: 'FINITE', amount: '9000000000000000000000' });
  assert.deepEqual(n.granted, o.granted);
  assert.equal(say(o.granted, 18, 'DEGEN'), say(n.granted, 18, 'DEGEN'));
});

test('granted: NONE is zero, out of the old wire\'s bare "0" too', () => {
  const o = byId(OLD_STATES).USDT;
  const n = byId(NEW_STATES).USDT;
  assert.equal(o.granted.kind, 'NONE');
  assert.equal(n.granted.kind, 'NONE');
  assert.equal(say(o.granted, 6, 'USDT'), 'None');
});

test('granted: an unparseable amount with no `unbounded` flag becomes UNKNOWN, never nought', () => {
  /* The old wire's worst case: "Unlimited" in the amount and the boolean
     missing. Read as a number it is nothing, and reading an unlimited
     allowance as an empty one is the defect this product exists to prevent. */
  const p = adaptPermission({ id: 'x', granted: 'Unlimited', readable: true });
  assert.equal(p.granted.kind, 'UNKNOWN');
  assert.equal(p.granted.amount, null);
  assert.equal(say(p.granted), 'Not established');
});

test('grantedKey: a value that compares by value, equal across shapes', () => {
  const o = adaptScan(OLD_STATES).permissions;
  const n = adaptScan(NEW_STATES).permissions;
  assert.deepEqual(o.map((p) => p.grantedKey), n.slice(0, 5).map((p) => p.grantedKey));
  assert.equal(byId(OLD_STATES).USDC.grantedKey, 'UNBOUNDED');
  assert.equal(byId(OLD_STATES).WETH.grantedKey, 'FINITE:1500000000000000000');
  /* The row the old shape cannot carry keys as UNKNOWN, not as a figure. */
  assert.equal(n[5].grantedKey, 'UNKNOWN');
});

test('held and reachableNow: decimal strings or null, identical across shapes', () => {
  const o = byId(OLD_BASE);
  const n = byId(NEW_BASE);
  for (const s of ['USDC', 'WETH', 'USDT']) {
    assert.equal(typeof o[s].held, 'string');
    assert.equal(o[s].held, n[s].held);
    assert.equal(o[s].reachableNow, n[s].reachableNow);
    assert.equal(format(o[s].held, o[s].decimals, s), format(n[s].held, n[s].decimals, s));
  }
});

test('held and reachableNow: NONE is "0" and formats as a figure in both', () => {
  const o = byId(OLD_STATES).USDT;
  const n = byId(NEW_STATES).USDT;
  assert.equal(o.reachableNow, '0');
  assert.equal(n.reachableNow, '0');
  assert.equal(format(o.reachableNow, 6, 'USDT'), format(n.reachableNow, 6, 'USDT'));
});

test('reading, attention, remediable and futureExposed pass through unchanged', () => {
  const o = adaptScan(OLD_STATES).permissions;
  const n = adaptScan(NEW_STATES).permissions;
  assert.deepEqual(
    o.map((p) => [p.reading, p.attention, p.remediable, p.futureExposed]),
    n.slice(0, 5).map((p) => [p.reading, p.attention, p.remediable, p.futureExposed]),
  );
});

test('actions: the two shapes agree on what each row offers and refuses', () => {
  const o = adaptScan(OLD_STATES).permissions;
  const n = adaptScan(NEW_STATES).permissions;
  const remove = (p) => (p.actions ?? []).find((a) => a.kind === 'REMOVE');
  for (let i = 0; i < o.length; i += 1) {
    assert.equal(remove(o[i]).available, remove(n[i]).available, `row ${i} availability`);
    assert.equal(remove(o[i]).primary, remove(n[i]).primary, `row ${i} recommendation`);
    /* A refused control always carries a reason, whichever engine answered. */
    if (!remove(o[i]).available) assert.ok(remove(o[i]).unavailable);
  }
});

test('actions: the old shape never offers a limit it cannot build', () => {
  /* That engine answers every call with a removal whatever is asked of it, so
     a Limit control on the row would be refused after the click. */
  for (const p of adaptScan(OLD_STATES).permissions) {
    assert.equal((p.actions ?? []).some((a) => a.kind === 'LIMIT'), false);
  }
  assert.ok(adaptScan(NEW_BASE).permissions[0].actions.some((a) => a.kind === 'LIMIT'));
});

test('expiry: stated by the new shape, and not invented for the old one', () => {
  const n = byId(NEW_STATES).cbBTC;
  const o = byId(OLD_STATES).cbBTC;
  assert.equal(n.endsSay, 'expired on 4 January 2026');
  assert.deepEqual(n.ends, { kind: 'AT', at: '2026-01-04T00:00:00Z' });
  /* The old wire has no expiry field. The date is not mined out of the
     reasons prose, so the sheet says "Not established" rather than a date
     nobody sent. The engine's own EXPIRED reading is believed. */
  assert.equal(o.endsSay, undefined);
  assert.equal(o.ends, undefined);
  assert.equal(o.expired, true);
  assert.equal(n.expired, true);
});

/* ---- the row that did not answer ---------------------------------------- */

test('an unreadable row from the new shape never renders as a figure', () => {
  const p = adaptScan(NEW_STATES).permissions[5];
  assert.equal(p.unreadable, 'CALL_REVERTED');

  /* Not a number anywhere a screen could print one. */
  assert.equal(p.granted.kind, 'UNKNOWN');
  assert.equal(p.granted.amount, null);
  assert.equal(p.held, null);
  assert.equal(p.reachableNow, null);

  /* Every formatter the components put it through says so in words. */
  assert.equal(say(p.granted, p.decimals, p.symbol), 'Not established');
  assert.equal(format(p.held, p.decimals, p.symbol), 'Not established');
  assert.equal(format(p.reachableNow, p.decimals, p.symbol), 'Not established');

  /* And it is the branch the table takes before it formats anything: the
     allowance cell reads `p.unreadable` first and prints "Did not answer". */
  assert.ok(p.unreadable);

  /* It is counted as exposure that was not established, not as none. */
  const ex = exposure(adaptScan(NEW_STATES).permissions);
  assert.equal(ex.unread, 1);
});

test('an unreadable row is never filtered out of the list', () => {
  assert.equal(adaptScan(NEW_STATES).permissions.length, NEW_STATES.permissions.length);
  assert.ok(adaptScan(NEW_STATES).permissions.some((p) => p.unreadable));
});

test('the old shape says a row did not answer without naming a cause', () => {
  /* The pairs that failed are dropped by that engine, so this is the
     defensive case: a proxy or an older deployment that does send the row. */
  const p = adaptPermission({
    id: 'x', symbol: 'ezETH', decimals: 18, readable: false,
    granted: null, held: null, reachableNow: null, remediable: false,
  });
  assert.ok(p.unreadable);
  assert.equal(p.unreadable, 'NOT_STATED');
  assert.equal(p.granted.kind, 'UNKNOWN');
  assert.equal(p.held, null);
  assert.equal(p.reachableNow, null);
  assert.equal(p.actions[0].available, false);
});

/* ---- what the old shape drops in silence -------------------------------- */

test('nothing is invented to stand in for a row the old wire never sent', () => {
  const s = adaptScan(OLD_BASE);
  assert.equal(s.permissions.length, OLD_BASE.permissions.length);
  assert.equal(s.permissions.some((p) => p.unreadable), false);
});

test('completeness: the new shape states it, the old one cannot', () => {
  const n = adaptScan(NEW_STATES);
  assert.equal(n.readStated, true);
  assert.equal(n.coverage.notAnswered, 1);
  assert.equal(n.coverage.partial, true);

  const o = adaptScan(OLD_BASE);
  assert.equal(o.readStated, false);
  /* NOT zero. Zero is an engine saying every pair answered, which is exactly
     the claim this wire cannot make. */
  assert.equal(o.coverage.notAnswered, null);
  assert.equal(o.coverage.partial, null);
});

test('completeness: a read with no pairs at all still says which it was', () => {
  assert.equal(adaptScan(NEW_EMPTY).readStated, true);
  assert.equal(adaptScan(NEW_EMPTY).coverage.notAnswered, 0);
  assert.equal(adaptScan(OLD_EMPTY).readStated, false);
  assert.equal(adaptScan(OLD_EMPTY).coverage.notAnswered, null);
});

test('an unstated read cannot come out as "reaches nothing"', () => {
  /* Both wallets read clean: every permission removed, nothing reachable,
     nothing to see to. Only the engine that accounts for the pairs it could
     not read can support the mint that follows from it. */
  const clean = (scan, mut) => adaptScan({ ...scan, permissions: scan.permissions.map(mut) });

  const n = clean(NEW_STATES, (p) => ({
    ...p, granted: { kind: 'NONE', amount: null },
    held: { kind: 'NONE', amount: null }, reachableNow: { kind: 'NONE', amount: null },
    reading: 'REMOVED', attention: false, unreadable: null, futureExposed: false,
  }));
  assert.equal(exposure(n.permissions).reachesNothing, true);

  const o = clean(OLD_STATES, (p) => ({
    ...p, granted: '0', unbounded: false, held: '0', reachableNow: '0',
    reading: 'REMOVED', attention: false, futureExposed: false,
  }));
  /* Same readings, same figures, same zero — and it is not an all-clear,
     because a pair that failed on that engine is absent rather than unread. */
  assert.equal(exposure(o.permissions).reachesNothing, false);
  assert.equal(exposure(o.permissions).cents, 0n);
  assert.equal(exposure(o.permissions).attention, 0);
});

/* ---- the correction ----------------------------------------------------- */

test('remediation: a revoke reads the same out of both shapes', () => {
  const o = adaptPlan(OLD_REVOKE);
  const n = adaptPlan(NEW_REVOKE);
  assert.equal(o.action, 'REVOKE');
  assert.equal(n.action, 'REVOKE');
  assert.equal(o.to, n.to);
  assert.equal(o.data, n.data);
  assert.equal(o.decodesTo, n.decodesTo);
  assert.equal(o.stepsRemaining, 1);
  assert.equal(n.stepsRemaining, 1);
  assert.ok(o.step);
});

test('remediation: what the chain should read after is taken from the calldata', () => {
  /* Not from the action name. approve(spender, n) says n in its last word,
     and that word is checkable against the same bytes the screen prints. */
  const o = adaptPlan(OLD_REVOKE);
  assert.deepEqual(o.expectedAfter, { kind: 'NONE', amount: null });

  const set = adaptPlan({
    action: 'LIMIT',
    to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    data: '0x095ea7b3000000000000000000000000000000000022d473030f116ddee9f6b43ac78ba3'
        + '00000000000000000000000000000000000000000000000000000000000f4240',
    value: '0x0',
  });
  assert.deepEqual(set.expectedAfter, { kind: 'FINITE', amount: '1000000' });
});

test('remediation: calldata that is not a plain approve gets no expectation', () => {
  /* A step with no verifiable expectation withholds the read-back's tick
     rather than granting one against a figure nobody produced. */
  const p = adaptPlan({ action: 'REVOKE', to: '0xabc', data: '0xdeadbeef', value: '0x0' });
  assert.equal(p.expectedAfter, null);
});

test('remediation: the old engine answers a limit with a removal, and says so', () => {
  /* The handoff compares what came back against what was asked for and
     refuses to hand over a removal that was requested as a boundary. That
     check is why the control could exist before the engine could answer it. */
  assert.equal(adaptPlan(OLD_LIMIT).action, 'REVOKE');
  assert.equal(adaptPlan(NEW_LIMIT).action, 'LIMIT');
});

test('remediation: a multi-step plan hands over one step and says what remains', () => {
  const n = adaptPlan(NEW_LIMIT);
  assert.equal(n.stepsTotal, 2);
  assert.equal(n.stepsRemaining, 2);
  assert.equal(n.step.order, 1);
  assert.deepEqual(n.expectedAfter, { kind: 'FINITE', amount: '0' });
  /* The old shape is one step because that engine builds one. */
  assert.equal(adaptPlan(OLD_REVOKE).stepsTotal, 1);
});

test('remediation: the value is handed over as the engine spelled it', () => {
  assert.equal(adaptPlan(OLD_REVOKE).value, '0x0');
  assert.equal(adaptPlan(NEW_REVOKE).value, '0');
});

/* ---- the error envelope ------------------------------------------------- */

test('errors: both spellings of an unsupported chain read as one sentence', () => {
  /* The old body was flat with CHAIN_UNSUPPORTED; the new one nests
     UNSUPPORTED_CHAIN under `error`. A code that falls through reads as
     "something went wrong", which is how a refusal starts looking like a
     fault. */
  const sentence = 'This ledger does not read that chain, and will not guess at it.';
  assert.equal(explain({ code: 'CHAIN_UNSUPPORTED' }), sentence);
  assert.equal(explain({ code: 'UNSUPPORTED_CHAIN' }), sentence);
});
