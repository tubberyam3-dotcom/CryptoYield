import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  decimal,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  kycStatus: varchar("kyc_status", { enum: ['pending', 'approved', 'rejected'] }).default('pending'),
  role: varchar("role", { enum: ['user', 'admin'] }).default('user'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Joint Accounts table for couples
export const jointAccounts = pgTable("joint_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // e.g., "John & Jane's Account"
  description: text("description"),
  kycStatus: varchar("kyc_status", { enum: ['pending', 'approved', 'rejected'] }).default('pending'),
  joinCode: varchar("join_code").unique(), // Code for partner to join
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mapping table for users to joint accounts
export const userJointAccounts = pgTable("user_joint_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  jointAccountId: varchar("joint_account_id").references(() => jointAccounts.id).notNull(),
  role: varchar("role", { enum: ['primary', 'partner'] }).notNull(), // primary created the account, partner joined
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  strategyTag: varchar("strategy_tag"),
  assets: jsonb("assets").notNull(),
  minInvestment: decimal("min_investment", { precision: 18, scale: 8 }).notNull(),
  riskLevel: varchar("risk_level", { enum: ['low', 'medium', 'high'] }).notNull(),
  currentReturn: decimal("current_return", { precision: 5, scale: 2 }).default('0'),
  createdBy: varchar("created_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userPortfolios = pgTable("user_portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  jointAccountId: varchar("joint_account_id").references(() => jointAccounts.id),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id).notNull(),
  investedAmount: decimal("invested_amount", { precision: 18, scale: 8 }).notNull(),
  currentValue: decimal("current_value", { precision: 18, scale: 8 }).notNull(),
  returns: decimal("returns", { precision: 18, scale: 8 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stakingPlans = pgTable("staking_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  duration: integer("duration").notNull(), // in months
  apy: decimal("apy", { precision: 5, scale: 2 }).notNull(),
  minAmount: decimal("min_amount", { precision: 18, scale: 8 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userStaking = pgTable("user_staking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  jointAccountId: varchar("joint_account_id").references(() => jointAccounts.id),
  stakingPlanId: varchar("staking_plan_id").references(() => stakingPlans.id).notNull(),
  amountLocked: decimal("amount_locked", { precision: 18, scale: 8 }).notNull(),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date").notNull(),
  status: varchar("status", { enum: ['active', 'completed', 'cancelled'] }).default('active'),
  estimatedRewards: decimal("estimated_rewards", { precision: 18, scale: 8 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communityChallenges = pgTable("community_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  targetAmount: decimal("target_amount", { precision: 18, scale: 8 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 18, scale: 8 }).default('0'),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date").notNull(),
  type: varchar("type", { enum: ['solo', 'group'] }).notNull(),
  reward: varchar("reward"),
  status: varchar("status", { enum: ['active', 'completed', 'expired'] }).default('active'),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const challengeMembers = pgTable("challenge_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  jointAccountId: varchar("joint_account_id").references(() => jointAccounts.id),
  challengeId: varchar("challenge_id").references(() => communityChallenges.id).notNull(),
  contributedAmount: decimal("contributed_amount", { precision: 18, scale: 8 }).default('0'),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  portfolios: many(userPortfolios),
  stakings: many(userStaking),
  challengeMembers: many(challengeMembers),
  jointAccounts: many(userJointAccounts),
  createdJointAccounts: many(jointAccounts),
}));

export const jointAccountsRelations = relations(jointAccounts, ({ one, many }) => ({
  creator: one(users, { fields: [jointAccounts.createdBy], references: [users.id] }),
  members: many(userJointAccounts),
  portfolios: many(userPortfolios),
  stakings: many(userStaking),
  challengeMembers: many(challengeMembers),
}));

export const userJointAccountsRelations = relations(userJointAccounts, ({ one }) => ({
  user: one(users, { fields: [userJointAccounts.userId], references: [users.id] }),
  jointAccount: one(jointAccounts, { fields: [userJointAccounts.jointAccountId], references: [jointAccounts.id] }),
}));

export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
  creator: one(users, { fields: [portfolios.createdBy], references: [users.id] }),
  userPortfolios: many(userPortfolios),
}));

export const userPortfoliosRelations = relations(userPortfolios, ({ one }) => ({
  user: one(users, { fields: [userPortfolios.userId], references: [users.id] }),
  jointAccount: one(jointAccounts, { fields: [userPortfolios.jointAccountId], references: [jointAccounts.id] }),
  portfolio: one(portfolios, { fields: [userPortfolios.portfolioId], references: [portfolios.id] }),
}));

export const stakingPlansRelations = relations(stakingPlans, ({ many }) => ({
  userStakings: many(userStaking),
}));

export const userStakingRelations = relations(userStaking, ({ one }) => ({
  user: one(users, { fields: [userStaking.userId], references: [users.id] }),
  jointAccount: one(jointAccounts, { fields: [userStaking.jointAccountId], references: [jointAccounts.id] }),
  stakingPlan: one(stakingPlans, { fields: [userStaking.stakingPlanId], references: [stakingPlans.id] }),
}));

export const communityChallengesRelations = relations(communityChallenges, ({ one, many }) => ({
  creator: one(users, { fields: [communityChallenges.createdBy], references: [users.id] }),
  members: many(challengeMembers),
}));

export const challengeMembersRelations = relations(challengeMembers, ({ one }) => ({
  user: one(users, { fields: [challengeMembers.userId], references: [users.id] }),
  jointAccount: one(jointAccounts, { fields: [challengeMembers.jointAccountId], references: [jointAccounts.id] }),
  challenge: one(communityChallenges, { fields: [challengeMembers.challengeId], references: [communityChallenges.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPortfolioSchema = createInsertSchema(portfolios).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserPortfolioSchema = createInsertSchema(userPortfolios).omit({
  id: true,
  createdAt: true,
});

export const insertStakingPlanSchema = createInsertSchema(stakingPlans).omit({
  id: true,
  createdAt: true,
});

export const insertUserStakingSchema = createInsertSchema(userStaking).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityChalllengeSchema = createInsertSchema(communityChallenges).omit({
  id: true,
  createdAt: true,
});

export const insertChallengeMemberSchema = createInsertSchema(challengeMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertJointAccountSchema = createInsertSchema(jointAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserJointAccountSchema = createInsertSchema(userJointAccounts).omit({
  id: true,
  joinedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type UserPortfolio = typeof userPortfolios.$inferSelect;
export type InsertUserPortfolio = z.infer<typeof insertUserPortfolioSchema>;
export type StakingPlan = typeof stakingPlans.$inferSelect;
export type InsertStakingPlan = z.infer<typeof insertStakingPlanSchema>;
export type UserStaking = typeof userStaking.$inferSelect;
export type InsertUserStaking = z.infer<typeof insertUserStakingSchema>;
export type CommunityChallenge = typeof communityChallenges.$inferSelect;
export type InsertCommunityChallenge = z.infer<typeof insertCommunityChalllengeSchema>;
export type ChallengeMember = typeof challengeMembers.$inferSelect;
export type InsertChallengeMember = z.infer<typeof insertChallengeMemberSchema>;
export type JointAccount = typeof jointAccounts.$inferSelect;
export type InsertJointAccount = z.infer<typeof insertJointAccountSchema>;
export type UserJointAccount = typeof userJointAccounts.$inferSelect;
export type InsertUserJointAccount = z.infer<typeof insertUserJointAccountSchema>;
