import {
  users,
  portfolios,
  userPortfolios,
  stakingPlans,
  userStaking,
  communityChallenges,
  challengeMembers,
  type User,
  type UpsertUser,
  type Portfolio,
  type InsertPortfolio,
  type UserPortfolio,
  type InsertUserPortfolio,
  type StakingPlan,
  type InsertStakingPlan,
  type UserStaking,
  type InsertUserStaking,
  type CommunityChallenge,
  type InsertCommunityChallenge,
  type ChallengeMember,
  type InsertChallengeMember,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sum, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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
  
  // Staking operations
  getStakingPlans(): Promise<StakingPlan[]>;
  getStakingPlan(id: string): Promise<StakingPlan | undefined>;
  createStakingPlan(plan: InsertStakingPlan): Promise<StakingPlan>;
  getUserStaking(userId: string): Promise<(UserStaking & { stakingPlan: StakingPlan })[]>;
  createUserStaking(userStaking: InsertUserStaking): Promise<UserStaking>;
  
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
    activeStakes: string;
    activeChallenges: number;
    availableBalance: string;
  }>;

  // Admin Analytics operations
  getAnalyticsData(): Promise<{
    totalRevenue: string;
    monthlyRevenue: string;
    totalInvestments: string;
    totalStaked: string;
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

  // Admin Investment Management operations
  getAllUserStaking(): Promise<(UserStaking & { stakingPlan: StakingPlan; user: User })[]>;
  updateUserStakingStatus(stakingId: string, status: 'active' | 'completed' | 'cancelled'): Promise<UserStaking>;
  getAllUserPortfolios(): Promise<(UserPortfolio & { portfolio: Portfolio; user: User })[]>;
  updateUserPortfolioAdmin(portfolioId: string, updates: Partial<InsertUserPortfolio>): Promise<UserPortfolio>;

  // Admin Challenge Management operations
  updateCommunityChallenge(challengeId: string, updates: Partial<InsertCommunityChallenge>): Promise<CommunityChallenge>;
  deleteCommunityChallenge(challengeId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    // Handle demo user in development
    const demoMode = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
    if (demoMode && id === 'demo-user') {
      return {
        id: 'demo-user',
        email: 'demo@cryptovault.com',
        firstName: 'Demo',
        lastName: 'Admin',
        profileImageUrl: null,
        role: 'admin',
        kycStatus: 'approved',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    const [user] = await db.select().from(users).where(eq(users.id, id));
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

  // Admin User Management operations
  async getAllUsers(): Promise<User[]> {
    // Handle demo mode
    const demoMode = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
    if (demoMode) {
      return [
        {
          id: 'demo-user',
          email: 'demo@cryptovault.com',
          firstName: 'Demo',
          lastName: 'Admin',
          profileImageUrl: null,
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

  // Staking operations
  async getStakingPlans(): Promise<StakingPlan[]> {
    return await db.select().from(stakingPlans).where(eq(stakingPlans.isActive, true));
  }

  async getStakingPlan(id: string): Promise<StakingPlan | undefined> {
    const [plan] = await db.select().from(stakingPlans).where(eq(stakingPlans.id, id));
    return plan;
  }

  async createStakingPlan(plan: InsertStakingPlan): Promise<StakingPlan> {
    const [newPlan] = await db.insert(stakingPlans).values(plan).returning();
    return newPlan;
  }

  async getUserStaking(userId: string): Promise<(UserStaking & { stakingPlan: StakingPlan })[]> {
    return await db
      .select()
      .from(userStaking)
      .leftJoin(stakingPlans, eq(userStaking.stakingPlanId, stakingPlans.id))
      .where(eq(userStaking.userId, userId))
      .then(rows => rows.map(row => ({
        ...row.user_staking,
        stakingPlan: row.staking_plans!
      })));
  }

  async createUserStaking(userStakingData: InsertUserStaking): Promise<UserStaking> {
    const [newStaking] = await db.insert(userStaking).values(userStakingData).returning();
    return newStaking;
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
    activeStakes: string;
    activeChallenges: number;
    availableBalance: string;
  }> {
    // Calculate total portfolio value
    const portfolioValueResult = await db
      .select({ total: sum(userPortfolios.currentValue) })
      .from(userPortfolios)
      .where(eq(userPortfolios.userId, userId));

    // Calculate active stakes value
    const activeStakesResult = await db
      .select({ total: sum(userStaking.amountLocked) })
      .from(userStaking)
      .where(and(eq(userStaking.userId, userId), eq(userStaking.status, 'active')));

    // Count active challenges
    const activeChallengesResult = await db
      .select({ count: count() })
      .from(challengeMembers)
      .leftJoin(communityChallenges, eq(challengeMembers.challengeId, communityChallenges.id))
      .where(
        and(
          eq(challengeMembers.userId, userId),
          eq(communityChallenges.status, 'active')
        )
      );

    return {
      totalPortfolioValue: portfolioValueResult[0]?.total || '0',
      activeStakes: activeStakesResult[0]?.total || '0',
      activeChallenges: activeChallengesResult[0]?.count || 0,
      availableBalance: '15720.48', // Mock for now - would be calculated from external wallet APIs
    };
  }

  // Admin Analytics operations
  async getAnalyticsData(): Promise<{
    totalRevenue: string;
    monthlyRevenue: string;
    totalInvestments: string;
    totalStaked: string;
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
        totalStaked: '567890.25',
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

    const totalStakedResult = await db
      .select({ total: sum(userStaking.amountLocked) })
      .from(userStaking);

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
      totalStaked: totalStakedResult[0]?.total || '0',
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
          userEmail: 'demo@cryptovault.com',
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
          userEmail: 'system@cryptovault.com',
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

  // Admin Investment Management operations
  async getAllUserStaking(): Promise<(UserStaking & { stakingPlan: StakingPlan; user: User })[]> {
    const result = await db
      .select()
      .from(userStaking)
      .leftJoin(stakingPlans, eq(userStaking.stakingPlanId, stakingPlans.id))
      .leftJoin(users, eq(userStaking.userId, users.id))
      .orderBy(desc(userStaking.createdAt));

    return result.map(row => ({
      ...row.user_staking,
      stakingPlan: row.staking_plans!,
      user: row.users!
    }));
  }

  async updateUserStakingStatus(stakingId: string, status: 'active' | 'completed' | 'cancelled'): Promise<UserStaking> {
    const [updated] = await db
      .update(userStaking)
      .set({ 
        status
      })
      .where(eq(userStaking.id, stakingId))
      .returning();

    return updated;
  }

  async getAllUserPortfolios(): Promise<(UserPortfolio & { portfolio: Portfolio; user: User })[]> {
    const result = await db
      .select()
      .from(userPortfolios)
      .leftJoin(portfolios, eq(userPortfolios.portfolioId, portfolios.id))
      .leftJoin(users, eq(userPortfolios.userId, users.id))
      .orderBy(desc(userPortfolios.createdAt));

    return result.map(row => ({
      ...row.user_portfolios,
      portfolio: row.portfolios!,
      user: row.users!
    }));
  }

  async updateUserPortfolioAdmin(portfolioId: string, updates: Partial<InsertUserPortfolio>): Promise<UserPortfolio> {
    const [updated] = await db
      .update(userPortfolios)
      .set(updates)
      .where(eq(userPortfolios.id, portfolioId))
      .returning();

    return updated;
  }

  // Admin Challenge Management operations
  async updateCommunityChallenge(challengeId: string, updates: Partial<InsertCommunityChallenge>): Promise<CommunityChallenge> {
    const [updated] = await db
      .update(communityChallenges)
      .set(updates)
      .where(eq(communityChallenges.id, challengeId))
      .returning();

    return updated;
  }

  async deleteCommunityChallenge(challengeId: string): Promise<void> {
    // First delete all challenge members
    await db
      .delete(challengeMembers)
      .where(eq(challengeMembers.challengeId, challengeId));

    // Then delete the challenge
    await db
      .delete(communityChallenges)
      .where(eq(communityChallenges.id, challengeId));
  }
}

export const storage = new DatabaseStorage();
