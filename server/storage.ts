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
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
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
}

export const storage = new DatabaseStorage();
