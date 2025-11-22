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

// User storage table (supports both OAuth and password auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"), // For password-based authentication
  authType: varchar("auth_type", { enum: ['oauth', 'password'] }).default('oauth'), // Authentication method
  accountType: varchar("account_type", { enum: ['personal', 'business', 'joint'] }).default('personal'), // Account type
  businessName: varchar("business_name"), // For business accounts
  businessType: varchar("business_type"), // For business accounts
  taxId: varchar("tax_id"), // For business accounts
  balance: decimal("balance", { precision: 18, scale: 8 }).default('10000'), // User's available balance for purchases
  accumulatedDailyBonus: decimal("accumulated_daily_bonus", { precision: 18, scale: 8 }).default('0'), // Unredeemed daily bonuses
  kycStatus: varchar("kyc_status", { enum: ['pending', 'approved', 'rejected'] }).default('pending'),
  role: varchar("role", { enum: ['user', 'admin'] }).default('user'),
  lastDailyRewardClaim: timestamp("last_daily_reward_claim"), // Track last daily reward claim
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
  partnerEmail: varchar("partner_email"), // Email of intended partner (for auditing)
  relationshipType: varchar("relationship_type", { enum: ['married', 'domestic_partners', 'family'] }), // Relationship type
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

// Investment Portfolios (stocks, ETFs, mutual funds)
export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  strategyTag: varchar("strategy_tag"), // e.g., "growth", "value", "dividend", "balanced"
  assets: jsonb("assets").notNull(), // Array of stocks, ETFs, mutual funds with allocations
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

// Bond Products (government bonds, corporate bonds, municipal bonds)
export const bondProducts = pgTable("bond_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // e.g., "US Treasury 10-Year", "AAA Corporate Bond"
  bondType: varchar("bond_type", { enum: ['government', 'corporate', 'municipal'] }).default('government'),
  maturityMonths: integer("maturity_months").notNull(), // bond maturity period in months
  yield: decimal("yield", { precision: 5, scale: 2 }).notNull(), // annual yield percentage
  minInvestment: decimal("min_investment", { precision: 18, scale: 8 }).notNull(),
  rating: varchar("rating"), // e.g., "AAA", "AA", "A", "BBB"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Bond Holdings
export const userBonds = pgTable("user_bonds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  jointAccountId: varchar("joint_account_id").references(() => jointAccounts.id),
  bondProductId: varchar("bond_product_id").references(() => bondProducts.id).notNull(),
  investedAmount: decimal("invested_amount", { precision: 18, scale: 8 }).notNull(),
  purchaseDate: timestamp("purchase_date").defaultNow(),
  maturityDate: timestamp("maturity_date").notNull(),
  status: varchar("status", { enum: ['active', 'matured', 'sold'] }).default('active'),
  expectedReturn: decimal("expected_return", { precision: 18, scale: 8 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Stock Products (individual stocks managed by admin)
export const stockProducts = pgTable("stock_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: varchar("symbol").unique().notNull(), // e.g., "AAPL", "MSFT", "GOOGL"
  name: varchar("name").notNull(), // e.g., "Apple Inc.", "Microsoft Corporation"
  description: text("description"),
  sector: varchar("sector"), // e.g., "Technology", "Healthcare", "Finance"
  minPurchaseQuantity: decimal("min_purchase_quantity", { precision: 18, scale: 8 }).default('1'), // minimum shares to purchase
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Stock Holdings
export const userStocks = pgTable("user_stocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  jointAccountId: varchar("joint_account_id").references(() => jointAccounts.id),
  stockProductId: varchar("stock_product_id").references(() => stockProducts.id).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(), // number of shares owned
  purchasePrice: decimal("purchase_price", { precision: 18, scale: 8 }).notNull(), // price per share at purchase
  totalInvested: decimal("total_invested", { precision: 18, scale: 8 }).notNull(), // quantity * purchasePrice
  purchaseDate: timestamp("purchase_date").defaultNow(),
  status: varchar("status", { enum: ['pending', 'approved', 'rejected', 'sold'] }).default('pending'),
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

// Daily Bonuses - Individual claim records
export const dailyBonuses = pgTable("daily_bonuses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(), // Bonus amount claimed
  claimedAt: timestamp("claimed_at").defaultNow(),
  redeemedAt: timestamp("redeemed_at"), // When bonus was redeemed to cash balance
  status: varchar("status", { enum: ['pending', 'redeemed'] }).default('pending'),
  redemptionBatchId: varchar("redemption_batch_id"), // Links multiple bonuses redeemed together
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  portfolios: many(userPortfolios),
  bonds: many(userBonds),
  stocks: many(userStocks),
  challengeMembers: many(challengeMembers),
  jointAccounts: many(userJointAccounts),
  createdJointAccounts: many(jointAccounts),
}));

export const jointAccountsRelations = relations(jointAccounts, ({ one, many }) => ({
  creator: one(users, { fields: [jointAccounts.createdBy], references: [users.id] }),
  members: many(userJointAccounts),
  portfolios: many(userPortfolios),
  bonds: many(userBonds),
  stocks: many(userStocks),
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

export const bondProductsRelations = relations(bondProducts, ({ many }) => ({
  userBonds: many(userBonds),
}));

export const userBondsRelations = relations(userBonds, ({ one }) => ({
  user: one(users, { fields: [userBonds.userId], references: [users.id] }),
  jointAccount: one(jointAccounts, { fields: [userBonds.jointAccountId], references: [jointAccounts.id] }),
  bondProduct: one(bondProducts, { fields: [userBonds.bondProductId], references: [bondProducts.id] }),
}));

export const stockProductsRelations = relations(stockProducts, ({ many }) => ({
  userStocks: many(userStocks),
}));

export const userStocksRelations = relations(userStocks, ({ one }) => ({
  user: one(users, { fields: [userStocks.userId], references: [users.id] }),
  jointAccount: one(jointAccounts, { fields: [userStocks.jointAccountId], references: [jointAccounts.id] }),
  stockProduct: one(stockProducts, { fields: [userStocks.stockProductId], references: [stockProducts.id] }),
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

export const insertBondProductSchema = createInsertSchema(bondProducts).omit({
  id: true,
  createdAt: true,
});

export const insertUserBondSchema = createInsertSchema(userBonds).omit({
  id: true,
  createdAt: true,
});

export const insertStockProductSchema = createInsertSchema(stockProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateStockProductSchema = insertStockProductSchema.partial().pick({
  name: true,
  description: true,
  sector: true,
  minPurchaseQuantity: true,
  isActive: true,
});

export const insertUserStockSchema = createInsertSchema(userStocks).omit({
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

export const insertDailyBonusSchema = createInsertSchema(dailyBonuses).omit({
  id: true,
  claimedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type UserPortfolio = typeof userPortfolios.$inferSelect;
export type InsertUserPortfolio = z.infer<typeof insertUserPortfolioSchema>;
export type BondProduct = typeof bondProducts.$inferSelect;
export type InsertBondProduct = z.infer<typeof insertBondProductSchema>;
export type UserBond = typeof userBonds.$inferSelect;
export type InsertUserBond = z.infer<typeof insertUserBondSchema>;
export type StockProduct = typeof stockProducts.$inferSelect;
export type InsertStockProduct = z.infer<typeof insertStockProductSchema>;
export type UpdateStockProduct = z.infer<typeof updateStockProductSchema>;
export type UserStock = typeof userStocks.$inferSelect;
export type InsertUserStock = z.infer<typeof insertUserStockSchema>;
export type CommunityChallenge = typeof communityChallenges.$inferSelect;
export type InsertCommunityChallenge = z.infer<typeof insertCommunityChalllengeSchema>;
export type ChallengeMember = typeof challengeMembers.$inferSelect;
export type InsertChallengeMember = z.infer<typeof insertChallengeMemberSchema>;
export type JointAccount = typeof jointAccounts.$inferSelect;
export type InsertJointAccount = z.infer<typeof insertJointAccountSchema>;
export type UserJointAccount = typeof userJointAccounts.$inferSelect;
export type InsertUserJointAccount = z.infer<typeof insertUserJointAccountSchema>;
export type DailyBonus = typeof dailyBonuses.$inferSelect;
export type InsertDailyBonus = z.infer<typeof insertDailyBonusSchema>;

// Account type definition
export type AccountType = "personal" | "business" | "joint";

// Base fields for all signup schemas
const baseFields = {
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  accountType: z.enum(["personal", "business", "joint"]),
};

// Password confirmation refinement function
const passwordConfirmation = (data: any) => ({
  ...data,
  password: data.password === data.confirmPassword,
});

// Personal account signup schema
export const personalSignupSchema = z.object({
  ...baseFields,
  investmentGoal: z.string().min(1, "Investment goal is required"),
  riskTolerance: z.enum(["low", "medium", "high"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Business account signup schema
export const businessSignupSchema = z.object({
  ...baseFields,
  companyName: z.string().min(1, "Company name is required"),
  companyType: z.enum(["corporation", "llc", "partnership", "sole_proprietorship"]),
  taxId: z.string().min(1, "Tax ID is required"),
  investmentTarget: z.string().min(1, "Investment target is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Joint account signup schema
export const jointSignupSchema = z.object({
  ...baseFields,
  spouseFirstName: z.string().min(1, "Partner's first name is required"),
  spouseLastName: z.string().min(1, "Partner's last name is required"),
  spouseEmail: z.string().email("Please enter a valid email address for your partner"),
  relationshipType: z.enum(["married", "domestic_partners", "family"]),
  investmentTarget: z.string().min(1, "Investment target is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Export signup schema types
export type PersonalSignup = z.infer<typeof personalSignupSchema>;
export type BusinessSignup = z.infer<typeof businessSignupSchema>;
export type JointSignup = z.infer<typeof jointSignupSchema>;
