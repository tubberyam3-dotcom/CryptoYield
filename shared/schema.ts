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
  userId: varchar("user_id").references(() => users.id).notNull(),
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
  userId: varchar("user_id").references(() => users.id).notNull(),
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
  userId: varchar("user_id").references(() => users.id).notNull(),
  challengeId: varchar("challenge_id").references(() => communityChallenges.id).notNull(),
  contributedAmount: decimal("contributed_amount", { precision: 18, scale: 8 }).default('0'),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  portfolios: many(userPortfolios),
  stakings: many(userStaking),
  challengeMembers: many(challengeMembers),
}));

export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
  creator: one(users, { fields: [portfolios.createdBy], references: [users.id] }),
  userPortfolios: many(userPortfolios),
}));

export const userPortfoliosRelations = relations(userPortfolios, ({ one }) => ({
  user: one(users, { fields: [userPortfolios.userId], references: [users.id] }),
  portfolio: one(portfolios, { fields: [userPortfolios.portfolioId], references: [portfolios.id] }),
}));

export const stakingPlansRelations = relations(stakingPlans, ({ many }) => ({
  userStakings: many(userStaking),
}));

export const userStakingRelations = relations(userStaking, ({ one }) => ({
  user: one(users, { fields: [userStaking.userId], references: [users.id] }),
  stakingPlan: one(stakingPlans, { fields: [userStaking.stakingPlanId], references: [stakingPlans.id] }),
}));

export const communityChallengesRelations = relations(communityChallenges, ({ one, many }) => ({
  creator: one(users, { fields: [communityChallenges.createdBy], references: [users.id] }),
  members: many(challengeMembers),
}));

export const challengeMembersRelations = relations(challengeMembers, ({ one }) => ({
  user: one(users, { fields: [challengeMembers.userId], references: [users.id] }),
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
