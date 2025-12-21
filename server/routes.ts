import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import YahooFinance from "yahoo-finance2";
import PDFDocument from "pdfkit";

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
  // Check for admin session first (from admin login)
  if (req.session.adminUser) {
    const adminUser = req.session.adminUser;
    req.user = {
      claims: {
        sub: adminUser.id,
        email: adminUser.email,
        authType: 'admin'
      }
    };
    return next();
  }
  
  // Check for password-based user session with admin role
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
    // Join code for joining an existing joint account
    joinCode: z.string().optional(),
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
        taxId,
        joinCode
      } = validatedData;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }
      
      // If joining via join code, verify the code exists
      let existingJointAccount = null;
      if (joinCode) {
        existingJointAccount = await storage.getJointAccountByJoinCode(joinCode.toUpperCase());
        if (!existingJointAccount) {
          return res.status(400).json({ message: "Invalid join code" });
        }
      }
      
      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Create user with accountType (if joining via code, treat as personal account type)
      const user = await storage.createUser({
        email,
        firstName,
        lastName,
        passwordHash,
        authType: 'password',
        profileImageUrl: null,
        accountType: joinCode ? 'personal' : (accountType || 'personal'),
        businessName: accountType === 'business' ? businessName : null,
        businessType: accountType === 'business' ? businessType : null,
        taxId: accountType === 'business' ? taxId : null,
      });
      
      // If user registered with a join code, add them to the existing joint account
      let jointAccount = null;
      if (existingJointAccount) {
        await storage.joinJointAccountByCode(user.id, joinCode!.toUpperCase());
        jointAccount = existingJointAccount;
        console.log(`User ${user.id} joined joint account ${jointAccount.id} via join code`);
      }
      // If creating a new joint account
      else if (accountType === 'joint') {
        const partnerName = spouseFirstName && spouseLastName ? `${spouseFirstName} ${spouseLastName}` : 'Partner';
        const jointAccountName = `${firstName} ${lastName} & ${partnerName}`;
        const jointAccountDescription = relationshipType 
          ? `Joint ${relationshipType.replace('_', ' ')} account` 
          : 'Joint account';
        
        jointAccount = await storage.createJointAccount({
          name: jointAccountName,
          description: jointAccountDescription,
          createdBy: user.id,
          partnerEmail: spouseEmail || null,
          relationshipType: relationshipType || null,
        });
        
        console.log(`Created joint account ${jointAccount.id} for user ${user.id} with join code: ${jointAccount.joinCode}`);
        if (spouseEmail) {
          console.log(`Partner email: ${spouseEmail} - they can join using code: ${jointAccount.joinCode}`);
        }
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
        if (existingJointAccount) {
          response.message = `Successfully joined the joint account!`;
          response.joinedExisting = true;
        } else {
          response.message = `Joint account created! Share this join code with your partner: ${jointAccount.joinCode}`;
        }
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

  // Check if email exists and return user name for multi-step login
  app.post('/api/auth/check-email', async (req: any, res) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "No account found with this email", exists: false });
      }
      
      // Return user's first name for personalized greeting
      res.json({ 
        exists: true, 
        firstName: user.firstName || 'User',
        lastName: user.lastName || ''
      });
    } catch (error: any) {
      console.error("Email check error:", error);
      res.status(500).json({ message: "Failed to check email" });
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
      
      // Check if KYC is approved (skip for admin users)
      if (user.role !== 'admin' && user.kycStatus !== 'approved') {
        if (user.kycStatus === 'pending') {
          return res.status(403).json({ 
            message: "Your account is pending KYC approval. Please wait for an administrator to review your application.",
            kycStatus: 'pending'
          });
        } else if (user.kycStatus === 'rejected') {
          return res.status(403).json({ 
            message: "Your KYC application has been rejected. Please contact support for more information.",
            kycStatus: 'rejected'
          });
        }
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

  // Generate monthly investment report as PDF
  app.post('/api/portfolios/:id/report', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const portfolioId = req.params.id;
      
      // Get user's portfolio investment
      const userPortfolios = await storage.getUserPortfolios(userId);
      const userInvestment = userPortfolios.find((up: any) => up.portfolio?.id === portfolioId);
      
      if (!userInvestment) {
        return res.status(404).json({ message: "You have not invested in this portfolio" });
      }

      // Get portfolio details
      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }

      // Get user details for gamification
      const user = await storage.getUser(userId);
      const xpBalance = parseFloat(user?.xpBalance || '0');
      const totalInvested = parseFloat(user?.walletBalance || '0') + parseFloat(userInvestment.investedAmount);

      // Calculate investment tier based on total invested
      let investorTier = 'Bronze';
      let tierColor = [205, 127, 50];
      if (totalInvested >= 100000) { investorTier = 'Platinum'; tierColor = [229, 228, 226]; }
      else if (totalInvested >= 50000) { investorTier = 'Gold'; tierColor = [255, 215, 0]; }
      else if (totalInvested >= 10000) { investorTier = 'Silver'; tierColor = [192, 192, 192]; }

      const currentDate = new Date();
      const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      const investedAmount = parseFloat(userInvestment.investedAmount);
      const currentValue = parseFloat(userInvestment.currentValue);
      const returns = parseFloat(userInvestment.returns || '0');
      const returnPercentage = ((returns / investedAmount) * 100).toFixed(2);

      // Create PDF document
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="investment-report-${monthYear.replace(' ', '-')}.pdf"`);
      
      doc.pipe(res);

      // Header with branding
      doc.fillColor('#0066cc').fontSize(28).font('Helvetica-Bold').text('REFLUX CAPITAL', 50, 50);
      doc.fillColor('#666666').fontSize(10).font('Helvetica').text('INVESTMENT BROKERAGE & ADVISORY', 50, 82);
      
      // Decorative line
      doc.strokeColor('#0066cc').lineWidth(3).moveTo(50, 100).lineTo(545, 100).stroke();
      
      // Report title
      doc.fillColor('#333333').fontSize(20).font('Helvetica-Bold').text('Monthly Investment Report', 50, 120);
      doc.fillColor('#666666').fontSize(12).font('Helvetica').text(monthYear, 50, 145);
      doc.text(`Generated: ${currentDate.toLocaleDateString('en-US')}`, 50, 160);

      // Gamification Section - Investor Badge
      doc.roundedRect(380, 115, 165, 60, 8).fillAndStroke(`rgb(${tierColor[0]}, ${tierColor[1]}, ${tierColor[2]})`, '#333333');
      doc.fillColor('#333333').fontSize(10).font('Helvetica').text('INVESTOR STATUS', 390, 125, { width: 145, align: 'center' });
      doc.fontSize(16).font('Helvetica-Bold').text(investorTier.toUpperCase(), 390, 142, { width: 145, align: 'center' });
      doc.fontSize(9).font('Helvetica').text(`${xpBalance.toLocaleString()} XP`, 390, 162, { width: 145, align: 'center' });

      // Portfolio Summary Box
      doc.roundedRect(50, 195, 495, 100, 8).fill('#f8f9fa');
      doc.fillColor('#0066cc').fontSize(14).font('Helvetica-Bold').text('Portfolio Summary', 65, 210);
      
      doc.fillColor('#666666').fontSize(11).font('Helvetica');
      doc.text('Portfolio:', 65, 235).fillColor('#333333').font('Helvetica-Bold').text(portfolio.name, 150, 235);
      doc.fillColor('#666666').font('Helvetica').text('Strategy:', 65, 255).fillColor('#333333').font('Helvetica-Bold').text(portfolio.strategyTag || 'General', 150, 255);
      doc.fillColor('#666666').font('Helvetica').text('Risk Level:', 65, 275).fillColor('#333333').font('Helvetica-Bold').text(portfolio.riskLevel.toUpperCase(), 150, 275);
      
      doc.fillColor('#666666').font('Helvetica').text('Current Return:', 320, 235).fillColor('#22c55e').font('Helvetica-Bold').text(`+${portfolio.currentReturn}%`, 420, 235);
      doc.fillColor('#666666').font('Helvetica').text('Assets:', 320, 255);
      const assets = Array.isArray(portfolio.assets) ? portfolio.assets : [];
      doc.fillColor('#333333').font('Helvetica-Bold').text(`${assets.length} Holdings`, 420, 255);

      // Investment Performance Section
      doc.fillColor('#0066cc').fontSize(14).font('Helvetica-Bold').text('Investment Performance', 50, 320);
      doc.strokeColor('#eeeeee').lineWidth(1).moveTo(50, 340).lineTo(545, 340).stroke();

      // Performance metrics grid
      const metrics = [
        { label: 'Invested Amount', value: `$${investedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: '#333333' },
        { label: 'Current Value', value: `$${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: '#0066cc' },
        { label: 'Total Returns', value: `+$${returns.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: '#22c55e' },
        { label: 'Return Rate', value: `+${returnPercentage}%`, color: '#22c55e' },
      ];

      let yPos = 355;
      metrics.forEach((metric, i) => {
        const xPos = i % 2 === 0 ? 50 : 300;
        if (i === 2) yPos += 45;
        
        doc.roundedRect(xPos, yPos, 230, 40, 5).fill('#f8f9fa');
        doc.fillColor('#666666').fontSize(10).font('Helvetica').text(metric.label, xPos + 15, yPos + 8);
        doc.fillColor(metric.color).fontSize(16).font('Helvetica-Bold').text(metric.value, xPos + 15, yPos + 22);
      });

      // Gamification Achievements Section
      doc.fillColor('#0066cc').fontSize(14).font('Helvetica-Bold').text('Your Achievements', 50, 465);
      doc.strokeColor('#eeeeee').lineWidth(1).moveTo(50, 485).lineTo(545, 485).stroke();

      // Achievement badges
      const achievements = [];
      if (investedAmount >= 1000) achievements.push({ name: 'First Investor', icon: '🏆', desc: 'Made your first investment' });
      if (returns > 0) achievements.push({ name: 'Profit Maker', icon: '📈', desc: 'Earned positive returns' });
      if (xpBalance >= 100) achievements.push({ name: 'XP Collector', icon: '⭐', desc: 'Collected 100+ XP points' });
      if (investedAmount >= 5000) achievements.push({ name: 'Serious Investor', icon: '💎', desc: 'Invested $5,000+' });
      
      if (achievements.length === 0) {
        achievements.push({ name: 'Getting Started', icon: '🚀', desc: 'Your investment journey begins!' });
      }

      let achY = 500;
      achievements.slice(0, 3).forEach((ach, i) => {
        doc.roundedRect(50 + (i * 170), achY, 160, 50, 5).fillAndStroke('#fff9e6', '#ffc107');
        doc.fontSize(20).text(ach.icon, 60 + (i * 170), achY + 8);
        doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold').text(ach.name, 85 + (i * 170), achY + 10, { width: 115 });
        doc.fillColor('#666666').fontSize(8).font('Helvetica').text(ach.desc, 85 + (i * 170), achY + 25, { width: 115 });
      });

      // XP Progress Section
      doc.fillColor('#0066cc').fontSize(14).font('Helvetica-Bold').text('XP Progress', 50, 575);
      doc.strokeColor('#eeeeee').lineWidth(1).moveTo(50, 595).lineTo(545, 595).stroke();

      const nextTierXP = xpBalance < 500 ? 500 : xpBalance < 1000 ? 1000 : xpBalance < 5000 ? 5000 : 10000;
      const progress = Math.min((xpBalance / nextTierXP) * 100, 100);

      doc.fillColor('#666666').fontSize(10).font('Helvetica').text(`${xpBalance.toLocaleString()} XP / ${nextTierXP.toLocaleString()} XP to next level`, 50, 610);
      
      // Progress bar
      doc.roundedRect(50, 630, 495, 15, 5).fill('#e0e0e0');
      doc.roundedRect(50, 630, 495 * (progress / 100), 15, 5).fill('#0066cc');

      // Daily bonus reminder
      doc.roundedRect(50, 660, 495, 40, 5).fillAndStroke('#e6f7ff', '#0066cc');
      doc.fillColor('#0066cc').fontSize(11).font('Helvetica-Bold').text('💰 Daily Bonus Reminder', 65, 670);
      doc.fillColor('#333333').fontSize(9).font('Helvetica').text('Claim your $100 daily bonus and 50 XP in the Rewards section!', 65, 685);

      // Footer
      doc.strokeColor('#eeeeee').lineWidth(1).moveTo(50, 720).lineTo(545, 720).stroke();
      doc.fillColor('#999999').fontSize(8).font('Helvetica')
        .text('This report is for informational purposes only. Past performance does not guarantee future results.', 50, 730, { width: 495, align: 'center' })
        .text(`© ${currentDate.getFullYear()} Reflux Capital. All rights reserved. | Member SIPC`, 50, 745, { width: 495, align: 'center' });

      doc.end();
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Generate investment statement as PDF
  app.post('/api/portfolios/:id/statement', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const portfolioId = req.params.id;
      
      // Get user's portfolio investment
      const userPortfolios = await storage.getUserPortfolios(userId);
      const userInvestment = userPortfolios.find((up: any) => up.portfolio?.id === portfolioId);
      
      if (!userInvestment) {
        return res.status(404).json({ message: "You have not invested in this portfolio" });
      }

      // Get portfolio details
      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }

      // Get user details
      const user = await storage.getUser(userId);
      const xpBalance = parseFloat(user?.xpBalance || '0');
      const dailyBonusBalance = parseFloat(user?.dailyBonusBalance || '0');

      // Calculate investor tier
      const totalInvested = parseFloat(user?.walletBalance || '0') + parseFloat(userInvestment.investedAmount);
      let investorTier = 'Bronze';
      let tierColor = [205, 127, 50];
      if (totalInvested >= 100000) { investorTier = 'Platinum'; tierColor = [229, 228, 226]; }
      else if (totalInvested >= 50000) { investorTier = 'Gold'; tierColor = [255, 215, 0]; }
      else if (totalInvested >= 10000) { investorTier = 'Silver'; tierColor = [192, 192, 192]; }

      const currentDate = new Date();
      const statementDate = currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      const investedAmount = parseFloat(userInvestment.investedAmount);
      const currentValue = parseFloat(userInvestment.currentValue);
      const returns = parseFloat(userInvestment.returns || '0');
      const returnPercentage = ((returns / investedAmount) * 100).toFixed(2);
      const investmentDate = new Date(userInvestment.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Create PDF document
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="investment-statement-${currentDate.toISOString().slice(0, 10)}.pdf"`);
      
      doc.pipe(res);

      // Header with branding
      doc.fillColor('#0066cc').fontSize(28).font('Helvetica-Bold').text('REFLUX CAPITAL', 50, 50);
      doc.fillColor('#666666').fontSize(10).font('Helvetica').text('INVESTMENT BROKERAGE & ADVISORY', 50, 82);
      
      // Decorative line
      doc.strokeColor('#0066cc').lineWidth(3).moveTo(50, 100).lineTo(545, 100).stroke();
      
      // Statement title
      doc.fillColor('#333333').fontSize(22).font('Helvetica-Bold').text('Investment Statement', 50, 115);
      doc.fillColor('#666666').fontSize(11).font('Helvetica').text(statementDate, 50, 140);

      // Investor tier badge
      doc.roundedRect(400, 110, 145, 45, 8).fillAndStroke(`rgb(${tierColor[0]}, ${tierColor[1]}, ${tierColor[2]})`, '#333333');
      doc.fillColor('#333333').fontSize(9).font('Helvetica').text('INVESTOR TIER', 410, 118, { width: 125, align: 'center' });
      doc.fontSize(14).font('Helvetica-Bold').text(investorTier.toUpperCase(), 410, 133, { width: 125, align: 'center' });

      // Account Information Section
      doc.roundedRect(50, 170, 495, 90, 8).fill('#f8f9fa');
      doc.fillColor('#0066cc').fontSize(12).font('Helvetica-Bold').text('Account Information', 65, 180);
      doc.strokeColor('#dddddd').lineWidth(0.5).moveTo(65, 195).lineTo(530, 195).stroke();
      
      doc.fillColor('#666666').fontSize(10).font('Helvetica');
      doc.text('Account Holder:', 65, 210).fillColor('#333333').font('Helvetica-Bold').text(`${user?.firstName || 'Investor'} ${user?.lastName || ''}`, 170, 210);
      doc.fillColor('#666666').font('Helvetica').text('Account ID:', 65, 228).fillColor('#333333').font('Helvetica-Bold').text(userId.substring(0, 8).toUpperCase(), 170, 228);
      doc.fillColor('#666666').font('Helvetica').text('Statement Period:', 65, 246).fillColor('#333333').font('Helvetica-Bold').text(`${investmentDate} - Present`, 170, 246);
      
      doc.fillColor('#666666').font('Helvetica').text('XP Balance:', 320, 210).fillColor('#0066cc').font('Helvetica-Bold').text(`${xpBalance.toLocaleString()} XP`, 410, 210);
      doc.fillColor('#666666').font('Helvetica').text('Bonus Balance:', 320, 228).fillColor('#22c55e').font('Helvetica-Bold').text(`$${dailyBonusBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 410, 228);

      // Portfolio Details Section
      doc.roundedRect(50, 275, 495, 75, 8).fill('#f8f9fa');
      doc.fillColor('#0066cc').fontSize(12).font('Helvetica-Bold').text('Portfolio Details', 65, 285);
      doc.strokeColor('#dddddd').lineWidth(0.5).moveTo(65, 300).lineTo(530, 300).stroke();
      
      doc.fillColor('#666666').fontSize(10).font('Helvetica');
      doc.text('Portfolio:', 65, 315).fillColor('#333333').font('Helvetica-Bold').text(portfolio.name, 150, 315);
      doc.fillColor('#666666').font('Helvetica').text('Strategy:', 65, 333).fillColor('#333333').font('Helvetica-Bold').text(portfolio.strategyTag || 'General', 150, 333);
      
      doc.fillColor('#666666').font('Helvetica').text('Risk Level:', 320, 315).fillColor('#333333').font('Helvetica-Bold').text(portfolio.riskLevel.toUpperCase(), 410, 315);
      doc.fillColor('#666666').font('Helvetica').text('Investment Date:', 320, 333).fillColor('#333333').font('Helvetica-Bold').text(investmentDate, 410, 333);

      // Current Value Highlight Box
      doc.roundedRect(50, 365, 495, 80, 8).fill('#0066cc');
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica').text('CURRENT PORTFOLIO VALUE', 65, 380);
      doc.fontSize(32).font('Helvetica-Bold').text(`$${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 65, 400);
      doc.fillColor('#4ade80').fontSize(14).font('Helvetica-Bold').text(`+$${returns.toLocaleString('en-US', { minimumFractionDigits: 2 })} (+${returnPercentage}%)`, 65, 432);
      doc.fillColor('#ffffff').fontSize(10).font('Helvetica').text('since investment', 240, 434);

      // Performance Metrics Grid
      doc.fillColor('#0066cc').fontSize(12).font('Helvetica-Bold').text('Performance Breakdown', 50, 465);
      doc.strokeColor('#eeeeee').lineWidth(1).moveTo(50, 480).lineTo(545, 480).stroke();

      const perfMetrics = [
        { label: 'Original Investment', value: `$${investedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
        { label: 'Current Value', value: `$${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
        { label: 'Total Returns', value: `+$${returns.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      ];

      perfMetrics.forEach((metric, i) => {
        const xPos = 50 + (i * 170);
        doc.roundedRect(xPos, 495, 155, 50, 5).fill('#f8f9fa');
        doc.fillColor('#666666').fontSize(9).font('Helvetica').text(metric.label, xPos + 10, 505);
        doc.fillColor('#333333').fontSize(14).font('Helvetica-Bold').text(metric.value, xPos + 10, 522);
      });

      // Gamification Rewards Section
      doc.fillColor('#0066cc').fontSize(12).font('Helvetica-Bold').text('Your Rewards & Achievements', 50, 565);
      doc.strokeColor('#eeeeee').lineWidth(1).moveTo(50, 580).lineTo(545, 580).stroke();

      // XP and Bonus info
      doc.roundedRect(50, 595, 240, 65, 5).fillAndStroke('#e6f7ff', '#0066cc');
      doc.fillColor('#0066cc').fontSize(10).font('Helvetica-Bold').text('XP REWARDS', 65, 605);
      doc.fillColor('#333333').fontSize(18).font('Helvetica-Bold').text(`${xpBalance.toLocaleString()} XP`, 65, 625);
      doc.fillColor('#666666').fontSize(8).font('Helvetica').text('Earn 50 XP daily by claiming rewards!', 65, 648);

      doc.roundedRect(305, 595, 240, 65, 5).fillAndStroke('#f0fff4', '#22c55e');
      doc.fillColor('#22c55e').fontSize(10).font('Helvetica-Bold').text('DAILY BONUS', 320, 605);
      doc.fillColor('#333333').fontSize(18).font('Helvetica-Bold').text(`$${dailyBonusBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 320, 625);
      doc.fillColor('#666666').fontSize(8).font('Helvetica').text('Claim $100 daily in the Rewards section!', 320, 648);

      // Achievement badges
      const achievements = [];
      if (investedAmount >= 1000) achievements.push('First Investor');
      if (returns > 0) achievements.push('Profit Maker');
      if (xpBalance >= 100) achievements.push('XP Collector');
      if (dailyBonusBalance >= 500) achievements.push('Bonus Hunter');

      if (achievements.length > 0) {
        doc.fillColor('#666666').fontSize(9).font('Helvetica').text('Unlocked Badges: ', 50, 680);
        doc.fillColor('#ffc107').font('Helvetica-Bold').text(achievements.join(' • '), 135, 680);
      }

      // Footer
      doc.strokeColor('#eeeeee').lineWidth(1).moveTo(50, 720).lineTo(545, 720).stroke();
      doc.fillColor('#999999').fontSize(8).font('Helvetica')
        .text('This statement is for informational purposes only and does not constitute investment advice.', 50, 730, { width: 495, align: 'center' })
        .text(`© ${currentDate.getFullYear()} Reflux Capital. All rights reserved. | Member SIPC`, 50, 745, { width: 495, align: 'center' });

      doc.end();
    } catch (error) {
      console.error("Error generating statement:", error);
      res.status(500).json({ message: "Failed to generate statement" });
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

  // Public endpoint to verify join code (no auth required) - used for shareable links
  app.get('/api/joint-accounts/verify/:joinCode', async (req: any, res) => {
    try {
      const { joinCode } = req.params;
      
      if (!joinCode || typeof joinCode !== 'string') {
        return res.status(400).json({ message: "Join code is required", valid: false });
      }
      
      const jointAccount = await storage.getJointAccountByJoinCode(joinCode.toUpperCase());
      
      if (!jointAccount) {
        return res.status(404).json({ message: "Invalid join code", valid: false });
      }
      
      // Return basic info about the joint account (not sensitive data)
      res.json({
        valid: true,
        jointAccountName: jointAccount.name,
        relationshipType: jointAccount.relationshipType,
        joinCode: jointAccount.joinCode,
      });
    } catch (error: any) {
      console.error("Error verifying join code:", error);
      res.status(500).json({ message: "Failed to verify join code", valid: false });
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
  app.get('/api/admin/stock-purchases/pending', adminAuth, async (req: any, res) => {
    try {
      const pendingPurchases = await storage.getPendingStockPurchases();
      res.json(pendingPurchases);
    } catch (error) {
      console.error("Error fetching pending stock purchases:", error);
      res.status(500).json({ message: "Failed to fetch pending stock purchases" });
    }
  });

  app.patch('/api/admin/stock-purchases/:id/approve', adminAuth, async (req: any, res) => {
    try {
      const purchaseId = req.params.id;
      const updatedPurchase = await storage.updateStockPurchaseStatus(purchaseId, 'approved');
      res.json(updatedPurchase);
    } catch (error) {
      console.error("Error approving stock purchase:", error);
      res.status(500).json({ message: "Failed to approve stock purchase" });
    }
  });

  app.patch('/api/admin/stock-purchases/:id/reject', adminAuth, async (req: any, res) => {
    try {
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

  // Bank transfer settings - public endpoint to get deposit info
  app.get('/api/settings/bank-transfer', async (req, res) => {
    try {
      const settings = {
        bankName: await storage.getSetting('bank_transfer_bank_name'),
        accountName: await storage.getSetting('bank_transfer_account_name'),
        accountNumber: await storage.getSetting('bank_transfer_account_number'),
        routingNumber: await storage.getSetting('bank_transfer_routing_number'),
        swiftCode: await storage.getSetting('bank_transfer_swift_code'),
        bankAddress: await storage.getSetting('bank_transfer_bank_address'),
        instructions: await storage.getSetting('bank_transfer_instructions'),
      };
      
      res.json({
        bankName: settings.bankName?.settingValue || 'Reflux Capital Bank',
        accountName: settings.accountName?.settingValue || 'Reflux Capital LLC',
        accountNumber: settings.accountNumber?.settingValue || '8827364519',
        routingNumber: settings.routingNumber?.settingValue || '021000021',
        swiftCode: settings.swiftCode?.settingValue || 'CHASUS33',
        bankAddress: settings.bankAddress?.settingValue || '270 Park Avenue, New York, NY 10017',
        instructions: settings.instructions?.settingValue || 'Please include your account ID in the transfer reference. Deposits are typically credited within 1-3 business days.',
      });
    } catch (error) {
      console.error("Error fetching bank transfer settings:", error);
      res.status(500).json({ message: "Failed to fetch bank transfer settings" });
    }
  });

  // Admin endpoint to update bank transfer settings
  app.put('/api/admin/settings/bank-transfer', adminAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { bankName, accountName, accountNumber, routingNumber, swiftCode, bankAddress, instructions } = req.body;

      const settingsToUpdate = [
        { key: 'bank_transfer_bank_name', value: bankName, description: 'Bank name for deposits' },
        { key: 'bank_transfer_account_name', value: accountName, description: 'Account holder name for deposits' },
        { key: 'bank_transfer_account_number', value: accountNumber, description: 'Account number for deposits' },
        { key: 'bank_transfer_routing_number', value: routingNumber, description: 'Routing number for deposits' },
        { key: 'bank_transfer_swift_code', value: swiftCode, description: 'SWIFT/BIC code for international transfers' },
        { key: 'bank_transfer_bank_address', value: bankAddress, description: 'Bank address for deposits' },
        { key: 'bank_transfer_instructions', value: instructions, description: 'Instructions for bank transfers' },
      ];

      for (const setting of settingsToUpdate) {
        if (setting.value !== undefined) {
          await storage.setSetting({
            settingKey: setting.key,
            settingValue: setting.value,
            description: setting.description,
            updatedBy: userId,
          });
        }
      }

      res.json({ message: "Bank transfer settings updated successfully" });
    } catch (error) {
      console.error("Error updating bank transfer settings:", error);
      res.status(500).json({ message: "Failed to update bank transfer settings" });
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

      const { amount, withdrawMethod, destinationAddress, metadata } = validationResult.data;
      if (!amount || !withdrawMethod || !destinationAddress) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const withdrawal = await storage.processWithdrawal(userId, amount, withdrawMethod, destinationAddress, metadata);

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

  // Admin Rewards Management
  app.get("/api/admin/rewards/stats", adminAuth, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      
      let totalDailyBonusesClaimed = 0;
      let totalDailyBonusAmount = 0;
      let totalXpClaimed = 0;
      let activeDailyClaimers = 0;
      
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      for (const user of allUsers) {
        totalDailyBonusAmount += parseFloat(user.accumulatedDailyBonus || '0');
        totalXpClaimed += parseFloat(user.xpBalance || '0');
        
        if (user.lastDailyRewardClaim) {
          const lastClaim = new Date(user.lastDailyRewardClaim);
          if (lastClaim >= oneDayAgo) {
            activeDailyClaimers++;
          }
        }
      }
      
      res.json({
        totalDailyBonusesClaimed: allUsers.filter(u => parseFloat(u.accumulatedDailyBonus || '0') > 0).length,
        totalDailyBonusAmount: totalDailyBonusAmount.toString(),
        totalXpClaimed,
        totalXpConverted: 0,
        activeDailyClaimers,
      });
    } catch (error: any) {
      console.error("Error fetching reward stats:", error);
      res.status(500).json({ message: "Failed to fetch reward stats" });
    }
  });

  app.get("/api/admin/rewards/top-users", adminAuth, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      
      const topUsers = allUsers
        .filter(u => parseFloat(u.xpBalance || '0') > 0 || parseFloat(u.dailyBonusBalance || '0') > 0)
        .sort((a, b) => parseFloat(b.xpBalance || '0') - parseFloat(a.xpBalance || '0'))
        .slice(0, 10)
        .map(u => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          xpBalance: u.xpBalance,
          dailyBonusBalance: u.dailyBonusBalance,
          accumulatedDailyBonus: u.accumulatedDailyBonus,
          lastDailyRewardClaim: u.lastDailyRewardClaim,
        }));
      
      res.json(topUsers);
    } catch (error: any) {
      console.error("Error fetching top reward users:", error);
      res.status(500).json({ message: "Failed to fetch top users" });
    }
  });

  app.patch("/api/admin/rewards/settings", adminAuth, async (req, res) => {
    try {
      const { dailyBonusAmount, xpPerClaim } = req.body;
      
      if (dailyBonusAmount) {
        await storage.setSetting({
          key: 'daily_bonus_amount',
          value: dailyBonusAmount,
          updatedBy: 'admin',
        });
      }
      
      if (xpPerClaim) {
        await storage.setSetting({
          key: 'xp_per_claim',
          value: xpPerClaim,
          updatedBy: 'admin',
        });
      }
      
      res.json({ success: true, message: "Reward settings updated" });
    } catch (error: any) {
      console.error("Error updating reward settings:", error);
      res.status(500).json({ message: "Failed to update reward settings" });
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

  // Email Settings and Notifications
  const emailConfigSchema = z.object({
    email_smtp_host: z.string().optional(),
    email_smtp_port: z.string().optional(),
    email_smtp_secure: z.enum(['true', 'false']).optional(),
    email_smtp_user: z.string().optional(),
    email_smtp_pass: z.string().optional(),
    email_from_address: z.string().email().optional().or(z.literal('')),
    email_from_name: z.string().optional(),
    email_welcome_enabled: z.enum(['true', 'false']).optional(),
    email_deposit_enabled: z.enum(['true', 'false']).optional(),
    email_stock_enabled: z.enum(['true', 'false']).optional(),
    email_rewards_enabled: z.enum(['true', 'false']).optional(),
  });

  app.get("/api/admin/email/config", adminAuth, async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      const emailSettings: Record<string, string | boolean> = {};
      
      const emailKeys = [
        'email_smtp_host', 'email_smtp_port', 'email_smtp_secure',
        'email_smtp_user', 'email_from_address', 'email_from_name',
        'email_welcome_enabled', 'email_deposit_enabled', 
        'email_stock_enabled', 'email_rewards_enabled'
      ];
      
      for (const setting of settings) {
        if (emailKeys.includes(setting.settingKey)) {
          emailSettings[setting.settingKey] = setting.settingValue;
        }
      }
      
      const hasPassword = settings.some(s => s.settingKey === 'email_smtp_pass' && s.settingValue);
      emailSettings.has_smtp_password = hasPassword;
      
      res.json(emailSettings);
    } catch (error: any) {
      console.error("Error fetching email config:", error);
      res.status(500).json({ message: "Failed to fetch email configuration" });
    }
  });

  app.post("/api/admin/email/config", adminAuth, async (req: any, res) => {
    try {
      const { settings } = req.body;
      const userId = req.user?.claims?.sub || 'admin';
      
      const validationResult = emailConfigSchema.safeParse(settings);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid email configuration", 
          errors: validationResult.error.errors 
        });
      }

      const validatedSettings = validationResult.data;
      
      for (const [key, value] of Object.entries(validatedSettings)) {
        if (key === 'email_smtp_pass' && (!value || value === '')) {
          continue;
        }
        
        if (value !== undefined) {
          await storage.setSetting({
            key,
            value: value as string,
            updatedBy: userId,
          });
        }
      }
      
      res.json({ success: true, message: "Email settings saved successfully" });
    } catch (error: any) {
      console.error("Error saving email config:", error);
      res.status(500).json({ message: "Failed to save email configuration" });
    }
  });

  app.post("/api/admin/email/test", adminAuth, async (req: any, res) => {
    try {
      const { emailService } = await import('./email');
      const result = await emailService.testConnection();
      
      if (result.success) {
        res.json({ success: true, message: "SMTP connection successful" });
      } else {
        res.status(400).json({ success: false, message: result.error });
      }
    } catch (error: any) {
      console.error("Error testing email:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/admin/email/send-test", adminAuth, async (req: any, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email address required" });
      }

      const { emailService } = await import('./email');
      const result = await emailService.sendEmail({
        to: email,
        subject: 'Test Email from Reflux Capital',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a;">Test Email</h1>
            <p style="color: #333; font-size: 16px;">
              This is a test email from Reflux Capital. If you received this, your email configuration is working correctly!
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Sent at: ${new Date().toLocaleString()}
            </p>
          </div>
        `,
      });
      
      if (result.success) {
        res.json({ success: true, message: "Test email sent successfully" });
      } else {
        res.status(400).json({ success: false, message: result.error });
      }
    } catch (error: any) {
      console.error("Error sending test email:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
