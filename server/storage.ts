import {
  users,
  portfolios,
  userPortfolios,
  bondProducts,
  userBonds,
  stockProducts,
  userStocks,
  communityChallenges,
  challengeMembers,
  jointAccounts,
  userJointAccounts,
  dailyBonuses,
  coupons,
  couponRedemptions,
  xpClaims,
  systemSettings,
  deposits,
  withdrawals,
  loginHistory,
  scheduledEmails,
  type User,
  type UpsertUser,
  type Portfolio,
  type InsertPortfolio,
  type UserPortfolio,
  type InsertUserPortfolio,
  type BondProduct,
  type InsertBondProduct,
  type UserBond,
  type InsertUserBond,
  type StockProduct,
  type InsertStockProduct,
  type UserStock,
  type InsertUserStock,
  type CommunityChallenge,
  type InsertCommunityChallenge,
  type ChallengeMember,
  type InsertChallengeMember,
  type JointAccount,
  type InsertJointAccount,
  type UserJointAccount,
  type InsertUserJointAccount,
  type DailyBonus,
  type InsertDailyBonus,
  type Coupon,
  type InsertCoupon,
  type CouponRedemption,
  type XpClaim,
  type SystemSetting,
  type InsertSystemSetting,
  type Deposit,
  type InsertDeposit,
  type Withdrawal,
  type InsertWithdrawal,
  type LoginHistory,
  type InsertLoginHistory,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sum, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (supports both OAuth and password auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByXpCode(xpCode: string): Promise<User | undefined>;
  setUserXpCode(userId: string, xpCode: string): Promise<void>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Joint Account operations
  createJointAccount(jointAccount: InsertJointAccount): Promise<JointAccount>;
  getJointAccount(id: string): Promise<JointAccount | undefined>;
  getJointAccountByJoinCode(joinCode: string): Promise<JointAccount | undefined>;
  getUserJointAccount(userId: string): Promise<UserJointAccount | undefined>;
  joinJointAccount(userJointAccount: InsertUserJointAccount): Promise<UserJointAccount>;
  joinJointAccountByCode(userId: string, joinCode: string): Promise<UserJointAccount>;
  getJointAccountMembers(jointAccountId: string): Promise<(UserJointAccount & { user: User })[]>;
  updateJointAccount(id: string, data: { name?: string; partnerEmail?: string; relationshipType?: string }): Promise<JointAccount>;
  
  // Helper method to get account context (individual or joint)
  getAccountContext(userId: string): Promise<{
    isJointAccount: boolean;
    accountId: string;
    jointAccount?: JointAccount;
  }>;
  
  // User Profile operations
  updateUserProfile(userId: string, profileData: {
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    firstName?: string;
    lastName?: string;
    verificationDocumentUrl?: string;
    verificationDocumentType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  }): Promise<User>;

  // Admin User Management operations
  getAllUsers(): Promise<User[]>;
  deleteUser(userId: string): Promise<void>;
  updateUserRole(userId: string, role: 'user' | 'admin'): Promise<User>;
  updateUserKycStatus(userId: string, kycStatus: 'pending' | 'approved' | 'rejected'): Promise<User>;
  getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    pendingKyc: number;
    approvedKyc: number;
    adminUsers: number;
  }>;
  
  // Portfolio operations
  getPortfolios(): Promise<Portfolio[]>;
  getPortfolio(id: string): Promise<Portfolio | undefined>;
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  updatePortfolio(id: string, portfolio: Partial<InsertPortfolio>): Promise<Portfolio>;
  deletePortfolio(id: string): Promise<void>;
  
  // User Portfolio operations
  getUserPortfolios(userId: string): Promise<(UserPortfolio & { portfolio: Portfolio })[]>;
  createUserPortfolio(userPortfolio: InsertUserPortfolio): Promise<UserPortfolio>;
  updateUserPortfolio(id: string, updates: Partial<InsertUserPortfolio>): Promise<UserPortfolio>;
  getUserPortfolioById(id: string): Promise<UserPortfolio | undefined>;
  getPendingPortfolioInvestments(): Promise<(UserPortfolio & { portfolio: Portfolio; user?: { email: string; firstName: string; lastName: string } })[]>;
  getAllUserInvestments(): Promise<any[]>;
  getAllUserBonds(): Promise<any[]>;
  getAllStockPurchases(): Promise<any[]>;
  accrueInterestForAllPortfolios(): Promise<{ processed: number; totalInterestAdded: string; maturityPayouts: number }>;
  cancelUserPortfolio(id: string): Promise<{ refundAmount: string; userId: string }>;
  
  // Bond operations
  getBondProducts(): Promise<BondProduct[]>;
  getBondProduct(id: string): Promise<BondProduct | undefined>;
  createBondProduct(product: InsertBondProduct): Promise<BondProduct>;
  updateBondProduct(id: string, updates: Partial<InsertBondProduct>): Promise<BondProduct>;
  deleteBondProduct(id: string): Promise<void>;
  getUserBonds(userId: string): Promise<(UserBond & { bondProduct: BondProduct })[]>;
  createUserBond(userBond: InsertUserBond): Promise<UserBond>;
  
  // Stock operations
  getStockProducts(): Promise<StockProduct[]>;
  getStockProduct(id: string): Promise<StockProduct | undefined>;
  getStockProductBySymbol(symbol: string): Promise<StockProduct | undefined>;
  createStockProduct(product: InsertStockProduct): Promise<StockProduct>;
  updateStockProduct(id: string, product: Partial<InsertStockProduct>): Promise<StockProduct>;
  deleteStockProduct(id: string): Promise<void>;
  getUserStocks(userId: string): Promise<(UserStock & { stockProduct: StockProduct })[]>;
  createUserStock(userStock: InsertUserStock): Promise<UserStock>;
  
  // Challenge operations
  getCommunityChalllenges(): Promise<CommunityChallenge[]>;
  getCommunityChallenge(id: string): Promise<CommunityChallenge | undefined>;
  createCommunityChallenge(challenge: InsertCommunityChallenge): Promise<CommunityChallenge>;
  joinChallenge(challengeMember: InsertChallengeMember): Promise<ChallengeMember>;
  getChallengeMembers(challengeId: string): Promise<(ChallengeMember & { user: User })[]>;
  updateChallengeProgress(challengeId: string, amount: string): Promise<void>;
  
  // Daily Bonus operations
  createDailyBonus(userId: string, amount: string): Promise<DailyBonus>;
  getUserDailyBonuses(userId: string): Promise<DailyBonus[]>;
  getDailyBonusStats(userId: string): Promise<{
    totalClaimed: string;
    totalRedeemed: string;
    pending: string;
    lastClaimDate: Date | null;
  }>;
  redeemDailyBonuses(userId: string): Promise<{
    redeemedAmount: string;
    bonusCount: number;
    newBalance: string;
  }>;
  
  // Coupon operations
  getCouponByCode(code: string): Promise<Coupon | undefined>;
  redeemCoupon(userId: string, code: string): Promise<{
    rewardAmount: string;
    newBalance: string;
    description: string;
  }>;
  getUserCouponRedemptions(userId: string): Promise<CouponRedemption[]>;
  
  // Admin Coupon Management
  getAllCoupons(): Promise<Coupon[]>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: string, coupon: Partial<InsertCoupon>): Promise<Coupon>;
  deleteCoupon(id: string): Promise<void>;
  
  // XP operations
  claimDailyXp(userId: string): Promise<{
    xpAmount: number;
    newXpBalance: number;
  }>;
  convertXpToCash(userId: string, xpAmount: number): Promise<{
    convertedAmount: string;
    newBalance: string;
    newXpBalance: number;
  }>;
  getUserXpClaims(userId: string): Promise<XpClaim[]>;
  
  // System Settings
  getSetting(key: string): Promise<SystemSetting | undefined>;
  setSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  getAllSettings(): Promise<SystemSetting[]>;
  
  // Password Reset operations
  setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(userId: string): Promise<void>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
  
  // Deposit operations
  createDeposit(deposit: InsertDeposit, createdAt?: Date): Promise<Deposit>;
  getUserDeposits(userId: string): Promise<Deposit[]>;
  updateDepositStatus(id: string, status: 'pending' | 'completed' | 'failed', transactionId?: string): Promise<Deposit>;
  processCryptoDeposit(userId: string, amount: string, cryptoAddress: string): Promise<Deposit>;
  processBankTransferDeposit(userId: string, amount: string, bankDetails: any): Promise<Deposit>;
  processCardPaymentDeposit(userId: string, amount: string, stripeTransactionId: string): Promise<Deposit>;
  processDepositCouponDeposit(userId: string, couponCode: string): Promise<Deposit>;
  approveDeposit(depositId: string, adminId: string): Promise<Deposit>;
  rejectDeposit(depositId: string, adminId: string): Promise<Deposit>;
  cancelDeposit(depositId: string, adminId: string): Promise<Deposit>;
  getAllDeposits(): Promise<(Deposit & { user: { email: string; firstName: string; lastName: string } })[]>;
  
  // Withdrawal operations
  createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal>;
  getUserWithdrawals(userId: string): Promise<Withdrawal[]>;
  processWithdrawal(userId: string, amount: string, withdrawMethod: 'crypto' | 'wire_transfer' | 'merchant_pay', destinationAddress: string, metadata?: any): Promise<Withdrawal>;
  approveWithdrawal(withdrawalId: string, adminId: string): Promise<Withdrawal>;
  rejectWithdrawal(withdrawalId: string, adminId: string): Promise<Withdrawal>;
  cancelWithdrawal(withdrawalId: string, adminId: string): Promise<Withdrawal>;
  getAllWithdrawals(): Promise<(Withdrawal & { user: { email: string; firstName: string; lastName: string } })[]>;
  
  // Analytics
  getDashboardStats(userId: string): Promise<{
    totalPortfolioValue: string;
    activeBonds: string;
    activeChallenges: number;
    availableBalance: string;
    stocksValue: string;
  }>;

  // Admin Analytics operations
  getAnalyticsData(): Promise<{
    totalRevenue: string;
    monthlyRevenue: string;
    totalInvestments: string;
    totalBondsValue: string;
    platformFees: string;
    transactionVolume: string;
    activePortfolios: number;
    completedChallenges: number;
  }>;

  // System Health operations
  getSystemHealth(): Promise<{
    uptime: string;
    apiResponseTime: string;
    databaseStatus: 'healthy' | 'warning' | 'error';
    activeConnections: number;
    errorRate: string;
    lastBackup: string;
  }>;

  // Activity Logs operations
  getActivityLogs(limit: number, offset: number, type?: string): Promise<Array<{
    id: string;
    timestamp: Date;
    userId: string;
    userEmail: string;
    action: string;
    details: string;
    type: 'user' | 'admin' | 'system' | 'security';
    ipAddress?: string;
  }>>;

  // Login History operations
  recordLogin(data: InsertLoginHistory): Promise<LoginHistory>;
  getUserLoginHistory(userId: string): Promise<LoginHistory[]>;
  getAllLoginHistory(): Promise<(LoginHistory & { user: { email: string; firstName: string; lastName: string } })[]>;
  
  // Scheduled Email operations
  createScheduledEmail(userId: string, emailType: string, recipientEmail: string, recipientFirstName: string | null, scheduledFor: Date): Promise<void>;
  getPendingScheduledEmails(): Promise<Array<{
    id: string;
    userId: string;
    emailType: string;
    recipientEmail: string;
    recipientFirstName: string | null;
    scheduledFor: Date;
  }>>;
  markScheduledEmailSent(id: string): Promise<void>;
  markScheduledEmailFailed(id: string, errorMessage: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    // Handle demo user in development
    const demoMode = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
    if (demoMode && id === 'demo-user') {
      return {
        id: 'demo-user',
        email: 'demo@refluxcapital.com',
        firstName: 'Demo',
        lastName: 'Admin',
        profileImageUrl: null,
        passwordHash: null,
        authType: 'oauth' as const,
        accountType: 'personal',
        businessName: null,
        businessType: null,
        taxId: null,
        balance: '0',
        accumulatedDailyBonus: '0',
        xpBalance: 0,
        role: 'admin',
        kycStatus: 'approved',
        lastDailyRewardClaim: null,
        lastXpClaim: null,
        xpCode: null,
        xpCodeGeneratedAt: null,
        phoneNumber: null,
        address: null,
        city: null,
        state: null,
        zipCode: null,
        country: null,
        verificationDocumentUrl: null,
        verificationDocumentType: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByXpCode(xpCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.xpCode, xpCode));
    return user;
  }

  async setUserXpCode(userId: string, xpCode: string): Promise<void> {
    await db.update(users)
      .set({ 
        xpCode,
        xpCodeGeneratedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // On conflict (existing user), only update profile fields - never overwrite balance
    const { balance, xpBalance, ...profileFields } = userData;
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...profileFields,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Joint Account operations
  async createJointAccount(jointAccountData: InsertJointAccount): Promise<JointAccount> {
    // Generate a cryptographically secure 8-character join code
    const generateSecureJoinCode = (): string => {
      const crypto = require('crypto');
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      const bytes = crypto.randomBytes(8);
      for (let i = 0; i < 8; i++) {
        result += chars[bytes[i] % chars.length];
      }
      return result;
    };

    // Retry on unique constraint violation
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      try {
        const [jointAccount] = await db
          .insert(jointAccounts)
          .values({
            ...jointAccountData,
            joinCode: generateSecureJoinCode(),
          })
          .returning();

        // Create the mapping for the creator
        await db.insert(userJointAccounts).values({
          userId: jointAccountData.createdBy,
          jointAccountId: jointAccount.id,
          role: 'primary',
        });

        return jointAccount;
      } catch (error: any) {
        if (error.code === '23505' && error.constraint?.includes('join_code') && attempts < maxAttempts - 1) {
          // Unique constraint violation on join code, retry
          attempts++;
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('Failed to generate unique join code after multiple attempts');
  }

  async getJointAccount(id: string): Promise<JointAccount | undefined> {
    const [jointAccount] = await db.select().from(jointAccounts).where(eq(jointAccounts.id, id));
    return jointAccount;
  }

  async getJointAccountByJoinCode(joinCode: string): Promise<JointAccount | undefined> {
    // Normalize join code to uppercase (codes are stored as uppercase)
    const normalizedCode = joinCode.toUpperCase();
    const [jointAccount] = await db.select().from(jointAccounts).where(eq(jointAccounts.joinCode, normalizedCode));
    return jointAccount;
  }

  async getUserJointAccount(userId: string): Promise<UserJointAccount | undefined> {
    const [userJointAccount] = await db.select().from(userJointAccounts).where(eq(userJointAccounts.userId, userId));
    return userJointAccount;
  }

  async joinJointAccount(userJointAccountData: InsertUserJointAccount): Promise<UserJointAccount> {
    const [userJointAccount] = await db.insert(userJointAccounts).values(userJointAccountData).returning();
    return userJointAccount;
  }

  async joinJointAccountByCode(userId: string, joinCode: string): Promise<UserJointAccount> {
    // Normalize join code to uppercase (codes are stored as uppercase)
    const normalizedCode = joinCode.toUpperCase();
    
    // Find the joint account by join code
    const [jointAccount] = await db
      .select()
      .from(jointAccounts)
      .where(eq(jointAccounts.joinCode, normalizedCode));

    if (!jointAccount) {
      throw new Error('Joint account not found');
    }

    // Check if user is already in this joint account
    const [existingMembership] = await db
      .select()
      .from(userJointAccounts)
      .where(
        and(
          eq(userJointAccounts.userId, userId),
          eq(userJointAccounts.jointAccountId, jointAccount.id)
        )
      );

    if (existingMembership) {
      throw new Error('User already in joint account');
    }

    // Add user to the joint account with 'partner' role
    const [userJointAccount] = await db
      .insert(userJointAccounts)
      .values({
        userId,
        jointAccountId: jointAccount.id,
        role: 'partner',
      })
      .returning();

    return userJointAccount;
  }

  async getJointAccountMembers(jointAccountId: string): Promise<(UserJointAccount & { user: User })[]> {
    return await db
      .select()
      .from(userJointAccounts)
      .leftJoin(users, eq(userJointAccounts.userId, users.id))
      .where(eq(userJointAccounts.jointAccountId, jointAccountId))
      .then(rows => rows.map(row => ({
        ...row.user_joint_accounts,
        user: row.users!
      })));
  }

  async updateJointAccount(id: string, data: { name?: string; partnerEmail?: string; relationshipType?: string }): Promise<JointAccount> {
    const [updated] = await db
      .update(jointAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(jointAccounts.id, id))
      .returning();
    return updated;
  }

  async getAccountContext(userId: string): Promise<{
    isJointAccount: boolean;
    accountId: string;
    jointAccount?: JointAccount;
  }> {
    const userJointAccount = await this.getUserJointAccount(userId);
    
    if (userJointAccount) {
      const jointAccount = await this.getJointAccount(userJointAccount.jointAccountId);
      return {
        isJointAccount: true,
        accountId: userJointAccount.jointAccountId,
        jointAccount,
      };
    }
    
    return {
      isJointAccount: false,
      accountId: userId,
    };
  }

  // Admin User Management operations
  async getAllUsers(): Promise<User[]> {
    // Handle demo mode
    const demoMode = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
    if (demoMode) {
      const baseUserFields = {
        profileImageUrl: null,
        passwordHash: null,
        authType: 'oauth' as const,
        accountType: 'personal' as const,
        businessName: null,
        businessType: null,
        taxId: null,
        balance: '0',
        accumulatedDailyBonus: '0',
        xpBalance: 0,
        lastDailyRewardClaim: null,
        lastXpClaim: null,
        xpCode: null,
        xpCodeGeneratedAt: null,
        phoneNumber: null,
        address: null,
        city: null,
        state: null,
        zipCode: null,
        country: null,
        verificationDocumentUrl: null,
        verificationDocumentType: null,
        updatedAt: new Date()
      };
      return [
        {
          ...baseUserFields,
          id: 'demo-user',
          email: 'demo@refluxcapital.com',
          firstName: 'Demo',
          lastName: 'Admin',
          role: 'admin' as const,
          kycStatus: 'approved' as const,
          createdAt: new Date('2024-01-15'),
        },
        {
          ...baseUserFields,
          id: 'user-1',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'user' as const,
          kycStatus: 'approved' as const,
          createdAt: new Date('2024-02-20'),
        },
        {
          ...baseUserFields,
          id: 'user-2',
          email: 'jane.smith@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'user' as const,
          kycStatus: 'pending' as const,
          createdAt: new Date('2024-03-10'),
        },
        {
          ...baseUserFields,
          id: 'user-3',
          email: 'bob.wilson@example.com',
          firstName: 'Bob',
          lastName: 'Wilson',
          role: 'user' as const,
          kycStatus: 'rejected' as const,
          createdAt: new Date('2024-03-25'),
        }
      ];
    }
    
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async deleteUser(userId: string): Promise<void> {
    // Delete related records first (cascade manually)
    await db.delete(userPortfolios).where(eq(userPortfolios.userId, userId));
    await db.delete(userBonds).where(eq(userBonds.userId, userId));
    await db.delete(userStocks).where(eq(userStocks.userId, userId));
    await db.delete(challengeMembers).where(eq(challengeMembers.userId, userId));
    await db.delete(deposits).where(eq(deposits.userId, userId));
    await db.delete(withdrawals).where(eq(withdrawals.userId, userId));
    await db.delete(userJointAccounts).where(eq(userJointAccounts.userId, userId));
    await db.delete(dailyBonuses).where(eq(dailyBonuses.userId, userId));
    await db.delete(xpClaims).where(eq(xpClaims.userId, userId));
    await db.delete(couponRedemptions).where(eq(couponRedemptions.userId, userId));
    // Sessions table uses a different structure (jsonb) and will expire naturally
    // Finally delete the user
    await db.delete(users).where(eq(users.id, userId));
  }

  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserKycStatus(userId: string, kycStatus: 'pending' | 'approved' | 'rejected'): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ kycStatus, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserBalance(userId: string, newBalance: string): Promise<User> {
    console.log(`[Storage.updateUserBalance] Updating user ${userId} balance to ${newBalance}`);
    const result = await db
      .update(users)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    
    console.log(`[Storage.updateUserBalance] Update result:`, result.length > 0 ? `Updated to ${result[0].balance}` : 'No rows updated');
    
    if (result.length === 0) {
      console.error(`[Storage.updateUserBalance] No user found with id ${userId}`);
      throw new Error(`User not found: ${userId}`);
    }
    
    return result[0];
  }

  async updateUserProfile(userId: string, profileData: {
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    firstName?: string;
    lastName?: string;
    verificationDocumentUrl?: string;
    verificationDocumentType?: 'passport' | 'drivers_license' | 'national_id' | 'other';
  }): Promise<User> {
    const updateData: any = { updatedAt: new Date() };
    
    if (profileData.phoneNumber !== undefined) updateData.phoneNumber = profileData.phoneNumber;
    if (profileData.address !== undefined) updateData.address = profileData.address;
    if (profileData.city !== undefined) updateData.city = profileData.city;
    if (profileData.state !== undefined) updateData.state = profileData.state;
    if (profileData.zipCode !== undefined) updateData.zipCode = profileData.zipCode;
    if (profileData.country !== undefined) updateData.country = profileData.country;
    if (profileData.firstName !== undefined) updateData.firstName = profileData.firstName;
    if (profileData.lastName !== undefined) updateData.lastName = profileData.lastName;
    if (profileData.verificationDocumentUrl !== undefined) updateData.verificationDocumentUrl = profileData.verificationDocumentUrl;
    if (profileData.verificationDocumentType !== undefined) updateData.verificationDocumentType = profileData.verificationDocumentType;
    
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    pendingKyc: number;
    approvedKyc: number;
    adminUsers: number;
  }> {
    // Handle demo mode
    const demoMode = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
    if (demoMode) {
      return {
        totalUsers: 4,
        activeUsers: 4,
        pendingKyc: 1,
        approvedKyc: 2,
        adminUsers: 1,
      };
    }
    
    const totalUsersResult = await db.select({ count: count() }).from(users);
    const pendingKycResult = await db.select({ count: count() }).from(users).where(eq(users.kycStatus, 'pending'));
    const approvedKycResult = await db.select({ count: count() }).from(users).where(eq(users.kycStatus, 'approved'));
    const adminUsersResult = await db.select({ count: count() }).from(users).where(eq(users.role, 'admin'));

    return {
      totalUsers: totalUsersResult[0]?.count || 0,
      activeUsers: totalUsersResult[0]?.count || 0, // For now, all users are considered active
      pendingKyc: pendingKycResult[0]?.count || 0,
      approvedKyc: approvedKycResult[0]?.count || 0,
      adminUsers: adminUsersResult[0]?.count || 0,
    };
  }

  // Portfolio operations
  async getPortfolios(): Promise<Portfolio[]> {
    return await db.select().from(portfolios).where(eq(portfolios.isActive, true));
  }

  async getPortfolio(id: string): Promise<Portfolio | undefined> {
    const [portfolio] = await db.select().from(portfolios).where(eq(portfolios.id, id));
    return portfolio;
  }

  async createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio> {
    const [newPortfolio] = await db.insert(portfolios).values(portfolio).returning();
    return newPortfolio;
  }

  async updatePortfolio(id: string, portfolio: Partial<InsertPortfolio>): Promise<Portfolio> {
    const [updatedPortfolio] = await db
      .update(portfolios)
      .set({ ...portfolio, updatedAt: new Date() })
      .where(eq(portfolios.id, id))
      .returning();
    return updatedPortfolio;
  }

  async deletePortfolio(id: string): Promise<void> {
    await db.update(portfolios).set({ isActive: false }).where(eq(portfolios.id, id));
  }

  // User Portfolio operations
  async getUserPortfolios(userId: string): Promise<(UserPortfolio & { portfolio: Portfolio })[]> {
    const accountContext = await this.getAccountContext(userId);
    
    if (accountContext.isJointAccount) {
      // Get portfolios for BOTH individual user AND joint account
      return await db
        .select()
        .from(userPortfolios)
        .leftJoin(portfolios, eq(userPortfolios.portfolioId, portfolios.id))
        .where(
          or(
            eq(userPortfolios.userId, userId),
            eq(userPortfolios.jointAccountId, accountContext.accountId)
          )
        )
        .then(rows => rows.map(row => ({
          ...row.user_portfolios,
          portfolio: row.portfolios!
        })));
    } else {
      // Get portfolios for individual user only
      return await db
        .select()
        .from(userPortfolios)
        .leftJoin(portfolios, eq(userPortfolios.portfolioId, portfolios.id))
        .where(eq(userPortfolios.userId, userId))
        .then(rows => rows.map(row => ({
          ...row.user_portfolios,
          portfolio: row.portfolios!
        })));
    }
  }

  async createUserPortfolio(userPortfolio: InsertUserPortfolio): Promise<UserPortfolio> {
    const [newUserPortfolio] = await db.insert(userPortfolios).values(userPortfolio).returning();
    return newUserPortfolio;
  }

  async updateUserPortfolio(id: string, updates: Partial<InsertUserPortfolio>): Promise<UserPortfolio> {
    const [updated] = await db
      .update(userPortfolios)
      .set(updates)
      .where(eq(userPortfolios.id, id))
      .returning();
    return updated;
  }

  async getUserPortfolioById(id: string): Promise<UserPortfolio | undefined> {
    const [portfolio] = await db.select().from(userPortfolios).where(eq(userPortfolios.id, id));
    return portfolio;
  }

  async cancelUserPortfolio(id: string): Promise<{ refundAmount: string; userId: string }> {
    const userPortfolio = await this.getUserPortfolioById(id);
    if (!userPortfolio) {
      throw new Error('Investment not found');
    }
    if (!userPortfolio.userId) {
      throw new Error('Investment has no associated user');
    }
    if (userPortfolio.status === 'cancelled') {
      throw new Error('Investment is already cancelled');
    }

    const currentValue = parseFloat(userPortfolio.currentValue?.toString() || '0');
    const accruedUnpaidProfit = parseFloat(userPortfolio.accruedUnpaidProfit?.toString() || '0');
    const refundAmount = currentValue + accruedUnpaidProfit;

    const user = await this.getUser(userPortfolio.userId);
    if (user) {
      const currentBalance = parseFloat(user.balance?.toString() || '0');
      await this.updateUserBalance(userPortfolio.userId, (currentBalance + refundAmount).toString());
    }

    if (userPortfolio.portfolioId && userPortfolio.unitsPurchased) {
      const portfolio = await this.getPortfolio(userPortfolio.portfolioId);
      if (portfolio) {
        const currentUnitsSold = portfolio.unitsSold || 0;
        const unitsToRestore = userPortfolio.unitsPurchased || 0;
        const newUnitsSold = Math.max(0, currentUnitsSold - unitsToRestore);
        await this.updatePortfolio(userPortfolio.portfolioId, { unitsSold: newUnitsSold });
      }
    }

    await db.update(userPortfolios).set({ 
      status: 'cancelled',
      currentValue: '0',
      accruedUnpaidProfit: '0'
    }).where(eq(userPortfolios.id, id));

    return { refundAmount: refundAmount.toFixed(2), userId: userPortfolio.userId };
  }

  async getPendingPortfolioInvestments(): Promise<(UserPortfolio & { portfolio: Portfolio; user?: { email: string; firstName: string; lastName: string } })[]> {
    const pending = await db
      .select()
      .from(userPortfolios)
      .leftJoin(portfolios, eq(userPortfolios.portfolioId, portfolios.id))
      .leftJoin(users, eq(userPortfolios.userId, users.id))
      .where(eq(userPortfolios.status, 'pending'))
      .orderBy(desc(userPortfolios.createdAt));

    return pending.map(row => ({
      ...row.user_portfolios,
      portfolio: row.portfolios!,
      user: row.users ? {
        email: row.users.email || '',
        firstName: row.users.firstName || '',
        lastName: row.users.lastName || ''
      } : undefined
    }));
  }

  async getAllUserInvestments(): Promise<any[]> {
    const allInvestments = await db
      .select()
      .from(userPortfolios)
      .leftJoin(portfolios, eq(userPortfolios.portfolioId, portfolios.id))
      .leftJoin(users, eq(userPortfolios.userId, users.id))
      .orderBy(desc(userPortfolios.createdAt));

    return allInvestments.map(row => ({
      ...row.user_portfolios,
      portfolio: row.portfolios ? {
        id: row.portfolios.id,
        name: row.portfolios.name,
        interestRate: row.portfolios.interestRate,
        interestPeriod: row.portfolios.interestPeriod,
        payoutTerm: row.portfolios.payoutTerm,
        termDuration: row.portfolios.termDuration,
        riskLevel: row.portfolios.riskLevel
      } : null,
      user: row.users ? {
        id: row.users.id,
        firstName: row.users.firstName || '',
        lastName: row.users.lastName || '',
        email: row.users.email || ''
      } : null
    }));
  }

  async getAllUserBonds(): Promise<any[]> {
    const allBonds = await db
      .select()
      .from(userBonds)
      .leftJoin(bondProducts, eq(userBonds.bondProductId, bondProducts.id))
      .leftJoin(users, eq(userBonds.userId, users.id))
      .orderBy(desc(userBonds.purchaseDate));

    return allBonds.map(row => ({
      ...row.user_bonds,
      bond: row.bond_products ? {
        id: row.bond_products.id,
        name: row.bond_products.name,
        bondType: row.bond_products.bondType,
        yield: row.bond_products.yield,
        maturityMonths: row.bond_products.maturityMonths
      } : null,
      user: row.users ? {
        id: row.users.id,
        firstName: row.users.firstName || '',
        lastName: row.users.lastName || '',
        email: row.users.email || ''
      } : null
    }));
  }

  async getAllStockPurchases(): Promise<any[]> {
    const allStocks = await db
      .select()
      .from(userStocks)
      .leftJoin(stockProducts, eq(userStocks.stockProductId, stockProducts.id))
      .leftJoin(users, eq(userStocks.userId, users.id))
      .orderBy(desc(userStocks.createdAt));

    return allStocks.map(row => ({
      ...row.user_stocks,
      symbol: row.stock_products?.symbol || '',
      quantity: row.user_stocks?.quantity || '0',
      purchasePrice: row.user_stocks?.purchasePrice || '0',
      totalAmount: row.user_stocks?.totalInvested || '0',
      user: row.users ? {
        id: row.users.id,
        firstName: row.users.firstName || '',
        lastName: row.users.lastName || '',
        email: row.users.email || ''
      } : null
    }));
  }

  async accrueInterestForAllPortfolios(): Promise<{ processed: number; totalInterestAdded: string; maturityPayouts: number }> {
    const approvedPortfolios = await db
      .select()
      .from(userPortfolios)
      .leftJoin(portfolios, eq(userPortfolios.portfolioId, portfolios.id))
      .where(eq(userPortfolios.status, 'approved'));

    let processed = 0;
    let totalInterestAdded = 0;
    let maturityPayouts = 0;
    const now = new Date();

    for (const row of approvedPortfolios) {
      const userPortfolio = row.user_portfolios;
      const portfolio = row.portfolios;

      if (!portfolio || !userPortfolio) continue;
      if (userPortfolio.maturityPaidAt) continue; // Already paid out at maturity

      // Get interest configuration (use new fields, fallback to legacy)
      const baseInterestRate = parseFloat(portfolio.interestRate?.toString() || portfolio.dailyInterestRate?.toString() || '0');
      if (baseInterestRate <= 0) continue;
      const meterReduction = parseFloat((portfolio as any).meterReduction?.toString() || '0');
      const interestRate = baseInterestRate * (1 - Math.min(100, Math.max(0, meterReduction)) / 100);

      const interestPeriod = (portfolio.interestPeriod as string) || 'daily';
      const payoutTerm = (portfolio.payoutTerm as string) || 'term_based';
      const termDuration = portfolio.termDuration || 30;

      // Calculate period duration in milliseconds
      const getPeriodMs = (period: string): number => {
        switch (period) {
          case 'hourly': return 60 * 60 * 1000;
          case 'daily': return 24 * 60 * 60 * 1000;
          case 'weekly': return 7 * 24 * 60 * 60 * 1000;
          case 'monthly': return 30 * 24 * 60 * 60 * 1000;
          default: return 24 * 60 * 60 * 1000;
        }
      };

      const periodMs = getPeriodMs(interestPeriod);
      const lastApplied = userPortfolio.lastInterestAppliedAt || userPortfolio.investmentStartDate || userPortfolio.createdAt;
      const timeSinceLastApplied = now.getTime() - new Date(lastApplied!).getTime();
      const periodsElapsed = Math.floor(timeSinceLastApplied / periodMs);

      const currentPeriodsCompleted = userPortfolio.periodsCompleted || 0;

      // Skip if no new periods have elapsed and not at maturity
      if (periodsElapsed <= 0) {
        // Check for maturity payout when no new periods to apply
        if (currentPeriodsCompleted >= termDuration && !userPortfolio.maturityPaidAt && userPortfolio.userId) {
          const user = await this.getUser(userPortfolio.userId);
          if (user) {
            const currentBalance = parseFloat(user.balance?.toString() || '0');
            const investedAmt = parseFloat(userPortfolio.investedAmount?.toString() || '0');
            
            if (payoutTerm === 'profit_only') {
              // Return capital at maturity
              await this.updateUserBalance(userPortfolio.userId, (currentBalance + investedAmt).toString());
              await db.update(userPortfolios).set({ maturityPaidAt: now }).where(eq(userPortfolios.id, userPortfolio.id));
              maturityPayouts++;
            } else if (payoutTerm === 'after_maturity') {
              // Legacy: Pay only accrued profit at maturity (no capital return)
              const unpaidProfit = parseFloat(userPortfolio.accruedUnpaidProfit?.toString() || '0');
              if (unpaidProfit > 0) {
                await this.updateUserBalance(userPortfolio.userId, (currentBalance + unpaidProfit).toString());
                totalInterestAdded += unpaidProfit;
              }
              await db.update(userPortfolios).set({ maturityPaidAt: now, accruedUnpaidProfit: '0' }).where(eq(userPortfolios.id, userPortfolio.id));
              maturityPayouts++;
            } else if (payoutTerm === 'capital_and_interest') {
              // Already paid out fully through periods
              await db.update(userPortfolios).set({ maturityPaidAt: now }).where(eq(userPortfolios.id, userPortfolio.id));
              maturityPayouts++;
            }
          }
        }
        continue;
      }

      const totalPeriodsToApply = Math.min(periodsElapsed, termDuration - currentPeriodsCompleted);
      
      if (totalPeriodsToApply <= 0) {
        // All periods completed, check for maturity payout
        if (currentPeriodsCompleted >= termDuration && !userPortfolio.maturityPaidAt && userPortfolio.userId) {
          const user = await this.getUser(userPortfolio.userId);
          if (user) {
            const currentBalance = parseFloat(user.balance?.toString() || '0');
            const investedAmt = parseFloat(userPortfolio.investedAmount?.toString() || '0');
            
            if (payoutTerm === 'profit_only') {
              // Return capital at maturity
              await this.updateUserBalance(userPortfolio.userId, (currentBalance + investedAmt).toString());
              await db.update(userPortfolios).set({ maturityPaidAt: now }).where(eq(userPortfolios.id, userPortfolio.id));
              maturityPayouts++;
            } else if (payoutTerm === 'after_maturity') {
              // Legacy: Pay only accrued profit at maturity (no capital return)
              const unpaidProfit = parseFloat(userPortfolio.accruedUnpaidProfit?.toString() || '0');
              if (unpaidProfit > 0) {
                await this.updateUserBalance(userPortfolio.userId, (currentBalance + unpaidProfit).toString());
                totalInterestAdded += unpaidProfit;
              }
              await db.update(userPortfolios).set({ maturityPaidAt: now, accruedUnpaidProfit: '0' }).where(eq(userPortfolios.id, userPortfolio.id));
              maturityPayouts++;
            } else if (payoutTerm === 'capital_and_interest') {
              // Already paid out fully through periods
              await db.update(userPortfolios).set({ maturityPaidAt: now }).where(eq(userPortfolios.id, userPortfolio.id));
              maturityPayouts++;
            }
          }
        }
        continue;
      }

      const currentValue = parseFloat(userPortfolio.currentValue?.toString() || '0');
      const interestToAdd = currentValue * interestRate * totalPeriodsToApply;
      const newValue = currentValue + interestToAdd;
      const currentProfit = parseFloat(userPortfolio.totalAccruedProfit?.toString() || '0');
      const newProfit = currentProfit + interestToAdd;
      const currentReturns = parseFloat(userPortfolio.returns?.toString() || '0');
      const newReturns = currentReturns + interestToAdd;
      const newPeriodsCompleted = currentPeriodsCompleted + totalPeriodsToApply;
      const nextInterestAt = new Date(now.getTime() + periodMs);
      
      // Track actual interest for this iteration (may be overridden by capital_and_interest)
      let actualInterestAdded = interestToAdd;

      const updateData: any = {
        currentValue: newValue.toString(),
        returns: newReturns.toString(),
        totalAccruedProfit: newProfit.toString(),
        periodsCompleted: newPeriodsCompleted,
        lastInterestAppliedAt: now,
        nextInterestAt: nextInterestAt
      };

      // Handle payout based on payoutTerm
      const investedAmount = parseFloat(userPortfolio.investedAmount?.toString() || '0');
      
      if (payoutTerm === 'term_based' || payoutTerm === 'profit_only') {
        // Pay interest directly to user balance each period
        if (userPortfolio.userId) {
          const user = await this.getUser(userPortfolio.userId);
          if (user) {
            const currentBalance = parseFloat(user.balance?.toString() || '0');
            await this.updateUserBalance(userPortfolio.userId, (currentBalance + interestToAdd).toString());
          }
        }
        
        // For profit_only: return capital at maturity
        if (payoutTerm === 'profit_only' && newPeriodsCompleted >= termDuration && userPortfolio.userId && !userPortfolio.maturityPaidAt) {
          const user = await this.getUser(userPortfolio.userId);
          if (user) {
            const currentBalance = parseFloat(user.balance?.toString() || '0');
            await this.updateUserBalance(userPortfolio.userId, (currentBalance + investedAmount).toString());
            updateData.maturityPaidAt = now;
            maturityPayouts++;
          }
        }
      } else if (payoutTerm === 'capital_and_interest') {
        // Pay both interest and proportional capital each period
        // currentValue represents remaining principal, interest accrues on it
        const safeTermDuration = Math.max(termDuration, 1); // Guard against division by zero
        const capitalPerPeriod = investedAmount / safeTermDuration;
        const capitalToReturn = capitalPerPeriod * totalPeriodsToApply;
        
        // Use currentValue as remaining principal (source of truth)
        let totalInterestForPeriods = 0;
        let remainingPrincipal = currentValue; // currentValue is already remaining principal
        
        // Calculate interest on declining principal for each period
        for (let i = 0; i < totalPeriodsToApply; i++) {
          totalInterestForPeriods += remainingPrincipal * interestRate;
          remainingPrincipal = Math.max(0, remainingPrincipal - capitalPerPeriod);
        }
        
        const totalPayout = totalInterestForPeriods + capitalToReturn;
        
        // Update fields - currentValue becomes remaining principal after this payout
        updateData.currentValue = remainingPrincipal.toString();
        updateData.totalAccruedProfit = (currentProfit + totalInterestForPeriods).toString();
        updateData.returns = (currentReturns + totalInterestForPeriods).toString();
        
        if (userPortfolio.userId) {
          const user = await this.getUser(userPortfolio.userId);
          if (user) {
            const currentBalance = parseFloat(user.balance?.toString() || '0');
            await this.updateUserBalance(userPortfolio.userId, (currentBalance + totalPayout).toString());
          }
        }
        
        // Track interest correctly for this payout type
        actualInterestAdded = totalInterestForPeriods;
        
        // Mark as matured when all periods complete
        if (newPeriodsCompleted >= termDuration && !userPortfolio.maturityPaidAt) {
          updateData.maturityPaidAt = now;
          maturityPayouts++;
        }
      } else {
        // after_maturity (legacy): Accumulate profit and pay only profit at maturity (no capital return)
        const currentUnpaid = parseFloat(userPortfolio.accruedUnpaidProfit?.toString() || '0');
        updateData.accruedUnpaidProfit = (currentUnpaid + interestToAdd).toString();
        
        // Check if maturity reached - pay only accumulated profit (legacy behavior)
        if (newPeriodsCompleted >= termDuration && userPortfolio.userId && !userPortfolio.maturityPaidAt) {
          const user = await this.getUser(userPortfolio.userId);
          if (user) {
            const totalUnpaid = currentUnpaid + interestToAdd;
            const currentBalance = parseFloat(user.balance?.toString() || '0');
            await this.updateUserBalance(userPortfolio.userId, (currentBalance + totalUnpaid).toString());
            updateData.maturityPaidAt = now;
            updateData.accruedUnpaidProfit = '0';
            maturityPayouts++;
          }
        }
      }

      await db.update(userPortfolios).set(updateData).where(eq(userPortfolios.id, userPortfolio.id));
      processed++;
      totalInterestAdded += actualInterestAdded;
    }

    return { processed, totalInterestAdded: totalInterestAdded.toFixed(2), maturityPayouts };
  }

  // Bond operations
  async getBondProducts(): Promise<BondProduct[]> {
    return await db.select().from(bondProducts).where(eq(bondProducts.isActive, true));
  }

  async getBondProduct(id: string): Promise<BondProduct | undefined> {
    const [product] = await db.select().from(bondProducts).where(eq(bondProducts.id, id));
    return product;
  }

  async createBondProduct(product: InsertBondProduct): Promise<BondProduct> {
    const [newProduct] = await db.insert(bondProducts).values(product).returning();
    return newProduct;
  }

  async updateBondProduct(id: string, updates: Partial<InsertBondProduct>): Promise<BondProduct> {
    const [updatedProduct] = await db
      .update(bondProducts)
      .set(updates)
      .where(eq(bondProducts.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteBondProduct(id: string): Promise<void> {
    await db.update(bondProducts).set({ isActive: false }).where(eq(bondProducts.id, id));
  }

  async getUserBonds(userId: string): Promise<(UserBond & { bondProduct: BondProduct })[]> {
    const accountContext = await this.getAccountContext(userId);
    
    if (accountContext.isJointAccount) {
      // Get bonds for BOTH individual user AND joint account
      return await db
        .select()
        .from(userBonds)
        .leftJoin(bondProducts, eq(userBonds.bondProductId, bondProducts.id))
        .where(
          or(
            eq(userBonds.userId, userId),
            eq(userBonds.jointAccountId, accountContext.accountId)
          )
        )
        .then(rows => rows.map(row => ({
          ...row.user_bonds,
          bondProduct: row.bond_products!
        })));
    } else {
      // Get bonds for individual user only
      return await db
        .select()
        .from(userBonds)
        .leftJoin(bondProducts, eq(userBonds.bondProductId, bondProducts.id))
        .where(eq(userBonds.userId, userId))
        .then(rows => rows.map(row => ({
          ...row.user_bonds,
          bondProduct: row.bond_products!
        })));
    }
  }

  async createUserBond(userBondData: InsertUserBond): Promise<UserBond> {
    const [newBond] = await db.insert(userBonds).values(userBondData).returning();
    return newBond;
  }

  // Stock operations
  async getStockProducts(): Promise<StockProduct[]> {
    return await db.select().from(stockProducts).where(eq(stockProducts.isActive, true));
  }

  async getStockProduct(id: string): Promise<StockProduct | undefined> {
    const [product] = await db.select().from(stockProducts).where(eq(stockProducts.id, id));
    return product;
  }

  async getStockProductBySymbol(symbol: string): Promise<StockProduct | undefined> {
    const [product] = await db.select().from(stockProducts).where(eq(stockProducts.symbol, symbol));
    return product;
  }

  async createStockProduct(product: InsertStockProduct): Promise<StockProduct> {
    const [newProduct] = await db.insert(stockProducts).values(product).returning();
    return newProduct;
  }

  async updateStockProduct(id: string, product: Partial<InsertStockProduct>): Promise<StockProduct> {
    const [updatedProduct] = await db
      .update(stockProducts)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(stockProducts.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteStockProduct(id: string): Promise<void> {
    await db.update(stockProducts).set({ isActive: false }).where(eq(stockProducts.id, id));
  }

  async getUserStocks(userId: string): Promise<(UserStock & { stockProduct: StockProduct })[]> {
    const accountContext = await this.getAccountContext(userId);
    
    if (accountContext.isJointAccount) {
      return await db
        .select()
        .from(userStocks)
        .leftJoin(stockProducts, eq(userStocks.stockProductId, stockProducts.id))
        .where(
          or(
            eq(userStocks.userId, userId),
            eq(userStocks.jointAccountId, accountContext.accountId)
          )
        )
        .then(rows => rows.map(row => ({
          ...row.user_stocks,
          stockProduct: row.stock_products!
        })));
    } else {
      return await db
        .select()
        .from(userStocks)
        .leftJoin(stockProducts, eq(userStocks.stockProductId, stockProducts.id))
        .where(eq(userStocks.userId, userId))
        .then(rows => rows.map(row => ({
          ...row.user_stocks,
          stockProduct: row.stock_products!
        })));
    }
  }

  async createUserStock(userStockData: InsertUserStock): Promise<UserStock> {
    const [newStock] = await db.insert(userStocks).values(userStockData).returning();
    return newStock;
  }

  async getPendingStockPurchases(): Promise<(UserStock & { stockProduct: StockProduct; user?: User })[]> {
    return await db
      .select()
      .from(userStocks)
      .leftJoin(stockProducts, eq(userStocks.stockProductId, stockProducts.id))
      .leftJoin(users, eq(userStocks.userId, users.id))
      .where(eq(userStocks.status, 'pending'))
      .then(rows => rows.map(row => ({
        ...row.user_stocks,
        stockProduct: row.stock_products!,
        user: row.users || undefined,
      })));
  }

  async updateStockPurchaseStatus(stockPurchaseId: string, status: 'approved' | 'rejected'): Promise<UserStock> {
    const [updatedStock] = await db
      .update(userStocks)
      .set({ status })
      .where(eq(userStocks.id, stockPurchaseId))
      .returning();
    return updatedStock;
  }

  // Challenge operations
  async getCommunityChalllenges(): Promise<CommunityChallenge[]> {
    return await db.select().from(communityChallenges).where(eq(communityChallenges.status, 'active'));
  }

  async getCommunityChallenge(id: string): Promise<CommunityChallenge | undefined> {
    const [challenge] = await db.select().from(communityChallenges).where(eq(communityChallenges.id, id));
    return challenge;
  }

  async createCommunityChallenge(challenge: InsertCommunityChallenge): Promise<CommunityChallenge> {
    const [newChallenge] = await db.insert(communityChallenges).values(challenge).returning();
    return newChallenge;
  }

  async joinChallenge(challengeMember: InsertChallengeMember): Promise<ChallengeMember> {
    const [member] = await db.insert(challengeMembers).values(challengeMember).returning();
    return member;
  }

  async getChallengeMembers(challengeId: string): Promise<(ChallengeMember & { user: User })[]> {
    return await db
      .select()
      .from(challengeMembers)
      .leftJoin(users, eq(challengeMembers.userId, users.id))
      .where(eq(challengeMembers.challengeId, challengeId))
      .then(rows => rows.map(row => ({
        ...row.challenge_members,
        user: row.users!
      })));
  }

  async updateChallengeProgress(challengeId: string, amount: string): Promise<void> {
    await db
      .update(communityChallenges)
      .set({ 
        currentAmount: sql`${communityChallenges.currentAmount} + ${amount}`
      })
      .where(eq(communityChallenges.id, challengeId));
  }

  // Analytics
  async getDashboardStats(userId: string): Promise<{
    totalPortfolioValue: string;
    activeBonds: string;
    activeChallenges: number;
    availableBalance: string;
  }> {
    const accountContext = await this.getAccountContext(userId);

    let portfolioValueResult, activeBondsResult, activeChallengesResult;

    if (accountContext.isJointAccount) {
      // Calculate for BOTH individual user AND joint account
      portfolioValueResult = await db
        .select({ total: sum(userPortfolios.currentValue) })
        .from(userPortfolios)
        .where(
          or(
            eq(userPortfolios.userId, userId),
            eq(userPortfolios.jointAccountId, accountContext.accountId)
          )
        );

      activeBondsResult = await db
        .select({ total: sum(userBonds.investedAmount) })
        .from(userBonds)
        .where(
          and(
            or(
              eq(userBonds.userId, userId),
              eq(userBonds.jointAccountId, accountContext.accountId)
            ),
            eq(userBonds.status, 'active')
          )
        );

      activeChallengesResult = await db
        .select({ count: count() })
        .from(challengeMembers)
        .leftJoin(communityChallenges, eq(challengeMembers.challengeId, communityChallenges.id))
        .where(
          and(
            or(
              eq(challengeMembers.userId, userId),
              eq(challengeMembers.jointAccountId, accountContext.accountId)
            ),
            eq(communityChallenges.status, 'active')
          )
        );
    } else {
      // Calculate for individual user
      portfolioValueResult = await db
        .select({ total: sum(userPortfolios.currentValue) })
        .from(userPortfolios)
        .where(eq(userPortfolios.userId, userId));

      activeBondsResult = await db
        .select({ total: sum(userBonds.investedAmount) })
        .from(userBonds)
        .where(and(eq(userBonds.userId, userId), eq(userBonds.status, 'active')));

      activeChallengesResult = await db
        .select({ count: count() })
        .from(challengeMembers)
        .leftJoin(communityChallenges, eq(challengeMembers.challengeId, communityChallenges.id))
        .where(
          and(
            eq(challengeMembers.userId, userId),
            eq(communityChallenges.status, 'active')
          )
        );
    }

    // Get the actual user balance from the database
    const user = await this.getUser(userId);
    const userBalance = user?.balance || '0';

    // Sum totalInvested for approved/active stock holdings
    let stocksValueResult;
    if (accountContext.isJointAccount) {
      stocksValueResult = await db
        .select({ total: sum(userStocks.totalInvested) })
        .from(userStocks)
        .where(
          and(
            or(
              eq(userStocks.userId, userId),
              eq(userStocks.jointAccountId, accountContext.accountId)
            ),
            or(
              eq(userStocks.status, 'approved'),
              eq(userStocks.status, 'active')
            )
          )
        );
    } else {
      stocksValueResult = await db
        .select({ total: sum(userStocks.totalInvested) })
        .from(userStocks)
        .where(
          and(
            eq(userStocks.userId, userId),
            or(
              eq(userStocks.status, 'approved'),
              eq(userStocks.status, 'active')
            )
          )
        );
    }

    return {
      totalPortfolioValue: portfolioValueResult[0]?.total || '0',
      activeBonds: activeBondsResult[0]?.total || '0',
      activeChallenges: activeChallengesResult[0]?.count || 0,
      availableBalance: userBalance,
      stocksValue: stocksValueResult[0]?.total || '0',
    };
  }

  // Admin Analytics operations
  async getAnalyticsData(): Promise<{
    totalRevenue: string;
    monthlyRevenue: string;
    totalInvestments: string;
    totalBondsValue: string;
    platformFees: string;
    transactionVolume: string;
    activePortfolios: number;
    completedChallenges: number;
  }> {
    // Handle demo mode with realistic mock data
    const demoMode = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
    if (demoMode) {
      return {
        totalRevenue: '285420.75',
        monthlyRevenue: '42380.50',
        totalInvestments: '1247850.00',
        totalBondsValue: '567890.25',
        platformFees: '18750.80',
        transactionVolume: '892450.30',
        activePortfolios: 8,
        completedChallenges: 15
      };
    }

    // In a real implementation, these would query actual transaction and investment data
    const totalInvestmentsResult = await db
      .select({ total: sum(userPortfolios.investedAmount) })
      .from(userPortfolios);

    const totalBondsValueResult = await db
      .select({ total: sum(userBonds.investedAmount) })
      .from(userBonds);

    const activePortfoliosResult = await db
      .select({ count: count() })
      .from(portfolios)
      .where(eq(portfolios.isActive, true));

    const completedChallengesResult = await db
      .select({ count: count() })
      .from(communityChallenges)
      .where(eq(communityChallenges.status, 'completed'));

    return {
      totalRevenue: '285420.75', // Mock - would calculate from transaction fees
      monthlyRevenue: '42380.50', // Mock - would calculate from current month
      totalInvestments: totalInvestmentsResult[0]?.total || '0',
      totalBondsValue: totalBondsValueResult[0]?.total || '0',
      platformFees: '18750.80', // Mock - would calculate from fee transactions
      transactionVolume: '892450.30', // Mock - would calculate from all transactions
      activePortfolios: activePortfoliosResult[0]?.count || 0,
      completedChallenges: completedChallengesResult[0]?.count || 0
    };
  }

  // System Health operations
  async getSystemHealth(): Promise<{
    uptime: string;
    apiResponseTime: string;
    databaseStatus: 'healthy' | 'warning' | 'error';
    activeConnections: number;
    errorRate: string;
    lastBackup: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Test database connection
      await db.select({ count: count() }).from(users).limit(1);
      const responseTime = Date.now() - startTime;
      
      // Calculate uptime (mock for demo)
      const uptimeHours = Math.floor(Date.now() / 1000 / 60 / 60) % 24;
      const uptime = `${uptimeHours}h 32m`;
      
      return {
        uptime,
        apiResponseTime: `${responseTime}ms`,
        databaseStatus: responseTime > 1000 ? 'warning' : 'healthy',
        activeConnections: Math.floor(Math.random() * 50) + 10, // Mock
        errorRate: '0.02%', // Mock
        lastBackup: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      };
    } catch (error) {
      return {
        uptime: 'Unknown',
        apiResponseTime: 'Timeout',
        databaseStatus: 'error',
        activeConnections: 0,
        errorRate: '100%',
        lastBackup: 'Failed'
      };
    }
  }

  // Activity Logs operations
  async getActivityLogs(limit: number, offset: number, type?: string): Promise<Array<{
    id: string;
    timestamp: Date;
    userId: string;
    userEmail: string;
    action: string;
    details: string;
    type: 'user' | 'admin' | 'system' | 'security';
    ipAddress?: string;
  }>> {
    // Handle demo mode with mock activity logs
    const demoMode = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
    if (demoMode) {
      const mockLogs = [
        {
          id: 'log-1',
          timestamp: new Date(Date.now() - 300000), // 5 minutes ago
          userId: 'demo-user',
          userEmail: 'demo@refluxcapital.com',
          action: 'Admin Dashboard Access',
          details: 'Accessed admin analytics dashboard',
          type: 'admin' as const,
          ipAddress: '192.168.1.100'
        },
        {
          id: 'log-2',
          timestamp: new Date(Date.now() - 900000), // 15 minutes ago
          userId: 'user-1',
          userEmail: 'john.doe@example.com',
          action: 'Portfolio Investment',
          details: 'Invested $1,500 in AI & Machine Learning portfolio',
          type: 'user' as const,
          ipAddress: '192.168.1.101'
        },
        {
          id: 'log-3',
          timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
          userId: 'user-2',
          userEmail: 'jane.smith@example.com',
          action: 'KYC Status Update',
          details: 'KYC verification completed successfully',
          type: 'security' as const,
          ipAddress: '192.168.1.102'
        },
        {
          id: 'log-4',
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          userId: 'system',
          userEmail: 'system@refluxcapital.com',
          action: 'Database Backup',
          details: 'Automated database backup completed',
          type: 'system' as const,
          ipAddress: '127.0.0.1'
        },
        {
          id: 'log-5',
          timestamp: new Date(Date.now() - 7200000), // 2 hours ago
          userId: 'user-3',
          userEmail: 'bob.wilson@example.com',
          action: 'Staking Plan Enrollment',
          details: 'Enrolled in 12-month premium staking plan with $5,000',
          type: 'user' as const,
          ipAddress: '192.168.1.103'
        }
      ];

      // Filter by type if specified
      const filteredLogs = type ? mockLogs.filter(log => log.type === type) : mockLogs;
      
      // Apply pagination
      return filteredLogs.slice(offset, offset + limit);
    }

    // In a real implementation, this would query an activity_logs table
    // For now, return empty array for production
    return [];
  }

  // Daily Bonus operations
  async createDailyBonus(userId: string, amount: string): Promise<DailyBonus> {
    const [bonus] = await db.insert(dailyBonuses).values({
      userId,
      amount,
      status: 'pending',
    }).returning();

    await db
      .update(users)
      .set({ 
        accumulatedDailyBonus: sql`COALESCE(${users.accumulatedDailyBonus}, '0')::numeric + ${amount}::numeric`,
        lastDailyRewardClaim: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    return bonus;
  }

  async getUserDailyBonuses(userId: string): Promise<DailyBonus[]> {
    return await db
      .select()
      .from(dailyBonuses)
      .where(eq(dailyBonuses.userId, userId))
      .orderBy(desc(dailyBonuses.claimedAt));
  }

  async getDailyBonusStats(userId: string): Promise<{
    totalClaimed: string;
    totalRedeemed: string;
    pending: string;
    lastClaimDate: Date | null;
  }> {
    const allBonuses = await this.getUserDailyBonuses(userId);
    
    const totalClaimed = allBonuses.reduce((sum, bonus) => {
      const amount = parseFloat(bonus.amount || '0');
      return (parseFloat(sum) + amount).toString();
    }, '0');

    const totalRedeemed = allBonuses
      .filter(b => b.status === 'redeemed')
      .reduce((sum, bonus) => {
        const amount = parseFloat(bonus.amount || '0');
        return (parseFloat(sum) + amount).toString();
      }, '0');

    const pending = allBonuses
      .filter(b => b.status === 'pending')
      .reduce((sum, bonus) => {
        const amount = parseFloat(bonus.amount || '0');
        return (parseFloat(sum) + amount).toString();
      }, '0');

    const lastClaimDate = allBonuses.length > 0 ? allBonuses[0].claimedAt : null;

    return {
      totalClaimed,
      totalRedeemed,
      pending,
      lastClaimDate,
    };
  }

  async redeemDailyBonuses(userId: string): Promise<{
    redeemedAmount: string;
    bonusCount: number;
    newBalance: string;
  }> {
    return await db.transaction(async (tx) => {
      const user = await tx.select().from(users).where(eq(users.id, userId)).then(r => r[0]);
      if (!user) {
        throw new Error('User not found');
      }

      const redemptionBatchId = `redemption-${Date.now()}-${userId}`;
      
      const result = await tx.execute<{
        balance: string;
        redeemed_amount: string;
        bonus_count: string;
      }>(
        sql`
          WITH locked_bonuses AS (
            SELECT * FROM ${dailyBonuses} 
            WHERE ${dailyBonuses.userId} = ${userId} 
            AND ${dailyBonuses.status} = 'pending' 
            FOR UPDATE
          ),
          updated_bonuses AS (
            UPDATE ${dailyBonuses}
            SET status = 'redeemed', 
                redeemed_at = NOW(),
                redemption_batch_id = ${redemptionBatchId}
            WHERE id IN (SELECT id FROM locked_bonuses)
            RETURNING *
          ),
          bonus_sum AS (
            SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total
            FROM updated_bonuses
          )
          UPDATE ${users}
          SET balance = CAST(COALESCE(balance, '0') AS NUMERIC) + (SELECT total FROM bonus_sum),
              accumulated_daily_bonus = '0',
              updated_at = NOW()
          WHERE id = ${userId}
          RETURNING balance, (SELECT total FROM bonus_sum) as redeemed_amount, 
                   (SELECT COUNT(*) FROM updated_bonuses) as bonus_count
        `
      );

      const row = result.rows[0];
      
      if (!row || parseFloat(row.redeemed_amount || '0') <= 0) {
        await tx
          .update(users)
          .set({
            accumulatedDailyBonus: '0',
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
        
        throw new Error('No pending bonuses found');
      }

      return {
        redeemedAmount: row.redeemed_amount || '0',
        bonusCount: Number(row.bonus_count) || 0,
        newBalance: row.balance || '0',
      };
    });
  }

  // Coupon operations
  async getCouponByCode(code: string): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase()));
    return coupon;
  }

  async redeemCoupon(userId: string, code: string): Promise<{
    rewardAmount: string;
    newBalance: string;
    description: string;
  }> {
    return await db.transaction(async (tx) => {
      // Get coupon
      const [coupon] = await tx.select().from(coupons).where(eq(coupons.code, code.toUpperCase()));
      
      if (!coupon) {
        throw new Error('Invalid coupon code');
      }

      // Validate coupon is active
      if (!coupon.isActive) {
        throw new Error('This coupon is no longer active');
      }

      // Check expiration
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        throw new Error('This coupon has expired');
      }

      // Check max uses
      if (coupon.maxUses && (coupon.currentUses || 0) >= coupon.maxUses) {
        throw new Error('This coupon has reached its maximum number of uses');
      }

      // Check user's previous redemptions
      const userRedemptions = await tx
        .select()
        .from(couponRedemptions)
        .where(and(
          eq(couponRedemptions.userId, userId),
          eq(couponRedemptions.couponId, coupon.id)
        ));

      if (userRedemptions.length >= (coupon.maxUsesPerUser || 1)) {
        throw new Error('You have already used this coupon the maximum number of times');
      }

      // Get user
      const [user] = await tx.select().from(users).where(eq(users.id, userId));
      if (!user) {
        throw new Error('User not found');
      }

      const rewardAmount = coupon.rewardAmount;
      const currentBalance = parseFloat(user.balance || '0');
      const newBalance = (currentBalance + parseFloat(rewardAmount)).toFixed(8);

      // Update user balance
      await tx
        .update(users)
        .set({ 
          balance: newBalance,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Create redemption record
      await tx.insert(couponRedemptions).values({
        userId,
        couponId: coupon.id,
        rewardAmount,
      });

      // Increment coupon usage
      await tx
        .update(coupons)
        .set({ 
          currentUses: sql`${coupons.currentUses} + 1`
        })
        .where(eq(coupons.id, coupon.id));

      return {
        rewardAmount,
        newBalance,
        description: coupon.description || 'Coupon redeemed successfully',
      };
    });
  }

  async getUserCouponRedemptions(userId: string): Promise<CouponRedemption[]> {
    return await db
      .select()
      .from(couponRedemptions)
      .where(eq(couponRedemptions.userId, userId))
      .orderBy(desc(couponRedemptions.redeemedAt));
  }

  // Admin Coupon Management
  async getAllCoupons(): Promise<Coupon[]> {
    return await db
      .select()
      .from(coupons)
      .orderBy(desc(coupons.createdAt));
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const [newCoupon] = await db.insert(coupons).values({
      ...coupon,
      code: coupon.code.toUpperCase(),
    }).returning();
    return newCoupon;
  }

  async updateCoupon(id: string, coupon: Partial<InsertCoupon>): Promise<Coupon> {
    const updateData = { ...coupon };
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }
    
    const [updated] = await db
      .update(coupons)
      .set(updateData)
      .where(eq(coupons.id, id))
      .returning();
    
    if (!updated) {
      throw new Error('Coupon not found');
    }
    
    return updated;
  }

  async deleteCoupon(id: string): Promise<void> {
    await db.delete(coupons).where(eq(coupons.id, id));
  }

  // XP operations
  async claimDailyXp(userId: string): Promise<{
    xpAmount: number;
    newXpBalance: number;
  }> {
    const xpAmount = 50; // Daily XP reward
    
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user already claimed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (user.lastXpClaim) {
      const lastClaim = new Date(user.lastXpClaim);
      lastClaim.setHours(0, 0, 0, 0);
      
      if (lastClaim.getTime() === today.getTime()) {
        throw new Error('You have already claimed your daily XP today');
      }
    }

    // Create XP claim record
    await db.insert(xpClaims).values({
      userId,
      xpAmount,
    });

    // Update user's XP balance
    const newXpBalance = (user.xpBalance || 0) + xpAmount;
    await db
      .update(users)
      .set({
        xpBalance: newXpBalance,
        lastXpClaim: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return {
      xpAmount,
      newXpBalance,
    };
  }

  async convertXpToCash(userId: string, xpAmount: number): Promise<{
    convertedAmount: string;
    newBalance: string;
    newXpBalance: number;
  }> {
    // Get conversion rate from settings
    const setting = await this.getSetting('xp_conversion_rate');
    const conversionRate = setting ? parseFloat(setting.settingValue) : 0.01; // Default: 1 XP = $0.01

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('User not found');
    }

    if ((user.xpBalance || 0) < xpAmount) {
      throw new Error('Insufficient XP balance');
    }

    const convertedAmount = (xpAmount * conversionRate).toFixed(8);
    const currentBalance = parseFloat(user.balance || '0');
    const newBalance = (currentBalance + parseFloat(convertedAmount)).toFixed(8);
    const newXpBalance = (user.xpBalance || 0) - xpAmount;

    await db
      .update(users)
      .set({
        balance: newBalance,
        xpBalance: newXpBalance,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return {
      convertedAmount,
      newBalance,
      newXpBalance,
    };
  }

  async getUserXpClaims(userId: string): Promise<XpClaim[]> {
    return await db
      .select()
      .from(xpClaims)
      .where(eq(xpClaims.userId, userId))
      .orderBy(desc(xpClaims.claimedAt));
  }

  // System Settings
  async getSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, key));
    return setting;
  }

  async setSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    const existing = await this.getSetting(setting.settingKey);
    
    if (existing) {
      const [updated] = await db
        .update(systemSettings)
        .set({
          settingValue: setting.settingValue,
          description: setting.description,
          updatedBy: setting.updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.settingKey, setting.settingKey))
        .returning();
      return updated;
    } else {
      const [newSetting] = await db
        .insert(systemSettings)
        .values(setting)
        .returning();
      return newSetting;
    }
  }

  async getAllSettings(): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings);
  }

  // Password Reset operations
  async setPasswordResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpiry: expiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, token),
          sql`${users.passwordResetExpiry} > NOW()`
        )
      );
    return user;
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        passwordResetToken: null,
        passwordResetExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Deposit operations
  async createDeposit(deposit: InsertDeposit, createdAt?: Date): Promise<Deposit> {
    const values: any = { ...deposit };
    if (createdAt) values.createdAt = createdAt;
    const [newDeposit] = await db.insert(deposits).values(values).returning();
    return newDeposit;
  }

  async getUserDeposits(userId: string): Promise<Deposit[]> {
    return await db.select().from(deposits)
      .where(eq(deposits.userId, userId))
      .orderBy(desc(deposits.createdAt));
  }

  async updateDepositStatus(
    id: string,
    status: 'pending' | 'completed' | 'failed',
    transactionId?: string
  ): Promise<Deposit> {
    const updateData: any = {
      status,
      completedAt: status === 'completed' ? new Date() : null,
    };
    
    if (transactionId) {
      updateData.transactionId = transactionId;
    }

    const [updated] = await db.update(deposits)
      .set(updateData)
      .where(eq(deposits.id, id))
      .returning();
    
    return updated;
  }

  async processCryptoDeposit(userId: string, amount: string, cryptoAddress: string): Promise<Deposit> {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0 || numericAmount > 1000000) {
      throw new Error('Invalid deposit amount. Must be between $0.01 and $1,000,000');
    }

    const deposit = await this.createDeposit({
      userId,
      amount,
      depositMethod: 'crypto',
      status: 'pending',
      metadata: { cryptoAddress },
    });

    return deposit;
  }

  async processBankTransferDeposit(userId: string, amount: string, bankDetails: any): Promise<Deposit> {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0 || numericAmount > 1000000) {
      throw new Error('Invalid deposit amount. Must be between $0.01 and $1,000,000');
    }

    const deposit = await this.createDeposit({
      userId,
      amount,
      depositMethod: 'bank_transfer',
      status: 'pending',
      metadata: { bankDetails },
    });

    return deposit;
  }

  async processCardPaymentDeposit(userId: string, amount: string, stripeTransactionId: string): Promise<Deposit> {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0 || numericAmount > 1000000) {
      throw new Error('Invalid deposit amount. Must be between $0.01 and $1,000,000');
    }

    if (!stripeTransactionId || stripeTransactionId.trim().length === 0) {
      throw new Error('Valid Stripe transaction ID is required');
    }

    const deposit = await this.createDeposit({
      userId,
      amount,
      depositMethod: 'card_payment',
      status: 'pending',
      transactionId: stripeTransactionId,
    });

    return deposit;
  }

  async processDepositCouponDeposit(userId: string, couponCode: string): Promise<Deposit> {
    const couponResult = await this.redeemCoupon(userId, couponCode);
    
    const deposit = await this.createDeposit({
      userId,
      amount: couponResult.rewardAmount,
      depositMethod: 'deposit_coupon',
      status: 'completed',
      couponCode,
      metadata: { description: couponResult.description },
    });

    return deposit;
  }

  async approveDeposit(depositId: string, adminId: string): Promise<Deposit> {
    const [deposit] = await db.select().from(deposits).where(eq(deposits.id, depositId));
    
    if (!deposit) {
      throw new Error('Deposit not found');
    }

    if (deposit.status !== 'pending') {
      throw new Error('Only pending deposits can be approved');
    }

    const numericAmount = parseFloat(deposit.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Invalid deposit amount');
    }

    await db.update(users)
      .set({ 
        balance: sql`${users.balance} + ${deposit.amount}`,
        updatedAt: new Date() 
      })
      .where(eq(users.id, deposit.userId));

    const [updated] = await db.update(deposits)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(deposits.id, depositId))
      .returning();

    return updated;
  }

  async rejectDeposit(depositId: string, adminId: string): Promise<Deposit> {
    const [deposit] = await db.select().from(deposits).where(eq(deposits.id, depositId));
    
    if (!deposit) {
      throw new Error('Deposit not found');
    }

    if (deposit.status !== 'pending') {
      throw new Error('Only pending deposits can be rejected');
    }

    const [updated] = await db.update(deposits)
      .set({
        status: 'failed',
        completedAt: new Date(),
      })
      .where(eq(deposits.id, depositId))
      .returning();

    return updated;
  }

  async getAllDeposits(): Promise<(Deposit & { user: { email: string; firstName: string; lastName: string } })[]> {
    const result = await db.select({
      id: deposits.id,
      userId: deposits.userId,
      amount: deposits.amount,
      depositMethod: deposits.depositMethod,
      status: deposits.status,
      transactionId: deposits.transactionId,
      couponCode: deposits.couponCode,
      metadata: deposits.metadata,
      createdAt: deposits.createdAt,
      completedAt: deposits.completedAt,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
    .from(deposits)
    .leftJoin(users, eq(deposits.userId, users.id))
    .orderBy(desc(deposits.createdAt));

    return result.map(row => ({
      id: row.id,
      userId: row.userId,
      amount: row.amount,
      depositMethod: row.depositMethod,
      status: row.status,
      transactionId: row.transactionId,
      couponCode: row.couponCode,
      metadata: row.metadata,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
      user: {
        email: row.userEmail || '',
        firstName: row.userFirstName || '',
        lastName: row.userLastName || '',
      },
    }));
  }

  // Withdrawal operations
  async createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal> {
    const [newWithdrawal] = await db.insert(withdrawals).values(withdrawal).returning();
    return newWithdrawal;
  }

  async getUserWithdrawals(userId: string): Promise<Withdrawal[]> {
    return await db.select().from(withdrawals)
      .where(eq(withdrawals.userId, userId))
      .orderBy(desc(withdrawals.createdAt));
  }

  async processWithdrawal(
    userId: string,
    amount: string,
    withdrawMethod: 'crypto' | 'wire_transfer' | 'merchant_pay',
    destinationAddress: string,
    metadata?: any
  ): Promise<Withdrawal> {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0 || numericAmount > 1000000) {
      throw new Error('Invalid withdrawal amount. Must be between $0.01 and $1,000,000');
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('User not found');
    }

    const userBalance = parseFloat(user.balance || '0');
    if (userBalance < numericAmount) {
      throw new Error('Insufficient balance');
    }

    await db.update(users)
      .set({ 
        balance: sql`${users.balance} - ${amount}`,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));

    const withdrawal = await this.createWithdrawal({
      userId,
      amount,
      withdrawMethod,
      destinationAddress,
      status: 'pending',
      metadata,
    });

    return withdrawal;
  }

  async approveWithdrawal(withdrawalId: string, adminId: string): Promise<Withdrawal> {
    const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, withdrawalId));
    
    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    if (withdrawal.status !== 'pending') {
      throw new Error('Only pending withdrawals can be approved. Current status: ' + withdrawal.status);
    }

    const [updated] = await db.update(withdrawals)
      .set({
        status: 'completed',
        processedAt: new Date(),
      })
      .where(and(
        eq(withdrawals.id, withdrawalId),
        eq(withdrawals.status, 'pending')
      ))
      .returning();

    if (!updated) {
      throw new Error('Failed to approve withdrawal - status may have changed');
    }

    return updated;
  }

  async rejectWithdrawal(withdrawalId: string, adminId: string): Promise<Withdrawal> {
    const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, withdrawalId));
    
    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    if (withdrawal.status !== 'pending') {
      throw new Error('Only pending withdrawals can be rejected');
    }

    await db.update(users)
      .set({ 
        balance: sql`${users.balance} + ${withdrawal.amount}`,
        updatedAt: new Date() 
      })
      .where(eq(users.id, withdrawal.userId));

    const [updated] = await db.update(withdrawals)
      .set({
        status: 'rejected',
        processedAt: new Date(),
      })
      .where(eq(withdrawals.id, withdrawalId))
      .returning();

    return updated;
  }

  async cancelDeposit(depositId: string, adminId: string): Promise<Deposit> {
    const [deposit] = await db.select().from(deposits).where(eq(deposits.id, depositId));
    
    if (!deposit) {
      throw new Error('Deposit not found');
    }

    if (deposit.status !== 'pending') {
      throw new Error('Only pending deposits can be cancelled');
    }

    const [updated] = await db.update(deposits)
      .set({
        status: 'cancelled',
        completedAt: new Date(),
      })
      .where(eq(deposits.id, depositId))
      .returning();

    return updated;
  }

  async cancelWithdrawal(withdrawalId: string, adminId: string): Promise<Withdrawal> {
    const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, withdrawalId));
    
    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    if (withdrawal.status !== 'pending') {
      throw new Error('Only pending withdrawals can be cancelled');
    }

    await db.update(users)
      .set({ 
        balance: sql`${users.balance} + ${withdrawal.amount}`,
        updatedAt: new Date() 
      })
      .where(eq(users.id, withdrawal.userId));

    const [updated] = await db.update(withdrawals)
      .set({
        status: 'cancelled',
        processedAt: new Date(),
      })
      .where(eq(withdrawals.id, withdrawalId))
      .returning();

    return updated;
  }

  async getAllWithdrawals(): Promise<(Withdrawal & { user: { email: string; firstName: string; lastName: string } })[]> {
    const result = await db.select({
      id: withdrawals.id,
      userId: withdrawals.userId,
      amount: withdrawals.amount,
      withdrawMethod: withdrawals.withdrawMethod,
      status: withdrawals.status,
      destinationAddress: withdrawals.destinationAddress,
      metadata: withdrawals.metadata,
      createdAt: withdrawals.createdAt,
      processedAt: withdrawals.processedAt,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
    .from(withdrawals)
    .leftJoin(users, eq(withdrawals.userId, users.id))
    .orderBy(desc(withdrawals.createdAt));

    return result.map(row => ({
      id: row.id,
      userId: row.userId,
      amount: row.amount,
      withdrawMethod: row.withdrawMethod,
      status: row.status,
      destinationAddress: row.destinationAddress,
      metadata: row.metadata,
      createdAt: row.createdAt,
      processedAt: row.processedAt,
      user: {
        email: row.userEmail || '',
        firstName: row.userFirstName || '',
        lastName: row.userLastName || '',
      },
    }));
  }

  // Login History operations
  async recordLogin(data: InsertLoginHistory): Promise<LoginHistory> {
    const [record] = await db.insert(loginHistory).values(data).returning();
    return record;
  }

  async getUserLoginHistory(userId: string): Promise<LoginHistory[]> {
    return await db.select()
      .from(loginHistory)
      .where(eq(loginHistory.userId, userId))
      .orderBy(desc(loginHistory.loginAt));
  }

  async getAllLoginHistory(): Promise<(LoginHistory & { user: { email: string; firstName: string; lastName: string } })[]> {
    const result = await db.select({
      id: loginHistory.id,
      userId: loginHistory.userId,
      loginMethod: loginHistory.loginMethod,
      ipAddress: loginHistory.ipAddress,
      userAgent: loginHistory.userAgent,
      loginAt: loginHistory.loginAt,
      success: loginHistory.success,
      failureReason: loginHistory.failureReason,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
    })
    .from(loginHistory)
    .leftJoin(users, eq(loginHistory.userId, users.id))
    .orderBy(desc(loginHistory.loginAt))
    .limit(500);

    return result.map(row => ({
      id: row.id,
      userId: row.userId,
      loginMethod: row.loginMethod,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      loginAt: row.loginAt,
      success: row.success,
      failureReason: row.failureReason,
      user: {
        email: row.userEmail || '',
        firstName: row.userFirstName || '',
        lastName: row.userLastName || '',
      },
    }));
  }

  // Scheduled Email operations
  async createScheduledEmail(
    userId: string, 
    emailType: string, 
    recipientEmail: string, 
    recipientFirstName: string | null, 
    scheduledFor: Date
  ): Promise<void> {
    await db.insert(scheduledEmails).values({
      userId,
      emailType: emailType as any,
      recipientEmail,
      recipientFirstName,
      scheduledFor,
      status: 'pending',
    });
  }

  async getPendingScheduledEmails(): Promise<Array<{
    id: string;
    userId: string;
    emailType: string;
    recipientEmail: string;
    recipientFirstName: string | null;
    scheduledFor: Date;
  }>> {
    const now = new Date();
    const result = await db.select({
      id: scheduledEmails.id,
      userId: scheduledEmails.userId,
      emailType: scheduledEmails.emailType,
      recipientEmail: scheduledEmails.recipientEmail,
      recipientFirstName: scheduledEmails.recipientFirstName,
      scheduledFor: scheduledEmails.scheduledFor,
    })
    .from(scheduledEmails)
    .where(
      and(
        eq(scheduledEmails.status, 'pending'),
        sql`${scheduledEmails.scheduledFor} <= ${now}`
      )
    );
    return result;
  }

  async markScheduledEmailSent(id: string): Promise<void> {
    await db.update(scheduledEmails)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(scheduledEmails.id, id));
  }

  async markScheduledEmailFailed(id: string, errorMessage: string): Promise<void> {
    await db.update(scheduledEmails)
      .set({ status: 'failed', errorMessage })
      .where(eq(scheduledEmails.id, id));
  }
}

export const storage = new DatabaseStorage();
