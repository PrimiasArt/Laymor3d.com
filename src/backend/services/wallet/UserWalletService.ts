import { userRepository } from '../../repositories/UserRepository';

class UserWalletService {
  private unlockedProfiles = new Set<string>(['benchy']);

  getBalance(): number {
    return userRepository.getActiveUser().walletBalanceVnd;
  }

  getUnlockedProfiles(): string[] {
    return Array.from(this.unlockedProfiles);
  }

  topUp(amount: number): number {
    const active = userRepository.getActiveUser();
    return userRepository.updateBalance(active.id, amount);
  }

  hasUnlocked(modelId: string): boolean {
    return this.unlockedProfiles.has(modelId);
  }

  unlock(modelId: string, cost = 1000): { success: boolean; error?: string } {
    if (this.unlockedProfiles.has(modelId)) {
      return { success: true };
    }
    const active = userRepository.getActiveUser();
    if (active.walletBalanceVnd < cost) {
      return { success: false, error: 'Số dư ví không đủ' };
    }
    userRepository.updateBalance(active.id, -cost);
    this.unlockedProfiles.add(modelId);
    return { success: true };
  }

  lock(modelId: string, refund = 1000): void {
    if (this.unlockedProfiles.has(modelId)) {
      this.unlockedProfiles.delete(modelId);
      const active = userRepository.getActiveUser();
      userRepository.updateBalance(active.id, refund);
    }
  }

  deduct(amount: number, reason?: string): { success: boolean; newBalance: number; error?: string } {
    const active = userRepository.getActiveUser();
    if (active.walletBalanceVnd < amount) {
      return { success: false, newBalance: active.walletBalanceVnd, error: 'Số dư ví không đủ' };
    }
    const newBal = userRepository.updateBalance(active.id, -amount);
    if (reason) {
      userRepository.addTransaction({
        userId: active.id,
        amountVnd: amount,
        method: 'wallet',
        type: 'withdraw',
        status: 'completed',
        description: reason,
      });
    }
    return { success: true, newBalance: newBal };
  }

  deposit(amount: number, reason?: string): number {
    const active = userRepository.getActiveUser();
    const newBal = userRepository.updateBalance(active.id, amount);
    if (reason) {
      userRepository.addTransaction({
        userId: active.id,
        amountVnd: amount,
        method: 'wallet',
        type: 'deposit',
        status: 'completed',
        description: reason,
      });
    }
    return newBal;
  }
}

export const userWalletService = new UserWalletService();
