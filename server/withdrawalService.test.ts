import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  processWithdrawalRequest,
  WITHDRAWALS_SUSPENDED_MESSAGE,
  type WithdrawalMethod,
} from './withdrawalService';

const methods: WithdrawalMethod[] = ['crypto', 'wire_transfer', 'merchant_pay'];

describe('withdrawal suspension', () => {
  for (const withdrawMethod of methods) {
    it(`blocks ${withdrawMethod} without changing balance or creating a record`, async () => {
      let balance = '250.00';
      const withdrawals: object[] = [];

      await assert.rejects(
        processWithdrawalRequest(
          {
            getUser: async () => ({ balance, withdrawalSuspended: true }),
            deductBalance: async (_userId, amount) => {
              balance = (Number(balance) - Number(amount)).toFixed(2);
            },
            createWithdrawal: async request => {
              withdrawals.push(request);
              return request;
            },
          },
          'suspended-user',
          '25.00',
          withdrawMethod,
          'test-destination',
        ),
        new Error(WITHDRAWALS_SUSPENDED_MESSAGE),
      );

      assert.equal(balance, '250.00');
      assert.equal(withdrawals.length, 0);
    });
  }

  it('allows withdrawal requests again after access is restored', async () => {
    let balance = '250.00';
    let withdrawalSuspended = true;
    const withdrawals: object[] = [];
    const dependencies = {
      getUser: async () => ({ balance, withdrawalSuspended }),
      deductBalance: async (_userId: string, amount: string) => {
        balance = (Number(balance) - Number(amount)).toFixed(2);
      },
      createWithdrawal: async (request: object) => {
        withdrawals.push(request);
        return request;
      },
    };

    await assert.rejects(
      processWithdrawalRequest(
        dependencies,
        'restored-user',
        '25.00',
        'crypto',
        'test-destination',
      ),
      new Error(WITHDRAWALS_SUSPENDED_MESSAGE),
    );

    withdrawalSuspended = false;
    const withdrawal = await processWithdrawalRequest(
      dependencies,
      'restored-user',
      '25.00',
      'crypto',
      'test-destination',
    );

    assert.equal(balance, '225.00');
    assert.equal(withdrawals.length, 1);
    assert.deepEqual(withdrawal, withdrawals[0]);
  });
});