import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

import {
  insertPortfolioSchema,
  insertUserPortfolioSchema,
  insertBondProductSchema,
  insertUserBondSchema,
  insertStockProductSchema,
  updateStockProductSchema,
  insertUserStockSchema,
  insertCommunityChalllengeSchema,
  insertChallengeMemberSchema,
  insertJointAccountSchema,
  insertUserJointAccountSchema,
  insertWithdrawalSchema,
  users,
  userStocks,
} from "@shared/schema";
import { fromError } from "zod-validation-error";
import { db } from "./db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Enhanced authentication middleware that supports password auth
const enhancedAuth = async (req: any, res: any, next: any) => {
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
  // Check for password-based session first
  if (req.session.user) {
    const userId = req.session.user.id;
    const user = await storage.getUser(userId);
    
    if (user && user.role === 'admin') {
      req.user = {
        claims: {
          sub: userId,
          email: user.email,
          authType: 'password'
        }
      };
      return next();
    } else {
      return res.status(403).json({ message: "Admin access required" });
    }
  }
  
  // Check if user is authenticated via OAuth
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
          email: 'admin@refluxcapital.com',
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
            email: 'admin@refluxcapital.com',
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
    accountType: z.enum(['personal', 'business', 'joint']).optional().default('personal'),
    // Joint account fields (only required if accountType is 'joint')
    spouseFirstName: z.string().optional(),
    spouseLastName: z.string().optional(),
    spouseEmail: z.string().email().optional().or(z.literal('')),
    relationshipType: z.enum(['married', 'domestic_partners', 'family']).optional(),
    // Business account fields (only required if accountType is 'business')
    businessName: z.string().optional(),
    businessType: z.string().optional(),
    taxId: z.string().optional(),
  }).refine((data) => {
    // If joint account, require spouse information
    if (data.accountType === 'joint') {
      return data.spouseFirstName && data.spouseLastName && data.spouseEmail && data.relationshipType;
    }
    return true;
  }, {
    message: "Partner information is required for joint accounts",
    path: ["spouseEmail"]
  }).refine((data) => {
    // If business account, require business information
    if (data.accountType === 'business') {
      return data.businessName && data.businessType;
    }
    return true;
  }, {
    message: "Business information is required for business accounts",
    path: ["businessName"]
  });

  const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  });

  app.post('/api/auth/register', async (req: any, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      const { 
        email, 
        password, 
        firstName, 
        lastName, 
        accountType,
        spouseFirstName,
        spouseLastName,
        spouseEmail,
        relationshipType,
        businessName,
        businessType,
        taxId
      } = validatedData;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }
      
      // For joint accounts, note: we allow existing emails since partners can join using the join code
      
      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Create user with accountType
      const user = await storage.createUser({
        email,
        firstName,
        lastName,
        passwordHash,
        authType: 'password',
        profileImageUrl: null,
        accountType: accountType || 'personal',
        businessName: accountType === 'business' ? businessName : null,
        businessType: accountType === 'business' ? businessType : null,
        taxId: accountType === 'business' ? taxId : null,
      });
      
      // If joint account, create the joint account
      let jointAccount = null;
      if (accountType === 'joint') {
        const jointAccountName = `${firstName} ${lastName} & ${spouseFirstName} ${spouseLastName}`;
        const jointAccountDescription = `Joint ${relationshipType?.replace('_', ' ')} account`;
        
        jointAccount = await storage.createJointAccount({
          name: jointAccountName,
          description: jointAccountDescription,
          createdBy: user.id,
          partnerEmail: spouseEmail || null,
          relationshipType: relationshipType || null,
        });
        
        console.log(`Created joint account ${jointAccount.id} for user ${user.id} with join code: ${jointAccount.joinCode}`);
        console.log(`Partner email: ${spouseEmail} - they can join using code: ${jointAccount.joinCode}`);
      }
      
      // Create session (similar to Replit OAuth)
      req.session.user = {
        id: user.id,
        email: user.email,
        authType: 'password',
      };
      
      // Clear logout flag
      delete req.session.loggedOut;
      
      // Return user without password hash, include joint account info if applicable
      const { passwordHash: _, ...userWithoutPassword } = user;
      const response: any = userWithoutPassword;
      
      if (jointAccount) {
        response.jointAccount = jointAccount;
        response.message = `Joint account created! Share this join code with your partner: ${jointAccount.joinCode}`;
      }
      
      res.json(response);
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

  // Seed demo user for testing (development only)
  app.post('/api/seed-demo-user', async (req: any, res) => {
    try {
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ message: "Only available in development" });
      }
      
      const existingUser = await storage.getUserByEmail('demo@refluxcapital.com');
      if (existingUser) {
        return res.json({ message: "Demo user already exists", user: { email: existingUser.email } });
      }
      
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash('demo123', saltRounds);
      
      const user = await storage.createUser({
        email: 'demo@refluxcapital.com',
        firstName: 'Demo',
        lastName: 'User', 
        passwordHash,
        authType: 'password',
        profileImageUrl: null,
      });
      
      res.json({ message: "Demo user created", user: { email: user.email } });
    } catch (error) {
      console.error("Error creating demo user:", error);
      res.status(500).json({ message: "Failed to create demo user" });
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

  // Bond routes
  app.get('/api/bonds/products', async (req, res) => {
    try {
      const products = await storage.getBondProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching bond products:", error);
      res.status(500).json({ message: "Failed to fetch bond products" });
    }
  });

  app.post('/api/bonds/products', enhancedAuth, async (req: any, res) => {
    try {
      const user = req.user.claims;
      
      // Check if user is admin
      const userRecord = await storage.getUser(user.sub);
      if (userRecord?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const productData = insertBondProductSchema.parse(req.body);
      const product = await storage.createBondProduct(productData);
      res.json(product);
    } catch (error) {
      console.error("Error creating bond product:", error);
      res.status(500).json({ message: "Failed to create bond product" });
    }
  });

  app.get('/api/user/bonds', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userBonds = await storage.getUserBonds(userId);
      res.json(userBonds);
    } catch (error) {
      console.error("Error fetching user bonds:", error);
      res.status(500).json({ message: "Failed to fetch user bonds" });
    }
  });

  app.post('/api/user/bonds', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { bondProductId, investedAmount } = req.body;
      
      const bondProduct = await storage.getBondProduct(bondProductId);
      if (!bondProduct) {
        return res.status(404).json({ message: "Bond product not found" });
      }

      const maturityDate = new Date();
      maturityDate.setMonth(maturityDate.getMonth() + bondProduct.maturityMonths);
      
      const expectedReturn = (parseFloat(investedAmount) * parseFloat(bondProduct.yield.toString()) / 100).toString();

      const userBondData = insertUserBondSchema.parse({
        userId,
        bondProductId,
        investedAmount,
        maturityDate,
        expectedReturn,
      });
      
      const userBondRecord = await storage.createUserBond(userBondData);
      res.json(userBondRecord);
    } catch (error) {
      console.error("Error creating user bond:", error);
      res.status(500).json({ message: "Failed to create bond investment" });
    }
  });

  // Stock product management routes (admin)
  app.get('/api/stocks/products', async (req, res) => {
    try {
      const products = await storage.getStockProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching stock products:", error);
      res.status(500).json({ message: "Failed to fetch stock products" });
    }
  });

  app.post('/api/stocks/products', enhancedAuth, async (req: any, res) => {
    try {
      const user = req.user.claims;
      
      const userRecord = await storage.getUser(user.sub);
      if (userRecord?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const productData = insertStockProductSchema.parse(req.body);
      const product = await storage.createStockProduct(productData);
      res.json(product);
    } catch (error) {
      console.error("Error creating stock product:", error);
      res.status(500).json({ message: "Failed to create stock product" });
    }
  });

  app.patch('/api/stocks/products/:id', enhancedAuth, async (req: any, res) => {
    try {
      const user = req.user.claims;
      
      const userRecord = await storage.getUser(user.sub);
      if (userRecord?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const productId = req.params.id;
      const updates = updateStockProductSchema.parse(req.body);
      
      const product = await storage.updateStockProduct(productId, updates);
      res.json(product);
    } catch (error) {
      console.error("Error updating stock product:", error);
      res.status(500).json({ message: "Failed to update stock product" });
    }
  });

  app.delete('/api/stocks/products/:id', enhancedAuth, async (req: any, res) => {
    try {
      const user = req.user.claims;
      
      const userRecord = await storage.getUser(user.sub);
      if (userRecord?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const productId = req.params.id;
      await storage.deleteStockProduct(productId);
      res.json({ message: "Stock product deleted successfully" });
    } catch (error) {
      console.error("Error deleting stock product:", error);
      res.status(500).json({ message: "Failed to delete stock product" });
    }
  });

  // Admin stock purchase approvals
  app.get('/api/admin/stock-purchases/pending', enhancedAuth, async (req: any, res) => {
    try {
      const user = req.user.claims;
      
      const userRecord = await storage.getUser(user.sub);
      if (userRecord?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const pendingPurchases = await storage.getPendingStockPurchases();
      res.json(pendingPurchases);
    } catch (error) {
      console.error("Error fetching pending stock purchases:", error);
      res.status(500).json({ message: "Failed to fetch pending stock purchases" });
    }
  });

  app.patch('/api/admin/stock-purchases/:id/approve', enhancedAuth, async (req: any, res) => {
    try {
      const user = req.user.claims;
      
      const userRecord = await storage.getUser(user.sub);
      if (userRecord?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const purchaseId = req.params.id;
      const updatedPurchase = await storage.updateStockPurchaseStatus(purchaseId, 'approved');
      res.json(updatedPurchase);
    } catch (error) {
      console.error("Error approving stock purchase:", error);
      res.status(500).json({ message: "Failed to approve stock purchase" });
    }
  });

  app.patch('/api/admin/stock-purchases/:id/reject', enhancedAuth, async (req: any, res) => {
    try {
      const user = req.user.claims;
      
      const userRecord = await storage.getUser(user.sub);
      if (userRecord?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const purchaseId = req.params.id;
      
      // Get the purchase details to refund the user
      const [purchase] = await db.select().from(userStocks).where(eq(userStocks.id, purchaseId));
      
      if (purchase && purchase.userId) {
        // Refund the user's balance
        const user = await storage.getUser(purchase.userId);
        if (user) {
          const currentBalance = parseFloat(user.balance?.toString() || '0');
          const refundAmount = parseFloat(purchase.totalInvested.toString());
          const newBalance = (currentBalance + refundAmount).toString();
          await storage.updateUserBalance(purchase.userId, newBalance);
        }
      }

      const updatedPurchase = await storage.updateStockPurchaseStatus(purchaseId, 'rejected');
      res.json(updatedPurchase);
    } catch (error) {
      console.error("Error rejecting stock purchase:", error);
      res.status(500).json({ message: "Failed to reject stock purchase" });
    }
  });

  // User stock operations
  app.get('/api/user/stocks', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userStocks = await storage.getUserStocks(userId);
      res.json(userStocks);
    } catch (error) {
      console.error("Error fetching user stocks:", error);
      res.status(500).json({ message: "Failed to fetch user stocks" });
    }
  });

  app.post('/api/user/stocks', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { stockProductId, symbol, name, sector, quantity, purchasePrice } = req.body;
      
      let stockProduct;
      
      // If stockProductId is provided, use it (admin offering)
      if (stockProductId) {
        stockProduct = await storage.getStockProduct(stockProductId);
        if (!stockProduct) {
          return res.status(404).json({ message: "Stock product not found" });
        }
      } 
      // Otherwise, accept symbol and name to create/find stock product
      else if (symbol && name) {
        // Check if stock product already exists for this symbol
        const existingProducts = await storage.getStockProducts();
        stockProduct = existingProducts.find((p: any) => p.symbol === symbol.toUpperCase());
        
        // If not found, create a new stock product (non-admin offering)
        if (!stockProduct) {
          const newStockProduct = await storage.createStockProduct({
            symbol: symbol.toUpperCase(),
            name: name,
            sector: sector || null,
            description: null,
            minPurchaseQuantity: '1',
            isActive: false, // Mark as non-admin offering
          });
          stockProduct = newStockProduct;
        }
      } else {
        return res.status(400).json({ 
          message: "Either stockProductId or (symbol + name) must be provided" 
        });
      }

      const quantityNum = parseFloat(quantity);
      const minQuantity = parseFloat(stockProduct.minPurchaseQuantity?.toString() || '1');
      
      if (quantityNum <= 0) {
        return res.status(400).json({ message: "Quantity must be positive" });
      }
      
      if (quantityNum < minQuantity) {
        return res.status(400).json({ 
          message: `Minimum purchase quantity is ${minQuantity} shares` 
        });
      }

      // Check user balance
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const accountContext = await storage.getAccountContext(userId);
      const totalInvested = quantityNum * parseFloat(purchasePrice);
      const userBalance = parseFloat(user.balance?.toString() || '0');

      // Verify sufficient balance
      if (userBalance < totalInvested) {
        return res.status(400).json({ 
          message: `Insufficient balance. You have $${userBalance.toFixed(2)}, but need $${totalInvested.toFixed(2)}` 
        });
      }

      // Deduct balance
      const newBalance = (userBalance - totalInvested).toString();
      await storage.updateUserBalance(userId, newBalance);

      const userStockData: any = {
        stockProductId: stockProduct.id,
        quantity,
        purchasePrice,
        totalInvested: totalInvested.toString(),
        status: 'pending', // Set to pending for admin approval
      };

      if (accountContext.isJointAccount) {
        userStockData.jointAccountId = accountContext.accountId;
        userStockData.userId = null;
      } else {
        userStockData.userId = userId;
        userStockData.jointAccountId = null;
      }

      const validatedData = insertUserStockSchema.parse(userStockData);
      const userStockRecord = await storage.createUserStock(validatedData);
      res.json(userStockRecord);
    } catch (error) {
      console.error("Error creating user stock:", error);
      res.status(500).json({ message: "Failed to purchase stock" });
    }
  });

  // Stock market data routes (using yahoo-finance2)
  app.get('/api/stocks/quote', async (req, res) => {
    try {
      const { symbol } = req.query;
      
      if (!symbol || typeof symbol !== 'string') {
        return res.status(400).json({ message: "Symbol parameter is required" });
      }

      const quote: any = await yahooFinance.quote(symbol.toUpperCase());
      
      res.json({
        symbol: quote.symbol,
        name: quote.longName || quote.shortName || symbol,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        previousClose: quote.regularMarketPreviousClose,
        dayHigh: quote.regularMarketDayHigh,
        dayLow: quote.regularMarketDayLow,
        volume: quote.regularMarketVolume,
        marketCap: quote.marketCap,
      });
    } catch (error) {
      console.error("Error fetching stock quote:", error);
      res.status(500).json({ message: "Failed to fetch stock quote" });
    }
  });

  app.get('/api/stocks/quotes', async (req, res) => {
    try {
      const { symbols } = req.query;
      
      if (!symbols || typeof symbols !== 'string') {
        return res.status(400).json({ message: "Symbols parameter is required" });
      }

      const symbolArray = symbols.toUpperCase().split(',').map(s => s.trim());
      const quotes = await Promise.all(
        symbolArray.map(async (symbol) => {
          try {
            const quote: any = await yahooFinance.quote(symbol);
            return {
              symbol: quote.symbol,
              name: quote.longName || quote.shortName || symbol,
              price: quote.regularMarketPrice,
              change: quote.regularMarketChange,
              changePercent: quote.regularMarketChangePercent,
              previousClose: quote.regularMarketPreviousClose,
              dayHigh: quote.regularMarketDayHigh,
              dayLow: quote.regularMarketDayLow,
              volume: quote.regularMarketVolume,
              marketCap: quote.marketCap,
            };
          } catch (error) {
            console.error(`Error fetching quote for ${symbol}:`, error);
            return null;
          }
        })
      );

      res.json(quotes.filter(q => q !== null));
    } catch (error) {
      console.error("Error fetching stock quotes:", error);
      res.status(500).json({ message: "Failed to fetch stock quotes" });
    }
  });

  app.get('/api/stocks/top-performers', async (req, res) => {
    try {
      // Curated list of 50 top-performing stocks across various sectors
      const topStocks = [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'LLY', 'AVGO',
        'V', 'JPM', 'WMT', 'XOM', 'UNH', 'MA', 'PG', 'JNJ', 'HD', 'COST',
        'ABBV', 'NFLX', 'BAC', 'CRM', 'KO', 'ORCL', 'PEP', 'MRK', 'CVX', 'AMD',
        'ADBE', 'TMO', 'ACN', 'CSCO', 'MCD', 'ABT', 'WFC', 'LIN', 'DHR', 'INTC',
        'DIS', 'VZ', 'NKE', 'CMCSA', 'PM', 'TXN', 'NEE', 'UPS', 'RTX', 'QCOM'
      ];

      const quotes = await Promise.all(
        topStocks.map(async (symbol) => {
          try {
            const quote: any = await yahooFinance.quote(symbol);
            return {
              symbol: quote.symbol,
              name: quote.longName || quote.shortName || symbol,
              price: quote.regularMarketPrice,
              change: quote.regularMarketChange,
              changePercent: quote.regularMarketChangePercent,
              previousClose: quote.regularMarketPreviousClose,
              dayHigh: quote.regularMarketDayHigh,
              dayLow: quote.regularMarketDayLow,
              volume: quote.regularMarketVolume,
              marketCap: quote.marketCap,
            };
          } catch (error) {
            console.error(`Error fetching quote for ${symbol}:`, error);
            return null;
          }
        })
      );

      res.json(quotes.filter(q => q !== null));
    } catch (error) {
      console.error("Error fetching top performers:", error);
      res.status(500).json({ message: "Failed to fetch top performers" });
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

  // Bond calculator
  app.post('/api/bonds/calculate', async (req, res) => {
    try {
      const { amount, productId } = req.body;
      const product = await storage.getBondProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Bond product not found" });
      }

      const principal = parseFloat(amount);
      const yieldRate = parseFloat(product.yield.toString());
      const duration = product.maturityMonths / 12; // Convert months to years
      
      const returns = principal * yieldRate / 100 * duration;
      const total = principal + returns;

      res.json({
        principal: principal.toFixed(2),
        returns: returns.toFixed(2),
        total: total.toFixed(2),
        yield: yieldRate.toFixed(1),
        maturityMonths: product.maturityMonths,
      });
    } catch (error) {
      console.error("Error calculating bond returns:", error);
      res.status(500).json({ message: "Failed to calculate bond returns" });
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

  // Simple in-memory cache for crypto data
  const cryptoCache = new Map<string, { data: any; timestamp: number }>();
  const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache

  // Demo historical data generator for when API fails
  const generateDemoData = (coinId: string, days: number) => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const prices: [number, number][] = [];
    
    // Base prices and growth rates for different coins
    const coinConfigs: Record<string, { basePrice: number; volatility: number; trend: number }> = {
      'bitcoin': { basePrice: 45000, volatility: 0.03, trend: 1.0015 },
      'ethereum': { basePrice: 2500, volatility: 0.04, trend: 1.002 },
      'solana': { basePrice: 100, volatility: 0.06, trend: 1.0025 },
      'worldcoin-wld': { basePrice: 3, volatility: 0.08, trend: 1.003 }
    };
    
    const config = coinConfigs[coinId] || coinConfigs['bitcoin'];
    let price = config.basePrice;
    
    for (let i = 0; i < Math.min(days, 365); i++) {
      const timestamp = now - (days - i) * dayMs;
      // Add trend and random volatility
      price = price * config.trend * (1 + (Math.random() - 0.5) * config.volatility);
      prices.push([timestamp, price]);
    }
    
    return { prices };
  };

  // Crypto data proxy endpoint to avoid CORS issues
  app.get('/api/crypto/historical/:coinId', async (req: any, res) => {
    try {
      const { coinId } = req.params;
      const { days } = req.query;
      
      if (!days || isNaN(Number(days))) {
        return res.status(400).json({ message: "Invalid days parameter" });
      }

      const cacheKey = `${coinId}-${days}`;
      const cached = cryptoCache.get(cacheKey);

      // Return cached data if available and fresh
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }

      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`
        );

        if (response.ok) {
          const data = await response.json();
          cryptoCache.set(cacheKey, { data, timestamp: Date.now() });
          return res.json(data);
        }
      } catch (apiError) {
        console.log("CoinGecko API unavailable, using demo data");
      }

      // If API fails and we have stale cache, use it
      if (cached) {
        return res.json(cached.data);
      }

      // Otherwise, generate and cache demo data
      const demoData = generateDemoData(coinId, parseInt(days));
      cryptoCache.set(cacheKey, { data: demoData, timestamp: Date.now() });
      res.json(demoData);
    } catch (error) {
      console.error("Error in crypto endpoint:", error);
      res.status(500).json({ message: "Failed to fetch crypto data" });
    }
  });

  // Daily Reward System
  app.get("/api/rewards/daily-status", enhancedAuth, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const now = new Date();
      const lastClaim = user.lastDailyRewardClaim ? new Date(user.lastDailyRewardClaim) : null;
      
      // Check if user can claim (24 hours since last claim)
      let canClaim = true;
      let nextClaimTime = null;
      
      if (lastClaim) {
        const timeSinceLastClaim = now.getTime() - lastClaim.getTime();
        const hoursElapsed = timeSinceLastClaim / (1000 * 60 * 60);
        
        if (hoursElapsed < 24) {
          canClaim = false;
          nextClaimTime = new Date(lastClaim.getTime() + (24 * 60 * 60 * 1000)).toISOString();
        }
      }

      res.json({ canClaim, nextClaimTime });
    } catch (error) {
      console.error("Error checking daily reward status:", error);
      res.status(500).json({ message: "Failed to check reward status" });
    }
  });

  app.post("/api/rewards/claim-daily", enhancedAuth, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const now = new Date();
      const lastClaim = user.lastDailyRewardClaim ? new Date(user.lastDailyRewardClaim) : null;
      
      // Check if user can claim (24 hours since last claim)
      if (lastClaim) {
        const timeSinceLastClaim = now.getTime() - lastClaim.getTime();
        const hoursElapsed = timeSinceLastClaim / (1000 * 60 * 60);
        
        if (hoursElapsed < 24) {
          const nextClaimTime = new Date(lastClaim.getTime() + (24 * 60 * 60 * 1000));
          return res.status(400).json({ 
            message: `You can claim your next reward at ${nextClaimTime.toLocaleString()}`,
          });
        }
      }

      // Daily reward amount
      const rewardAmount = '100';
      
      // Create daily bonus record and update accumulated bonus
      await storage.createDailyBonus(userId, rewardAmount);
      
      // Get updated user to return new accumulated bonus
      const updatedUser = await storage.getUser(userId);

      res.json({
        success: true,
        rewardAmount,
        accumulatedBonus: updatedUser?.accumulatedDailyBonus || '0',
        message: "Daily reward claimed successfully!",
      });
    } catch (error) {
      console.error("Error claiming daily reward:", error);
      res.status(500).json({ message: "Failed to claim reward" });
    }
  });

  app.get("/api/rewards/daily-history", enhancedAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const bonuses = await storage.getUserDailyBonuses(userId);
      const stats = await storage.getDailyBonusStats(userId);

      res.json({
        bonuses,
        stats,
      });
    } catch (error) {
      console.error("Error fetching daily bonus history:", error);
      res.status(500).json({ message: "Failed to fetch bonus history" });
    }
  });

  app.post("/api/rewards/redeem", enhancedAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const result = await storage.redeemDailyBonuses(userId);

      res.json({
        success: true,
        ...result,
        message: "Bonuses redeemed successfully!",
      });
    } catch (error: any) {
      console.error("Error redeeming daily bonuses:", error);
      
      if (error.message === 'No bonuses to redeem' || error.message === 'No pending bonuses found') {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ 
        message: error.message || "Failed to redeem bonuses" 
      });
    }
  });

  app.post("/api/rewards/redeem-coupon", enhancedAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: "Coupon code is required" });
      }

      const result = await storage.redeemCoupon(userId, code);

      res.json({
        success: true,
        ...result,
        message: result.description,
      });
    } catch (error: any) {
      console.error("Error redeeming coupon:", error);
      
      res.status(400).json({ 
        message: error.message || "Failed to redeem coupon" 
      });
    }
  });

  // XP Endpoints
  app.post("/api/xp/claim", enhancedAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const result = await storage.claimDailyXp(userId);

      res.json({
        success: true,
        ...result,
        message: `Claimed ${result.xpAmount} XP!`,
      });
    } catch (error: any) {
      console.error("Error claiming XP:", error);
      
      res.status(400).json({ 
        message: error.message || "Failed to claim XP" 
      });
    }
  });

  app.post("/api/xp/convert", enhancedAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const { xpAmount } = req.body;
      if (!xpAmount || xpAmount <= 0) {
        return res.status(400).json({ message: "Valid XP amount is required" });
      }

      const result = await storage.convertXpToCash(userId, xpAmount);

      res.json({
        success: true,
        ...result,
        message: `Converted ${xpAmount} XP to $${parseFloat(result.convertedAmount).toFixed(2)}!`,
      });
    } catch (error: any) {
      console.error("Error converting XP:", error);
      
      res.status(400).json({ 
        message: error.message || "Failed to convert XP" 
      });
    }
  });

  app.get("/api/xp/history", enhancedAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const claims = await storage.getUserXpClaims(userId);
      res.json(claims);
    } catch (error: any) {
      console.error("Error fetching XP history:", error);
      res.status(500).json({ message: "Failed to fetch XP history" });
    }
  });

  // Deposit Endpoints
  app.post("/api/deposits/crypto", enhancedAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const { amount, cryptoAddress } = req.body;
      if (!amount || !cryptoAddress) {
        return res.status(400).json({ message: "Amount and crypto address are required" });
      }

      const deposit = await storage.processCryptoDeposit(userId, amount, cryptoAddress);

      res.json({
        success: true,
        deposit,
        message: `Crypto deposit request of $${parseFloat(amount).toFixed(2)} submitted! It will be reviewed by an admin.`,
      });
    } catch (error: any) {
      console.error("Error processing crypto deposit:", error);
      res.status(400).json({ message: error.message || "Failed to process crypto deposit" });
    }
  });

  app.post("/api/deposits/bank-transfer", enhancedAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const { amount, accountNumber, routingNumber, accountHolderName } = req.body;
      if (!amount || !accountNumber || !routingNumber || !accountHolderName) {
        return res.status(400).json({ message: "All bank transfer details are required" });
      }

      const bankDetails = { accountNumber, routingNumber, accountHolderName };
      const deposit = await storage.processBankTransferDeposit(userId, amount, bankDetails);

      res.json({
        success: true,
        deposit,
        message: `Bank transfer request of $${parseFloat(amount).toFixed(2)} submitted! It will be reviewed by an admin.`,
      });
    } catch (error: any) {
      console.error("Error processing bank transfer:", error);
      res.status(400).json({ message: error.message || "Failed to process bank transfer" });
    }
  });

  app.post("/api/deposits/card-payment", enhancedAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const { amount, stripeTransactionId } = req.body;
      if (!amount || !stripeTransactionId) {
        return res.status(400).json({ message: "Amount and transaction ID are required" });
      }

      const deposit = await storage.processCardPaymentDeposit(userId, amount, stripeTransactionId);

      res.json({
        success: true,
        deposit,
        message: `Card payment request of $${parseFloat(amount).toFixed(2)} submitted! It will be reviewed by an admin.`,
      });
    } catch (error: any) {
      console.error("Error processing card payment:", error);
      res.status(400).json({ message: error.message || "Failed to process card payment" });
    }
  });

  app.post("/api/deposits/coupon", enhancedAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const { couponCode } = req.body;
      if (!couponCode) {
        return res.status(400).json({ message: "Coupon code is required" });
      }

      const deposit = await storage.processDepositCouponDeposit(userId, couponCode);
      const user = await storage.getUser(userId);

      res.json({
        success: true,
        deposit,
        newBalance: user?.balance,
        message: `Coupon deposit of $${parseFloat(deposit.amount).toFixed(2)} completed successfully!`,
      });
    } catch (error: any) {
      console.error("Error processing coupon deposit:", error);
      res.status(400).json({ message: error.message || "Failed to process coupon deposit" });
    }
  });

  app.get("/api/deposits", enhancedAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const deposits = await storage.getUserDeposits(userId);
      res.json(deposits);
    } catch (error: any) {
      console.error("Error fetching deposits:", error);
      res.status(500).json({ message: "Failed to fetch deposits" });
    }
  });

  // Admin Deposit Management
  app.get("/api/admin/deposits", adminAuth, async (req, res) => {
    try {
      const deposits = await storage.getAllDeposits();
      res.json(deposits);
    } catch (error: any) {
      console.error("Error fetching all deposits:", error);
      res.status(500).json({ message: "Failed to fetch deposits" });
    }
  });

  app.post("/api/admin/deposits/:id/approve", adminAuth, async (req, res) => {
    try {
      const adminId = req.user?.claims?.sub || '';
      const deposit = await storage.approveDeposit(req.params.id, adminId);
      res.json({ success: true, deposit, message: "Deposit approved successfully" });
    } catch (error: any) {
      console.error("Error approving deposit:", error);
      res.status(400).json({ message: error.message || "Failed to approve deposit" });
    }
  });

  app.post("/api/admin/deposits/:id/reject", adminAuth, async (req, res) => {
    try {
      const adminId = req.user?.claims?.sub || '';
      const deposit = await storage.rejectDeposit(req.params.id, adminId);
      res.json({ success: true, deposit, message: "Deposit rejected successfully" });
    } catch (error: any) {
      console.error("Error rejecting deposit:", error);
      res.status(400).json({ message: error.message || "Failed to reject deposit" });
    }
  });

  // Withdrawal Endpoints
  app.post("/api/withdrawals", express.json(), enhancedAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const validationResult = insertWithdrawalSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid withdrawal data",
          errors: fromError(validationResult.error).toString()
        });
      }

      const { amount, withdrawMethod, destinationAddress } = validationResult.data;
      if (!amount || !withdrawMethod || !destinationAddress) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const withdrawal = await storage.processWithdrawal(userId, amount, withdrawMethod, destinationAddress);

      res.json({
        success: true,
        withdrawal,
        message: `Withdrawal request of $${parseFloat(amount).toFixed(2)} submitted successfully!`,
      });
    } catch (error: any) {
      console.error("Error processing withdrawal:", error);
      res.status(400).json({ message: error.message || "Failed to process withdrawal" });
    }
  });

  app.get("/api/withdrawals", enhancedAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const withdrawals = await storage.getUserWithdrawals(userId);
      res.json(withdrawals);
    } catch (error: any) {
      console.error("Error fetching withdrawals:", error);
      res.status(500).json({ message: "Failed to fetch withdrawals" });
    }
  });

  // Admin Coupon Management
  app.get("/api/admin/coupons", adminAuth, async (req, res) => {
    try {
      const coupons = await storage.getAllCoupons();
      res.json(coupons);
    } catch (error: any) {
      console.error("Error fetching coupons:", error);
      res.status(500).json({ message: "Failed to fetch coupons" });
    }
  });

  app.post("/api/admin/coupons", adminAuth, async (req, res) => {
    try {
      const coupon = await storage.createCoupon(req.body);
      res.json(coupon);
    } catch (error: any) {
      console.error("Error creating coupon:", error);
      res.status(500).json({ message: error.message || "Failed to create coupon" });
    }
  });

  app.patch("/api/admin/coupons/:id", adminAuth, async (req, res) => {
    try {
      const coupon = await storage.updateCoupon(req.params.id, req.body);
      res.json(coupon);
    } catch (error: any) {
      console.error("Error updating coupon:", error);
      res.status(500).json({ message: error.message || "Failed to update coupon" });
    }
  });

  app.delete("/api/admin/coupons/:id", adminAuth, async (req, res) => {
    try {
      await storage.deleteCoupon(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting coupon:", error);
      res.status(500).json({ message: "Failed to delete coupon" });
    }
  });

  // Admin Settings Management
  app.get("/api/admin/settings", adminAuth, async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.get("/api/admin/settings/:key", adminAuth, async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json(setting);
    } catch (error: any) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  app.post("/api/admin/settings", adminAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user?.claims?.sub;
      const setting = await storage.setSetting({
        ...req.body,
        updatedBy: userId,
      });
      res.json(setting);
    } catch (error: any) {
      console.error("Error saving setting:", error);
      res.status(500).json({ message: error.message || "Failed to save setting" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
