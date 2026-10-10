import { timingSafeEqual } from 'node:crypto';

const SCALE = BigInt(100000000);

function units(value: string): bigint {
  if (!/^\d+(\.\d{1,8})?$/.test(value)) throw new Error('Invalid balance or amount');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(8, '0'));
}

function decimal(value: bigint): string {
  return `${value / SCALE}.${(value % SCALE).toString().padStart(8, '0')}`;
}

// Spend the initiating member's funds first, then the other members' funds.
// Called only while all member rows are locked in a database transaction.
export function allocateAccountDebit(
  members: { id: string; balance: string | null }[],
  userId: string,
  amount: string,
): { id: string; balance: string }[] {
  let remaining = units(amount);
  if (remaining <= BigInt(0)) throw new Error('Invalid amount');
  const ordered = [...members].sort((a, b) =>
    a.id === userId ? -1 : b.id === userId ? 1 : a.id.localeCompare(b.id));
  const total = ordered.reduce((sum, member) => sum + units(member.balance || '0'), BigInt(0));
  if (total < remaining) throw new Error('Insufficient balance');
  const changes = [];
  for (const member of ordered) {
    if (remaining === BigInt(0)) break;
    const balance = units(member.balance || '0');
    const debit = balance < remaining ? balance : remaining;
    if (debit > BigInt(0)) changes.push({ id: member.id, balance: decimal(balance - debit) });
    remaining -= debit;
  }
  return changes;
}

export function requireWithdrawalXpCode(
  isJoint: boolean,
  savedCode: string | null,
  suppliedCode?: string,
): void {
  if (!isJoint) return;
  if (!savedCode) throw new Error('Generate your XP code in account settings before withdrawing from a joint account');
  const supplied = Buffer.from(typeof suppliedCode === 'string' ? suppliedCode.trim().toUpperCase() : '');
  const expected = Buffer.from(savedCode);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new Error('A valid XP code is required for every joint account withdrawal');
  }
}
