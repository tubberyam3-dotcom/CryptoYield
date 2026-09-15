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
  balance: decimal("balance", { precision: 18, scale: 8 }).default('0'), // User's available balance for purchases
  accumulatedDailyBonus: decimal("accumulated_daily_bonus", { precision: 18, scale: 8 }).default('0'), // Unredeemed daily bonuses
  xpBalance: integer("xp_balance").default(0), // User's XP balance
  kycStatus: varchar("kyc_status", { enum: ['pending', 'approved', 'rejected'] }).default('pending'),
  role: varchar("role", { enum: ['user', 'admin'] }).default('user'),
  withdrawalSuspended: boolean("withdrawal_suspended").default(false).notNull(),
  lastDailyRewardClaim: timestamp("last_daily_reward_claim"), // Track last daily reward claim
  lastXpClaim: timestamp("last_xp_claim"), // Track last XP claim
  xpCode: varchar("xp_code", { length: 11 }).unique(), // One-time 11-character login code
  xpCodeGeneratedAt: timestamp("xp_code_generated_at"), // When the XP code was generated
  // Contact & Address fields
  phoneNumber: varchar("phone_number"),
  address: varchar("address"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  country: varchar("country"),
  // Verification document (using text for large base64 data URLs)
  verificationDocumentUrl: text("verification_document_url"),
  verificationDocumentType: varchar("verification_document_type", { enum: ['passport', 'drivers_license', 'national_id', 'other'] }),
  verificationDocumentNumber: varchar("verification_document_number"),
  // Referral tracking
  referralCode: varchar("referral_code"),
  // Password reset
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
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
  detailedDescription: text("detailed_description"), // Full detailed description for detail page
  imageUrl: varchar("image_url"), // Portfolio cover image URL
  strategyTag: varchar("strategy_tag"), // e.g., "growth", "value", "dividend", "balanced"
  assets: jsonb("assets").notNull(), // Array of stocks, ETFs, mutual funds with allocations
  minInvestment: decimal("min_investment", { precision: 18, scale: 8 }).notNull(),
  riskLevel: varchar("risk_level", { enum: ['low', 'medium', 'high'] }).notNull(),
  currentReturn: decimal("current_return", { precision: 5, scale: 2 }).default('0'),
  whitepaperUrl: varchar("whitepaper_url"), // URL to whitepaper PDF document
  // Automated interest configuration
  interestRate: decimal("interest_rate", { precision: 8, scale: 6 }).default('0'), // Interest rate per period (e.g., 0.01 = 1%)
  interestPeriod: varchar("interest_period", { enum: ['hourly', 'daily', 'weekly', 'monthly'] }).default('daily'), // How often interest is calculated
  payoutTerm: varchar("payout_term", { enum: ['term_based', 'after_maturity', 'profit_only', 'capital_and_interest'] }).default('profit_only'), // When profits are paid out
  termDuration: integer("term_duration").default(30), // Number of interest periods for full investment term
  // Legacy fields (kept for compatibility)
  dailyInterestRate: decimal("daily_interest_rate", { precision: 8, scale: 6 }).default('0'),
  investmentPeriodDays: integer("investment_period_days").default(365),
  // Unit-based investment controls
  maxUnitsPerUser: integer("max_units_per_user").default(100), // Maximum units a single user can purchase
  unitPrice: decimal("unit_price", { precision: 18, scale: 8 }).default('100'), // Price per unit
  totalUnitsAvailable: integer("total_units_available").default(1000), // Total units available for purchase
  unitsSold: integer("units_sold").default(0), // Units already sold
  meterReduction: decimal("meter_reduction", { precision: 5, scale: 2 }).default('0'), // % reduction applied to interestRate (0-100)
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
  status: varchar("status", { enum: ['pending', 'approved', 'rejected'] }).default('pending'),
  // Unit tracking
  unitsPurchased: decimal("units_purchased", { precision: 18, scale: 8 }).default('1'),
  // Automated interest tracking
  totalAccruedProfit: decimal("total_accrued_profit", { precision: 18, scale: 8 }).default('0'), // Total profit earned
  accruedUnpaidProfit: decimal("accrued_unpaid_profit", { precision: 18, scale: 8 }).default('0'), // Profit waiting to be paid (for after_maturity)
  periodsCompleted: integer("periods_completed").default(0), // Number of interest periods completed
  nextInterestAt: timestamp("next_interest_at"), // When next interest should be applied
  lastInterestAppliedAt: timestamp("last_interest_applied_at"), // When interest was last applied
  maturityPaidAt: timestamp("maturity_paid_at"), // When final payout was made (for after_maturity)
  // Investment timeline
  investmentStartDate: timestamp("investment_start_date").defaultNow(), // When the investment started
  investmentEndDate: timestamp("investment_end_date"), // When the investment period ends
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

// Coupons table for promotional codes
export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").unique().notNull(), // Coupon code (e.g., "WELCOME100")
  description: text("description"), // Description of the coupon
  rewardAmount: decimal("reward_amount", { precision: 18, scale: 8 }).notNull(), // Amount to credit
  maxUses: integer("max_uses"), // Maximum total uses (null = unlimited)
  currentUses: integer("current_uses").default(0), // Current number of uses
  maxUsesPerUser: integer("max_uses_per_user").default(1), // Max uses per user
  expiresAt: timestamp("expires_at"), // Expiration date (null = never expires)
  isActive: boolean("is_active").default(true), // Can be deactivated
  createdAt: timestamp("created_at").defaultNow(),
});

// Coupon redemptions tracking
export const couponRedemptions = pgTable("coupon_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  couponId: varchar("coupon_id").references(() => coupons.id).notNull(),
  rewardAmount: decimal("reward_amount", { precision: 18, scale: 8 }).notNull(),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
});

// XP claims tracking
export const xpClaims = pgTable("xp_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  xpAmount: integer("xp_amount").notNull(), // Amount of XP claimed
  claimedAt: timestamp("claimed_at").defaultNow(),
});

// System settings for admin configuration
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: varchar("setting_key").unique().notNull(), // e.g., "xp_conversion_rate"
  settingValue: text("setting_value").notNull(), // Value as string
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Deposits table for tracking all deposit transactions
export const deposits = pgTable("deposits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  depositMethod: varchar("deposit_method", { enum: ['crypto', 'bank_transfer', 'card_payment', 'deposit_coupon', 'admin_adjustment', 'merchant_pay'] }).notNull(),
  status: varchar("status", { enum: ['pending', 'completed', 'failed', 'cancelled'] }).default('pending'),
  transactionId: varchar("transaction_id"), // External transaction ID (Stripe, bank, etc.)
  couponCode: varchar("coupon_code"), // For deposit coupon method
  metadata: jsonb("metadata"), // Additional data (crypto address, bank details, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Withdrawals table for tracking withdrawal transactions
export const withdrawals = pgTable("withdrawals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  withdrawMethod: varchar("withdraw_method", { enum: ['crypto', 'wire_transfer', 'merchant_pay'] }).notNull(),
  status: varchar("status", { enum: ['pending', 'approved', 'completed', 'rejected', 'cancelled'] }).default('pending'),
  destinationAddress: varchar("destination_address"), // Crypto address or bank account
  metadata: jsonb("metadata"), // Additional data
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Login history table for tracking user logins
export const loginHistory = pgTable("login_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  loginMethod: varchar("login_method", { enum: ['password', 'oauth', 'xp_code'] }).notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  loginAt: timestamp("login_at").defaultNow(),
  success: boolean("success").default(true),
  failureReason: varchar("failure_reason"),
});

// Scheduled emails for delayed sending
export const scheduledEmails = pgTable("scheduled_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  emailType: varchar("email_type", { enum: ['investment_encouragement', 'follow_up', 'reminder'] }).notNull(),
  recipientEmail: varchar("recipient_email").notNull(),
  recipientFirstName: varchar("recipient_first_name"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  status: varchar("status", { enum: ['pending', 'sent', 'failed', 'cancelled'] }).default('pending'),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
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
}).extend({
  detailedDescription: z.string().optional(),
  whitepaperUrl: z.string().optional(),
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

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  createdAt: true,
  currentUses: true,
});

export const insertCouponRedemptionSchema = createInsertSchema(couponRedemptions).omit({
  id: true,
  redeemedAt: true,
});

export const insertXpClaimSchema = createInsertSchema(xpClaims).omit({
  id: true,
  claimedAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertDepositSchema = createInsertSchema(deposits).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertWithdrawalSchema = createInsertSchema(withdrawals).omit({
  id: true,
  userId: true,
  status: true,
  createdAt: true,
  processedAt: true,
});

export const insertLoginHistorySchema = createInsertSchema(loginHistory).omit({
  id: true,
  loginAt: true,
});

export const insertScheduledEmailSchema = createInsertSchema(scheduledEmails).omit({
  id: true,
  sentAt: true,
  createdAt: true,
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
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type CouponRedemption = typeof couponRedemptions.$inferSelect;
export type InsertCouponRedemption = z.infer<typeof insertCouponRedemptionSchema>;
export type XpClaim = typeof xpClaims.$inferSelect;
export type InsertXpClaim = z.infer<typeof insertXpClaimSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type Deposit = typeof deposits.$inferSelect;
export type InsertDeposit = z.infer<typeof insertDepositSchema>;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type LoginHistory = typeof loginHistory.$inferSelect;
export type InsertLoginHistory = z.infer<typeof insertLoginHistorySchema>;
export type ScheduledEmail = typeof scheduledEmails.$inferSelect;
export type InsertScheduledEmail = z.infer<typeof insertScheduledEmailSchema>;

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
