export const WITHDRAWALS_SUSPENDED_MESSAGE =
  'Withdrawals are currently suspended on your account';

export type WithdrawalMethod = 'crypto' | 'wire_transfer' | 'merchant_pay';

interface WithdrawalUser {
  balance: string | null;
  withdrawalSuspended: boolean;
}

interface WithdrawalRequest {
  userId: string;
  amount: string;
  withdrawMethod: WithdrawalMethod;
  destinationAddress: string;
  status: 'pending';
  metadata?: any;
}

export interface WithdrawalDependencies<TWithdrawal> {
  getUser(userId: string): Promise<WithdrawalUser | undefined>;
  deductBalance(userId: string, amount: string): Promise<void>;
  createWithdrawal(request: WithdrawalRequest): Promise<TWithdrawal>;
}

export async function processWithdrawalRequest<TWithdrawal>(
  dependencies: WithdrawalDependencies<TWithdrawal>,
  userId: string,
  amount: string,
  withdrawMethod: WithdrawalMethod,
  destinationAddress: string,
  metadata?: any,
): Promise<TWithdrawal> {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 1_000_000) {
    throw new Error('Invalid withdrawal amount. Must be between $0.01 and $1,000,000');
  }

  const user = await dependencies.getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }
  if (user.withdrawalSuspended) {
    throw new Error(WITHDRAWALS_SUSPENDED_MESSAGE);
  }

  const userBalance = Number(user.balance || '0');
  if (userBalance < numericAmount) {
    throw new Error('Insufficient balance');
  }

  await dependencies.deductBalance(userId, amount);
  return dependencies.createWithdrawal({
    userId,
    amount,
    withdrawMethod,
    destinationAddress,
    status: 'pending',
    metadata,
  });
}