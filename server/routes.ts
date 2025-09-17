import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";

import {
  insertPortfolioSchema,
  insertUserPortfolioSchema,
  insertStakingPlanSchema,
  insertUserStakingSchema,
  insertCommunityChalllengeSchema,
  insertChallengeMemberSchema,
  insertJointAccountSchema,
  insertUserJointAccountSchema,
  users,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Enhanced authentication middleware that supports demo mode and password auth
const enhancedAuth = async (req: any, res: any, next: any) => {
  const demoMode = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
  
  // Check for explicit logout first
  if (req.session.loggedOut) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (demoMode && (!req.isAuthenticated || !req.user) && !req.session.user) {
    // Create demo user context
    req.user = {
      claims: {
        sub: 'demo-user',
        email: 'demo@cryptovault.com',
        first_name: 'Demo',
        last_name: 'Admin'
      }
    };
    return next();
  }
  
  // Check for password-based session
  if (req.session.user) {
    // Create user context similar to OAuth
    req.user = {
      claims: {
        sub: req.session.user.id,
        email: req.session.user.email,
        authType: 'password'
      }
    };
    return next();
  }
  
  // Use regular OAuth authentication
  return isAuthenticated(req, res, next);
};

// Admin-only authentication middleware
const adminAuth = async (req: any, res: any, next: any) => {
  const demoMode = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
  
  // Check for explicit logout first
  if (req.session.loggedOut) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (demoMode) {
    // In demo mode, create admin user context
    req.user = {
      claims: {
        sub: 'demo-admin',
        email: 'admin@cryptovault.com',
        first_name: 'Admin',
        last_name: 'User'
      }
    };
    return next();
  }
  
  // Check if user is authenticated
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Admin authentication required" });
  }
  
  // Check if user has admin role
  const userId = req.user.claims.sub;
  const user = await storage.getUser(userId);
  
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  return next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check if demo mode is enabled
      const demoMode = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
      
      // Check for explicit logout in session
      if (req.session.loggedOut) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (demoMode && (!req.isAuthenticated || !req.user) && !req.session.user) {
        // Return demo user
        const demoUser = {
          id: 'demo-user',
          email: 'demo@cryptovault.com',
          firstName: 'Demo',
          lastName: 'User',
          profileImageUrl: null,
          role: 'user',
          kycStatus: 'approved',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        return res.json(demoUser);
      }
      
      // Check for password-based session
      if (req.session.user) {
        const userId = req.session.user.id;
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }
        
        // Get joint account context
        const accountContext = await storage.getAccountContext(userId);
        let jointAccountInfo = null;
        let userRole = null;
        
        if (accountContext.isJointAccount) {
          const jointAccount = await storage.getJointAccount(accountContext.accountId);
          const userJointAccount = await storage.getUserJointAccount(userId);
          userRole = userJointAccount?.role || null;
          
          jointAccountInfo = {
            jointAccount,
            userRole
          };
        }
        
        // Return user without password hash
        const { passwordHash, ...userWithoutPassword } = user;
        return res.json({
          ...userWithoutPassword,
          accountContext: {
            isJointAccount: accountContext.isJointAccount,
            accountId: accountContext.accountId,
            userRole,
            jointAccountInfo
          }
        });
      }
      
      // Regular OAuth authentication flow
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Get joint account context
      const accountContext = await storage.getAccountContext(userId);
      let jointAccountInfo = null;
      let userRole = null;
      
      if (accountContext.isJointAccount) {
        const jointAccount = await storage.getJointAccount(accountContext.accountId);
        const userJointAccount = await storage.getUserJointAccount(userId);
        userRole = userJointAccount?.role || null;
        
        jointAccountInfo = {
          jointAccount,
          userRole
        };
      }
      
      res.json({
        ...user,
        accountContext: {
          isJointAccount: accountContext.isJointAccount,
          accountId: accountContext.accountId,
          userRole,
          jointAccountInfo
        }
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Admin Auth routes
  app.get('/api/admin/auth/user', async (req: any, res) => {
    try {
      const demoMode = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
      
      if (demoMode) {
        // Return demo admin user
        const demoAdmin = {
          id: 'demo-admin',
          email: 'admin@cryptovault.com',
          firstName: 'Admin',
          lastName: 'User',
          profileImageUrl: null,
          role: 'admin',
          kycStatus: 'approved',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        return res.json(demoAdmin);
      }

      // Check authentication and admin role
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Admin authentication required" });
      }
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching admin user:", error);
      res.status(500).json({ message: "Failed to fetch admin user" });
    }
  });

  // Admin login route (demo mode)
  app.post('/api/admin/auth/login', async (req: any, res) => {
    try {
      const demoMode = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
      
      if (demoMode) {
        const { username, password } = req.body;
        
        // Simple demo admin credentials
        if (username === 'admin' && password === 'admin123') {
          const demoAdmin = {
            id: 'demo-admin',
            email: 'admin@cryptovault.com',
            firstName: 'Admin',
            lastName: 'User',
            profileImageUrl: null,
            role: 'admin',
            kycStatus: 'approved',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Set session for demo admin
          req.session.adminUser = demoAdmin;
          return res.json(demoAdmin);
        } else {
          return res.status(401).json({ message: "Invalid admin credentials" });
        }
      }
      
      // In production, implement proper admin authentication
      res.status(501).json({ message: "Admin authentication not implemented for production" });
    } catch (error) {
      console.error("Error in admin login:", error);
      res.status(500).json({ message: "Admin login failed" });
    }
  });

  // Admin logout route
  app.post('/api/admin/auth/logout', async (req: any, res) => {
    try {
      if (req.session.adminUser) {
        delete req.session.adminUser;
      }
      res.json({ message: "Admin logout successful" });
    } catch (error) {
      console.error("Error in admin logout:", error);
      res.status(500).json({ message: "Admin logout failed" });
    }
  });

  // User Registration and Login routes
  const registerSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
  });

  const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  });

  app.post('/api/auth/register', async (req: any, res) => {
    try {
      const { email, password, firstName, lastName } = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }
      
      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Create user
      const user = await storage.createUser({
        email,
        firstName,
        lastName,
        passwordHash,
        authType: 'password',
        profileImageUrl: null,
      });
      
      // Create session (similar to Replit OAuth)
      req.session.user = {
        id: user.id,
        email: user.email,
        authType: 'password',
      };
      
      // Clear logout flag
      delete req.session.loggedOut;
      
      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check if user uses password authentication
      if (user.authType !== 'password' || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid login method for this account" });
      }
      
      // Verify password
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Create session
      req.session.user = {
        id: user.id,
        email: user.email,
        authType: 'password',
      };
      
      // Clear logout flag
      delete req.session.loggedOut;
      
      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/logout', async (req: any, res) => {
    try {
      if (req.session.user) {
        delete req.session.user;
      }
      res.json({ message: "Logout successful" });
    } catch (error) {
      console.error("Error in logout:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Clear logout state to allow demo mode re-entry
  app.post('/api/auth/clear-logout', async (req: any, res) => {
    try {
      if (req.session.loggedOut) {
        delete req.session.loggedOut;
      }
      res.json({ message: "Logout state cleared" });
    } catch (error) {
      console.error("Error clearing logout state:", error);
      res.status(500).json({ message: "Failed to clear logout state" });
    }
  });

  // Portfolio routes
  app.get('/api/portfolios', async (req, res) => {
    try {
      const portfolios = await storage.getPortfolios();
      res.json(portfolios);
    } catch (error) {
      console.error("Error fetching portfolios:", error);
      res.status(500).json({ message: "Failed to fetch portfolios" });
    }
  });

  app.get('/api/portfolios/:id', async (req, res) => {
    try {
      const portfolio = await storage.getPortfolio(req.params.id);
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      res.json(portfolio);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  app.post('/api/portfolios', enhancedAuth, async (req: any, res) => {
    try {
      const user = req.user.claims;
      
      // Check if user is admin
      const userRecord = await storage.getUser(user.sub);
      if (userRecord?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const portfolioData = insertPortfolioSchema.parse({
        ...req.body,
        createdBy: user.sub,
      });
      
      const portfolio = await storage.createPortfolio(portfolioData);
      res.json(portfolio);
    } catch (error) {
      console.error("Error creating portfolio:", error);
      res.status(500).json({ message: "Failed to create portfolio" });
    }
  });

  // User Portfolio routes
  app.get('/api/user/portfolios', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userPortfolios = await storage.getUserPortfolios(userId);
      res.json(userPortfolios);
    } catch (error) {
      console.error("Error fetching user portfolios:", error);
      res.status(500).json({ message: "Failed to fetch user portfolios" });
    }
  });

  app.post('/api/user/portfolios', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userPortfolioData = insertUserPortfolioSchema.parse({
        ...req.body,
        userId,
        currentValue: req.body.investedAmount, // Initially same as invested amount
      });
      
      const userPortfolio = await storage.createUserPortfolio(userPortfolioData);
      res.json(userPortfolio);
    } catch (error) {
      console.error("Error creating user portfolio:", error);
      res.status(500).json({ message: "Failed to invest in portfolio" });
    }
  });

  // Joint Account routes
  app.post('/api/joint-accounts', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const jointAccountData = insertJointAccountSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      
      const jointAccount = await storage.createJointAccount(jointAccountData);
      res.json(jointAccount);
    } catch (error) {
      console.error("Error creating joint account:", error);
      res.status(400).json({ message: "Failed to create joint account" });
    }
  });

  app.post('/api/joint-accounts/join', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { joinCode } = req.body;
      
      if (!joinCode || typeof joinCode !== 'string') {
        return res.status(400).json({ message: "Join code is required" });
      }
      
      const result = await storage.joinJointAccountByCode(userId, joinCode.toUpperCase());
      res.json(result);
    } catch (error: any) {
      console.error("Error joining joint account:", error);
      if (error.message === 'Joint account not found') {
        return res.status(404).json({ message: "Invalid join code" });
      }
      if (error.message === 'User already in joint account') {
        return res.status(409).json({ message: "You are already part of this joint account" });
      }
      res.status(400).json({ message: "Failed to join joint account" });
    }
  });

  app.get('/api/joint-accounts/:id', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const jointAccountId = req.params.id;
      
      // Check if user has access to this joint account
      const userJointAccount = await storage.getUserJointAccount(userId);
      if (!userJointAccount || userJointAccount.jointAccountId !== jointAccountId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const jointAccount = await storage.getJointAccount(jointAccountId);
      if (!jointAccount) {
        return res.status(404).json({ message: "Joint account not found" });
      }
      
      res.json(jointAccount);
    } catch (error) {
      console.error("Error fetching joint account:", error);
      res.status(500).json({ message: "Failed to fetch joint account" });
    }
  });

  // Staking routes
  app.get('/api/staking/plans', async (req, res) => {
    try {
      const plans = await storage.getStakingPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching staking plans:", error);
      res.status(500).json({ message: "Failed to fetch staking plans" });
    }
  });

  app.post('/api/staking/plans', enhancedAuth, async (req: any, res) => {
    try {
      const user = req.user.claims;
      
      // Check if user is admin
      const userRecord = await storage.getUser(user.sub);
      if (userRecord?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const planData = insertStakingPlanSchema.parse(req.body);
      const plan = await storage.createStakingPlan(planData);
      res.json(plan);
    } catch (error) {
      console.error("Error creating staking plan:", error);
      res.status(500).json({ message: "Failed to create staking plan" });
    }
  });

  app.get('/api/user/staking', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userStakings = await storage.getUserStaking(userId);
      res.json(userStakings);
    } catch (error) {
      console.error("Error fetching user staking:", error);
      res.status(500).json({ message: "Failed to fetch user staking" });
    }
  });

  app.post('/api/user/staking', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { stakingPlanId, amountLocked } = req.body;
      
      const stakingPlan = await storage.getStakingPlan(stakingPlanId);
      if (!stakingPlan) {
        return res.status(404).json({ message: "Staking plan not found" });
      }

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + stakingPlan.duration);
      
      const estimatedRewards = (parseFloat(amountLocked) * parseFloat(stakingPlan.apy.toString()) / 100).toString();

      const userStakingData = insertUserStakingSchema.parse({
        userId,
        stakingPlanId,
        amountLocked,
        endDate,
        estimatedRewards,
      });
      
      const userStakingRecord = await storage.createUserStaking(userStakingData);
      res.json(userStakingRecord);
    } catch (error) {
      console.error("Error creating user staking:", error);
      res.status(500).json({ message: "Failed to create staking" });
    }
  });

  // Challenge routes
  app.get('/api/challenges', async (req, res) => {
    try {
      const challenges = await storage.getCommunityChalllenges();
      res.json(challenges);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ message: "Failed to fetch challenges" });
    }
  });

  app.post('/api/challenges', enhancedAuth, async (req: any, res) => {
    try {
      const user = req.user.claims;
      const challengeData = insertCommunityChalllengeSchema.parse({
        ...req.body,
        createdBy: user.sub,
      });
      
      const challenge = await storage.createCommunityChallenge(challengeData);
      res.json(challenge);
    } catch (error) {
      console.error("Error creating challenge:", error);
      res.status(500).json({ message: "Failed to create challenge" });
    }
  });

  app.post('/api/challenges/:id/join', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const challengeId = req.params.id;
      const { contributedAmount } = req.body;
      
      const challengeMemberData = insertChallengeMemberSchema.parse({
        userId,
        challengeId,
        contributedAmount: contributedAmount || '0',
      });
      
      const member = await storage.joinChallenge(challengeMemberData);
      
      // Update challenge progress
      if (contributedAmount && parseFloat(contributedAmount) > 0) {
        await storage.updateChallengeProgress(challengeId, contributedAmount);
      }
      
      res.json(member);
    } catch (error) {
      console.error("Error joining challenge:", error);
      res.status(500).json({ message: "Failed to join challenge" });
    }
  });

  app.get('/api/challenges/:id/members', async (req, res) => {
    try {
      const members = await storage.getChallengeMembers(req.params.id);
      res.json(members);
    } catch (error) {
      console.error("Error fetching challenge members:", error);
      res.status(500).json({ message: "Failed to fetch challenge members" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Staking calculator
  app.post('/api/staking/calculate', async (req, res) => {
    try {
      const { amount, planId } = req.body;
      const plan = await storage.getStakingPlan(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Staking plan not found" });
      }

      const principal = parseFloat(amount);
      const apy = parseFloat(plan.apy.toString());
      const duration = plan.duration / 12; // Convert months to years
      
      const rewards = principal * apy / 100 * duration;
      const total = principal + rewards;

      res.json({
        principal: principal.toFixed(2),
        rewards: rewards.toFixed(2),
        total: total.toFixed(2),
        apy: apy.toFixed(1),
        duration: plan.duration,
      });
    } catch (error) {
      console.error("Error calculating staking rewards:", error);
      res.status(500).json({ message: "Failed to calculate staking rewards" });
    }
  });

  // Admin User Management Routes
  app.get('/api/admin/users', adminAuth, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/users/stats', adminAuth, async (req: any, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Admin analytics endpoint
  app.get('/api/admin/analytics', adminAuth, async (req: any, res) => {
    try {
      const analytics = await storage.getAnalyticsData();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  // Admin system health endpoint
  app.get('/api/admin/system/health', adminAuth, async (req: any, res) => {
    try {
      const health = await storage.getSystemHealth();
      res.json(health);
    } catch (error) {
      console.error("Error fetching system health:", error);
      res.status(500).json({ message: "Failed to fetch system health data" });
    }
  });

  // Admin activity logs endpoint
  app.get('/api/admin/logs', adminAuth, async (req: any, res) => {
    try {
      const { limit = 50, offset = 0, type } = req.query;
      const logs = await storage.getActivityLogs(Number(limit), Number(offset), type as string);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  app.patch('/api/admin/users/:id/role', adminAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      // Validate role
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(id, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch('/api/admin/users/:id/kyc', adminAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { kycStatus } = req.body;

      // Validate KYC status
      if (!['pending', 'approved', 'rejected'].includes(kycStatus)) {
        return res.status(400).json({ message: "Invalid KYC status" });
      }

      const updatedUser = await storage.updateUserKycStatus(id, kycStatus);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user KYC status:", error);
      res.status(500).json({ message: "Failed to update user KYC status" });
    }
  });

  // Admin Challenge Management Routes
  app.post('/api/admin/challenges', adminAuth, async (req: any, res) => {
    try {
      const challengeData = insertCommunityChalllengeSchema.parse({
        ...req.body,
        status: 'active',
        currentAmount: '0'
      });
      
      const challenge = await storage.createCommunityChallenge(challengeData);
      res.json(challenge);
    } catch (error) {
      console.error("Error creating admin challenge:", error);
      res.status(500).json({ message: "Failed to create challenge" });
    }
  });

  app.get('/api/admin/challenges', adminAuth, async (req, res) => {
    try {
      const challenges = await storage.getCommunityChalllenges();
      res.json(challenges);
    } catch (error) {
      console.error("Error fetching admin challenges:", error);
      res.status(500).json({ message: "Failed to fetch challenges" });
    }
  });

  app.patch('/api/admin/challenges/:id', adminAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // For now, we'll implement this as a direct database update
      // In a real implementation, you'd have an updateChallenge method in storage
      const challenge = await storage.getCommunityChallenge(id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      // Return the challenge for now - full update functionality would be implemented in storage
      res.json({ ...challenge, ...updateData });
    } catch (error) {
      console.error("Error updating challenge:", error);
      res.status(500).json({ message: "Failed to update challenge" });
    }
  });

  app.get('/api/admin/challenges/:id/details', adminAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const challenge = await storage.getCommunityChallenge(id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      const members = await storage.getChallengeMembers(id);
      
      res.json({
        challenge,
        members,
        memberCount: members.length,
        totalContributed: members.reduce((sum, member) => sum + parseFloat(member.contributedAmount || '0'), 0)
      });
    } catch (error) {
      console.error("Error fetching challenge details:", error);
      res.status(500).json({ message: "Failed to fetch challenge details" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
