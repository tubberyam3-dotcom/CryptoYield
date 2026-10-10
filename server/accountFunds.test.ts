import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allocateAccountDebit, requireWithdrawalXpCode } from './accountFunds';

const members = [
  { id: 'primary', balance: '100.00000000' },
  { id: 'partner', balance: '250.00000000' },
];

test('either joint member can spend more than their individual balance', () => {
  assert.deepEqual(allocateAccountDebit(members, 'primary', '300'), [
    { id: 'primary', balance: '0.00000000' },
    { id: 'partner', balance: '50.00000000' },
  ]);
  assert.deepEqual(allocateAccountDebit(members, 'partner', '300'), [
    { id: 'partner', balance: '0.00000000' },
    { id: 'primary', balance: '50.00000000' },
  ]);
});

test('combined balance cannot be spent twice after a prior debit', () => {
  const changes = allocateAccountDebit(members, 'primary', '300');
  const updated = members.map(member => changes.find(change => change.id === member.id) || member);
  assert.throws(() => allocateAccountDebit(updated, 'partner', '51'), /Insufficient balance/);
  assert.deepEqual(allocateAccountDebit(updated, 'partner', '50'), [
    { id: 'partner', balance: '0.00000000' },
  ]);
});

test('shared debits preserve eight decimal precision', () => {
  assert.deepEqual(allocateAccountDebit([
    { id: 'primary', balance: '0.00000003' },
    { id: 'partner', balance: '0.00000007' },
  ], 'primary', '0.00000009'), [
    { id: 'primary', balance: '0.00000000' },
    { id: 'partner', balance: '0.00000001' },
  ]);
});

test('invalid or excessive amounts never change the provided balances', () => {
  for (const amount of ['0', '-1', 'NaN', 'Infinity', '351', '0.000000001']) {
    assert.throws(() => allocateAccountDebit(members, 'primary', amount));
  }
  assert.equal(members[0].balance, '100.00000000');
});

test('joint withdrawals require the initiating member XP code on every request', () => {
  const savedCode = 'TESTXP12345';
  for (const suppliedCode of [undefined, '', 'WRONGXP1234']) {
    assert.throws(() => requireWithdrawalXpCode(true, savedCode, suppliedCode), /valid XP code/);
  }
  requireWithdrawalXpCode(true, savedCode, ' testxp12345 ');
  // Authorization does not carry over to the next request.
  assert.throws(() => requireWithdrawalXpCode(true, savedCode), /valid XP code/);
  assert.throws(() => requireWithdrawalXpCode(true, null, savedCode), /Generate your XP code/);
});

test('personal account withdrawals do not require XP codes', () => {
  requireWithdrawalXpCode(false, null);
  assert.deepEqual(allocateAccountDebit([members[0]], 'primary', '75'), [
    { id: 'primary', balance: '25.00000000' },
  ]);
});
