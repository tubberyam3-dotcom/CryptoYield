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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sum, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (supports both OAuth and password auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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
  
  // Helper method to get account context (individual or joint)
  getAccountContext(userId: string): Promise<{
    isJointAccount: boolean;
    accountId: string;
    jointAccount?: JointAccount;
  }>;
  
  // Admin User Management operations
  getAllUsers(): Promise<User[]>;
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
  
  // Bond operations
  getBondProducts(): Promise<BondProduct[]>;
  getBondProduct(id: string): Promise<BondProduct | undefined>;
  createBondProduct(product: InsertBondProduct): Promise<BondProduct>;
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
  
  // Analytics
  getDashboardStats(userId: string): Promise<{
    totalPortfolioValue: string;
    activeBonds: string;
    activeChallenges: number;
    availableBalance: string;
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
        balance: '10000',
        role: 'admin',
        kycStatus: 'approved',
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

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
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
    const [jointAccount] = await db.select().from(jointAccounts).where(eq(jointAccounts.joinCode, joinCode));
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
    // Find the joint account by join code
    const [jointAccount] = await db
      .select()
      .from(jointAccounts)
      .where(eq(jointAccounts.joinCode, joinCode));

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
      return [
        {
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
          balance: '10000',
          role: 'admin',
          kycStatus: 'approved',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date()
        },
        {
          id: 'user-1',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          profileImageUrl: null,
          passwordHash: null,
          authType: 'oauth' as const,
          accountType: 'personal',
          businessName: null,
          businessType: null,
          taxId: null,
          balance: '10000',
          role: 'user',
          kycStatus: 'approved',
          createdAt: new Date('2024-02-20'),
          updatedAt: new Date()
        },
        {
          id: 'user-2',
          email: 'jane.smith@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          profileImageUrl: null,
          passwordHash: null,
          authType: 'oauth' as const,
          accountType: 'personal',
          businessName: null,
          businessType: null,
          taxId: null,
          balance: '10000',
          role: 'user',
          kycStatus: 'pending',
          createdAt: new Date('2024-03-10'),
          updatedAt: new Date()
        },
        {
          id: 'user-3',
          email: 'bob.wilson@example.com',
          firstName: 'Bob',
          lastName: 'Wilson',
          profileImageUrl: null,
          passwordHash: null,
          authType: 'oauth' as const,
          accountType: 'personal',
          businessName: null,
          businessType: null,
          taxId: null,
          balance: '10000',
          role: 'user',
          kycStatus: 'rejected',
          createdAt: new Date('2024-03-25'),
          updatedAt: new Date()
        }
      ];
    }
    
    return await db.select().from(users).orderBy(desc(users.createdAt));
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
    const [user] = await db
      .update(users)
      .set({ balance: newBalance, updatedAt: new Date() })
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

    return {
      totalPortfolioValue: portfolioValueResult[0]?.total || '0',
      activeBonds: activeBondsResult[0]?.total || '0',
      activeChallenges: activeChallengesResult[0]?.count || 0,
      availableBalance: '15720.48', // Mock for now - would be calculated from external wallet APIs
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
}

export const storage = new DatabaseStorage();
