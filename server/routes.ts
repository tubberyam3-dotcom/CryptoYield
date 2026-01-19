import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import yahooFinance from "yahoo-finance2";
import PDFDocument from "pdfkit";

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
        
        // Return user without password hash and xpCode (security: xpCode must never be exposed)
        const { passwordHash, xpCode, ...userWithoutSensitiveData } = user;
        return res.json({
          ...userWithoutSensitiveData,
          hasXpCode: !!xpCode,
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
      
      // Return user without xpCode (security: xpCode must never be exposed)
      const { xpCode, ...userWithoutXpCode } = user || {};
      res.json({
        ...userWithoutXpCode,
        hasXpCode: !!xpCode,
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

  // Admin login route
  app.post('/api/admin/auth/login', async (req: any, res) => {
    try {
      const { username, password } = req.body;
      
      // Master admin credentials from environment
      const MASTER_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@refluxcapital.com';
      const MASTER_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
      
      if (MASTER_ADMIN_PASSWORD && username === MASTER_ADMIN_EMAIL && password === MASTER_ADMIN_PASSWORD) {
        // Check if admin exists in database, if not create it
        let adminUser = await storage.getUserByEmail(MASTER_ADMIN_EMAIL);
        
        if (!adminUser) {
          // Create admin user if it doesn't exist
          const hashedPassword = await bcrypt.hash(MASTER_ADMIN_PASSWORD!, 10);
          adminUser = await storage.createUser({
            email: MASTER_ADMIN_EMAIL,
            firstName: 'Admin',
            lastName: 'User',
            passwordHash: hashedPassword,
            role: 'admin',
            kycStatus: 'approved',
          });
        }
        
        const safeAdmin = {
          id: adminUser?.id || 'master-admin',
          email: MASTER_ADMIN_EMAIL,
          firstName: adminUser?.firstName || 'Admin',
          lastName: adminUser?.lastName || 'User',
          profileImageUrl: adminUser?.profileImageUrl || null,
          role: 'admin',
          kycStatus: 'approved',
          createdAt: adminUser?.createdAt || new Date(),
          updatedAt: adminUser?.updatedAt || new Date()
        };
        
        req.session.adminUser = safeAdmin;
        return res.json(safeAdmin);
      }
      
      // Check for admin user in database by email
      const adminUser = await storage.getUserByEmail(username);
      
      if (!adminUser) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }
      
      // Verify user has admin role
      if (adminUser.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
      
      // Verify password
      if (!adminUser.passwordHash) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }
      
      const isValidPassword = await bcrypt.compare(password, adminUser.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }
      
      // Set admin session
      const { passwordHash: _, xpCode: __, ...safeAdmin } = adminUser;
      req.session.adminUser = safeAdmin;
      
      return res.json(safeAdmin);
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
    // Contact info fields
    phone: z.string().optional(),
    country: z.string().optional(),
    // Document verification fields
    documentType: z.string().optional(),
    documentNumber: z.string().optional(),
    referralCode: z.string().optional(),
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
        phone,
        country,
        documentType,
        documentNumber,
        referralCode,
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
      // New accounts start with $0.00 balance - production ready
      const user = await storage.createUser({
        email,
        firstName,
        lastName,
        passwordHash,
        authType: 'password',
        profileImageUrl: null,
        accountType: joinCode ? 'personal' : (accountType || 'personal'),
        phoneNumber: phone || null,
        country: country || null,
        verificationDocumentType: documentType || null,
        businessName: accountType === 'business' ? businessName : null,
        businessType: accountType === 'business' ? businessType : null,
        taxId: accountType === 'business' ? taxId : null,
        balance: '0',
        xpBalance: 0,
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
      
      // Send account pending approval email
      try {
        const { emailService } = await import('./email');
        await emailService.sendAccountPendingEmail(email, firstName);
      } catch (emailError) {
        console.error('Failed to send pending approval email:', emailError);
      }
      
      // Add kycStatus to response so frontend knows to show pending screen
      response.kycStatus = user.kycStatus;
      
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
      
      // Record successful login
      try {
        await storage.recordLogin({
          userId: user.id,
          loginMethod: 'password',
          ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          success: true,
        });
      } catch (loginError) {
        console.error("Failed to record login:", loginError);
      }
      
      // Return user without password hash and xpCode (security)
      const { passwordHash: _, xpCode: __, ...userWithoutSensitiveData } = user;
      res.json({ ...userWithoutSensitiveData, hasXpCode: !!user.xpCode });
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

  // Forgot Password - Request password reset email
  app.post('/api/auth/forgot-password', async (req: any, res) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email.toLowerCase().trim());
      
      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }

      // Only allow password reset for password-based auth users
      if (user.authType !== 'password') {
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }

      // Generate secure reset token
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to database
      await storage.setPasswordResetToken(user.id, resetToken, expiry);

      // Send password reset email
      const { emailService } = await import('./email');
      const emailResult = await emailService.sendPasswordResetEmail(user.email!, user.firstName || 'User', resetToken);
      
      if (!emailResult.success) {
        console.error("Failed to send password reset email:", emailResult.error);
        // Still return success message to prevent email enumeration
      } else {
        console.log("Password reset email sent successfully to:", user.email);
      }

      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset Password - Actually reset the password with token
  app.post('/api/auth/reset-password', async (req: any, res) => {
    try {
      const { token, password, confirmPassword } = req.body;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Reset token is required" });
      }
      
      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      // Find user by reset token (also checks expiry)
      const user = await storage.getUserByResetToken(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset link. Please request a new password reset." });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update password and clear reset token
      await storage.updatePasswordHash(user.id, hashedPassword);
      await storage.clearPasswordResetToken(user.id);

      res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Generate XP Code for authenticated user (one-time only)
  app.post('/api/auth/generate-xp-code', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user already has an XP code
      if (user.xpCode) {
        return res.status(400).json({ 
          message: "XP Code has already been generated. Each user can only generate one XP Code.",
          hasCode: true
        });
      }

      // Generate a unique 11-character alphanumeric code
      const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 11; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      let xpCode = generateCode();
      let attempts = 0;
      const maxAttempts = 10;

      // Ensure uniqueness
      while (attempts < maxAttempts) {
        const existingUser = await storage.getUserByXpCode(xpCode);
        if (!existingUser) break;
        xpCode = generateCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        return res.status(500).json({ message: "Failed to generate unique XP Code. Please try again." });
      }

      // Save the XP code
      await storage.setUserXpCode(userId, xpCode);

      res.json({ 
        xpCode,
        message: "XP Code generated successfully. Save this code - it can only be generated once!"
      });
    } catch (error) {
      console.error("Error generating XP code:", error);
      res.status(500).json({ message: "Failed to generate XP Code" });
    }
  });

  // Login with XP Code
  app.post('/api/auth/xp-code-login', async (req: any, res) => {
    try {
      const { xpCode } = req.body;

      if (!xpCode || typeof xpCode !== 'string' || xpCode.length !== 11) {
        return res.status(400).json({ message: "Invalid XP Code format. Code must be 11 characters." });
      }

      const user = await storage.getUserByXpCode(xpCode.toUpperCase());
      if (!user) {
        return res.status(401).json({ message: "Invalid XP Code" });
      }

      // Check KYC status (skip for admin users)
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
        authType: 'xp-code',
      };

      // Clear logout flag
      delete req.session.loggedOut;
      
      // Record successful login
      try {
        await storage.recordLogin({
          userId: user.id,
          loginMethod: 'xp_code',
          ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          success: true,
        });
      } catch (loginError) {
        console.error("Failed to record login:", loginError);
      }

      // Return user without password hash and xpCode (security)
      const { passwordHash: _, xpCode: __, ...userWithoutSensitiveData } = user;
      res.json({ ...userWithoutSensitiveData, hasXpCode: true });
    } catch (error) {
      console.error("XP Code login error:", error);
      res.status(500).json({ message: "Login failed" });
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

  // Admin Portfolio Management - Update portfolio
  app.patch('/api/admin/portfolios/:id', adminAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Verify portfolio exists
      const existingPortfolio = await storage.getPortfolio(id);
      if (!existingPortfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }

      // Clean up the update data - convert numbers to proper types
      const cleanedData: any = {};
      
      if (updateData.name !== undefined) cleanedData.name = updateData.name;
      if (updateData.description !== undefined) cleanedData.description = updateData.description;
      if (updateData.detailedDescription !== undefined) cleanedData.detailedDescription = updateData.detailedDescription;
      if (updateData.strategyTag !== undefined) cleanedData.strategyTag = updateData.strategyTag;
      if (updateData.assets !== undefined) cleanedData.assets = updateData.assets;
      if (updateData.minInvestment !== undefined) cleanedData.minInvestment = updateData.minInvestment.toString();
      if (updateData.riskLevel !== undefined) cleanedData.riskLevel = updateData.riskLevel;
      if (updateData.currentReturn !== undefined) cleanedData.currentReturn = updateData.currentReturn.toString();
      if (updateData.whitepaperUrl !== undefined) cleanedData.whitepaperUrl = updateData.whitepaperUrl;
      if (updateData.dailyInterestRate !== undefined) cleanedData.dailyInterestRate = updateData.dailyInterestRate.toString();
      if (updateData.investmentPeriodDays !== undefined) cleanedData.investmentPeriodDays = parseInt(updateData.investmentPeriodDays);
      if (updateData.maxUnitsPerUser !== undefined) cleanedData.maxUnitsPerUser = parseInt(updateData.maxUnitsPerUser);
      if (updateData.unitPrice !== undefined) cleanedData.unitPrice = updateData.unitPrice.toString();
      if (updateData.totalUnitsAvailable !== undefined) cleanedData.totalUnitsAvailable = parseInt(updateData.totalUnitsAvailable);
      if (updateData.isActive !== undefined) cleanedData.isActive = updateData.isActive;
      
      cleanedData.updatedAt = new Date();

      const updatedPortfolio = await storage.updatePortfolio(id, cleanedData);
      res.json(updatedPortfolio);
    } catch (error) {
      console.error("Error updating portfolio:", error);
      res.status(500).json({ message: "Failed to update portfolio" });
    }
  });

  // Admin Portfolio Management - Delete portfolio
  app.delete('/api/admin/portfolios/:id', adminAuth, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Verify portfolio exists
      const existingPortfolio = await storage.getPortfolio(id);
      if (!existingPortfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }

      await storage.deletePortfolio(id);
      res.json({ message: "Portfolio deleted successfully" });
    } catch (error) {
      console.error("Error deleting portfolio:", error);
      res.status(500).json({ message: "Failed to delete portfolio" });
    }
  });

  // Admin Portfolio Management - Get all portfolios with stats
  app.get('/api/admin/portfolios', adminAuth, async (req: any, res) => {
    try {
      const portfolios = await storage.getPortfolios();
      res.json(portfolios);
    } catch (error) {
      console.error("Error fetching admin portfolios:", error);
      res.status(500).json({ message: "Failed to fetch portfolios" });
    }
  });

  // Admin Portfolio Management - Approve/Reject user portfolio investment
  app.patch('/api/admin/user-portfolios/:id/status', adminAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
      }

      const updatedUserPortfolio = await storage.updateUserPortfolio(id, { status });
      
      // If rejected, refund the user's balance and restore portfolio units
      if (status === 'rejected') {
        const userPortfolio = await storage.getUserPortfolioById(id);
        if (userPortfolio && userPortfolio.userId) {
          const user = await storage.getUser(userPortfolio.userId);
          if (user) {
            const currentBalance = parseFloat(user.balance?.toString() || '0');
            const refundAmount = parseFloat(userPortfolio.investedAmount.toString());
            const newBalance = (currentBalance + refundAmount).toString();
            await storage.updateUserBalance(userPortfolio.userId, newBalance);
          }
          
          // Restore portfolio units that were consumed when investment was created
          if (userPortfolio.portfolioId && userPortfolio.unitsPurchased) {
            const portfolio = await storage.getPortfolio(userPortfolio.portfolioId);
            if (portfolio) {
              const currentUnitsSold = portfolio.unitsSold || 0;
              const unitsToRestore = userPortfolio.unitsPurchased || 0;
              const newUnitsSold = Math.max(0, currentUnitsSold - unitsToRestore);
              await storage.updatePortfolio(userPortfolio.portfolioId, { 
                unitsSold: newUnitsSold 
              });
            }
          }
        }
      }

      res.json(updatedUserPortfolio);
    } catch (error) {
      console.error("Error updating user portfolio status:", error);
      res.status(500).json({ message: "Failed to update portfolio status" });
    }
  });

  // Admin Portfolio Management - Get pending portfolio investments
  app.get('/api/admin/user-portfolios/pending', adminAuth, async (req: any, res) => {
    try {
      const pendingInvestments = await storage.getPendingPortfolioInvestments();
      res.json(pendingInvestments);
    } catch (error) {
      console.error("Error fetching pending portfolio investments:", error);
      res.status(500).json({ message: "Failed to fetch pending investments" });
    }
  });

  // Daily interest accrual endpoint - can be called by admin or scheduled job
  app.post('/api/admin/portfolios/accrue-interest', adminAuth, async (req: any, res) => {
    try {
      const result = await storage.accrueInterestForAllPortfolios();
      res.json({ message: "Interest accrued successfully", ...result });
    } catch (error) {
      console.error("Error accruing interest:", error);
      res.status(500).json({ message: "Failed to accrue interest" });
    }
  });

  // User Profile update route
  app.patch('/api/user/profile', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { phoneNumber, address, city, state, zipCode, country, firstName, lastName, verificationDocumentUrl, verificationDocumentType } = req.body;
      
      const updatedUser = await storage.updateUserProfile(userId, {
        phoneNumber,
        address,
        city,
        state,
        zipCode,
        country,
        firstName,
        lastName,
        verificationDocumentUrl,
        verificationDocumentType,
      });
      
      // Remove sensitive fields
      const { passwordHash, xpCode, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
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
      const { portfolioId, investedAmount, unitsToPurchase } = req.body;

      // Validate portfolio exists
      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }

      const investmentAmountNum = parseFloat(investedAmount);
      const minInvestment = parseFloat(portfolio.minInvestment || '0');
      const unitPrice = parseFloat(portfolio.unitPrice?.toString() || '100');
      const maxUnitsPerUser = portfolio.maxUnitsPerUser || 100;
      const totalUnitsAvailable = portfolio.totalUnitsAvailable || 1000;
      const unitsSold = portfolio.unitsSold || 0;
      const investmentPeriodDays = portfolio.investmentPeriodDays || 365;

      // Calculate units to purchase (either from request or calculate based on investment amount)
      const units = unitsToPurchase ? parseFloat(unitsToPurchase) : Math.floor(investmentAmountNum / unitPrice);
      const actualInvestmentAmount = units * unitPrice;

      // Validate minimum investment
      if (actualInvestmentAmount < minInvestment) {
        return res.status(400).json({ 
          message: `Minimum investment is $${minInvestment.toLocaleString()}` 
        });
      }

      // Validate max units per user
      if (units > maxUnitsPerUser) {
        return res.status(400).json({ 
          message: `Maximum ${maxUnitsPerUser} units allowed per user` 
        });
      }

      // Validate units available
      const remainingUnits = totalUnitsAvailable - unitsSold;
      if (units > remainingUnits) {
        return res.status(400).json({ 
          message: `Only ${remainingUnits} units available for this portfolio` 
        });
      }

      // Check user balance
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userBalance = parseFloat(user.balance?.toString() || '0');

      // Verify sufficient balance
      if (userBalance < actualInvestmentAmount) {
        return res.status(400).json({ 
          message: `Insufficient balance. You have $${userBalance.toFixed(2)}, but need $${actualInvestmentAmount.toFixed(2)}` 
        });
      }

      // Deduct balance
      const newBalance = (userBalance - actualInvestmentAmount).toString();
      await storage.updateUserBalance(userId, newBalance);

      // Calculate investment end date
      const investmentStartDate = new Date();
      const investmentEndDate = new Date(investmentStartDate);
      investmentEndDate.setDate(investmentEndDate.getDate() + investmentPeriodDays);

      // Handle joint accounts
      const accountContext = await storage.getAccountContext(userId);
      
      const userPortfolioData: any = {
        portfolioId,
        investedAmount: actualInvestmentAmount.toString(),
        currentValue: actualInvestmentAmount.toString(),
        status: 'pending', // Set to pending for admin approval
        unitsPurchased: units.toString(),
        totalAccruedProfit: '0',
        investmentStartDate,
        investmentEndDate,
      };

      if (accountContext.isJointAccount) {
        userPortfolioData.jointAccountId = accountContext.accountId;
        userPortfolioData.userId = null;
      } else {
        userPortfolioData.userId = userId;
        userPortfolioData.jointAccountId = null;
      }

      const validatedData = insertUserPortfolioSchema.parse(userPortfolioData);
      const userPortfolio = await storage.createUserPortfolio(validatedData);

      // Update units sold in portfolio
      await storage.updatePortfolio(portfolioId, { 
        unitsSold: unitsSold + units 
      });

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

  app.patch('/api/bonds/products/:id', enhancedAuth, async (req: any, res) => {
    try {
      const user = req.user.claims;
      
      const userRecord = await storage.getUser(user.sub);
      if (userRecord?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const partialSchema = insertBondProductSchema.partial();
      const validatedData = partialSchema.parse(req.body);
      const product = await storage.updateBondProduct(req.params.id, validatedData);
      res.json(product);
    } catch (error) {
      console.error("Error updating bond product:", error);
      res.status(500).json({ message: "Failed to update bond product" });
    }
  });

  app.delete('/api/bonds/products/:id', enhancedAuth, async (req: any, res) => {
    try {
      const user = req.user.claims;
      
      const userRecord = await storage.getUser(user.sub);
      if (userRecord?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteBondProduct(req.params.id);
      res.json({ message: "Bond product deleted successfully" });
    } catch (error) {
      console.error("Error deleting bond product:", error);
      res.status(500).json({ message: "Failed to delete bond product" });
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

  // Extended fallback stock data for individual quote lookups
  const extendedFallbackStocks: Record<string, any> = {
    'AAPL': { symbol: 'AAPL', name: 'Apple Inc.', price: 178.50, change: 2.35, changePercent: 1.33, previousClose: 176.15, dayHigh: 179.80, dayLow: 175.90, volume: 52340000, marketCap: 2800000000000 },
    'MSFT': { symbol: 'MSFT', name: 'Microsoft Corporation', price: 378.25, change: 4.12, changePercent: 1.10, previousClose: 374.13, dayHigh: 380.50, dayLow: 373.20, volume: 22150000, marketCap: 2820000000000 },
    'GOOGL': { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.80, change: 1.95, changePercent: 1.38, previousClose: 140.85, dayHigh: 143.90, dayLow: 140.10, volume: 18920000, marketCap: 1780000000000 },
    'AMZN': { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.90, change: 3.45, changePercent: 1.97, previousClose: 175.45, dayHigh: 180.20, dayLow: 174.80, volume: 31250000, marketCap: 1850000000000 },
    'NVDA': { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 495.50, change: 12.80, changePercent: 2.65, previousClose: 482.70, dayHigh: 498.90, dayLow: 480.10, volume: 45680000, marketCap: 1220000000000 },
    'META': { symbol: 'META', name: 'Meta Platforms Inc.', price: 355.40, change: 5.20, changePercent: 1.49, previousClose: 350.20, dayHigh: 358.10, dayLow: 349.30, volume: 14820000, marketCap: 910000000000 },
    'TSLA': { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.75, change: -3.25, changePercent: -1.29, previousClose: 252.00, dayHigh: 253.80, dayLow: 245.90, volume: 98450000, marketCap: 790000000000 },
    'BRK-B': { symbol: 'BRK-B', name: 'Berkshire Hathaway Inc.', price: 365.80, change: 1.45, changePercent: 0.40, previousClose: 364.35, dayHigh: 367.20, dayLow: 363.50, volume: 3250000, marketCap: 780000000000 },
    'LLY': { symbol: 'LLY', name: 'Eli Lilly and Company', price: 598.20, change: 8.90, changePercent: 1.51, previousClose: 589.30, dayHigh: 602.50, dayLow: 587.10, volume: 2890000, marketCap: 568000000000 },
    'AVGO': { symbol: 'AVGO', name: 'Broadcom Inc.', price: 925.30, change: 15.40, changePercent: 1.69, previousClose: 909.90, dayHigh: 930.80, dayLow: 905.20, volume: 1980000, marketCap: 385000000000 },
    'V': { symbol: 'V', name: 'Visa Inc.', price: 258.90, change: 2.15, changePercent: 0.84, previousClose: 256.75, dayHigh: 260.20, dayLow: 255.80, volume: 6540000, marketCap: 530000000000 },
    'JPM': { symbol: 'JPM', name: 'JPMorgan Chase & Co.', price: 172.45, change: 1.80, changePercent: 1.06, previousClose: 170.65, dayHigh: 173.90, dayLow: 169.80, volume: 8920000, marketCap: 495000000000 },
    'WMT': { symbol: 'WMT', name: 'Walmart Inc.', price: 165.35, change: 0.95, changePercent: 0.58, previousClose: 164.40, dayHigh: 166.20, dayLow: 163.90, volume: 5680000, marketCap: 445000000000 },
    'XOM': { symbol: 'XOM', name: 'Exxon Mobil Corporation', price: 104.80, change: -0.65, changePercent: -0.62, previousClose: 105.45, dayHigh: 106.10, dayLow: 103.90, volume: 12450000, marketCap: 420000000000 },
    'UNH': { symbol: 'UNH', name: 'UnitedHealth Group Inc.', price: 528.90, change: 4.35, changePercent: 0.83, previousClose: 524.55, dayHigh: 532.40, dayLow: 522.80, volume: 2890000, marketCap: 490000000000 },
    'MA': { symbol: 'MA', name: 'Mastercard Incorporated', price: 418.65, change: 3.20, changePercent: 0.77, previousClose: 415.45, dayHigh: 420.80, dayLow: 414.20, volume: 2780000, marketCap: 390000000000 },
    'PG': { symbol: 'PG', name: 'The Procter & Gamble Company', price: 156.80, change: 0.55, changePercent: 0.35, previousClose: 156.25, dayHigh: 157.50, dayLow: 155.90, volume: 5120000, marketCap: 368000000000 },
    'JNJ': { symbol: 'JNJ', name: 'Johnson & Johnson', price: 162.45, change: -0.30, changePercent: -0.18, previousClose: 162.75, dayHigh: 163.80, dayLow: 161.50, volume: 6890000, marketCap: 392000000000 },
    'HD': { symbol: 'HD', name: 'The Home Depot Inc.', price: 345.20, change: 4.80, changePercent: 1.41, previousClose: 340.40, dayHigh: 348.50, dayLow: 339.10, volume: 3450000, marketCap: 345000000000 },
    'COST': { symbol: 'COST', name: 'Costco Wholesale Corporation', price: 578.90, change: 6.25, changePercent: 1.09, previousClose: 572.65, dayHigh: 582.30, dayLow: 570.80, volume: 1890000, marketCap: 258000000000 },
  };

  // Stock market data routes (using yahoo-finance2)
  app.get('/api/stocks/quote', async (req, res) => {
    try {
      const { symbol } = req.query;
      
      if (!symbol || typeof symbol !== 'string') {
        return res.status(400).json({ message: "Symbol parameter is required" });
      }

      const upperSymbol = symbol.toUpperCase();
      
      try {
        const quote: any = await yahooFinance.quote(upperSymbol);
        
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
      } catch (apiError) {
        // Use fallback data if Yahoo Finance API fails
        const fallback = extendedFallbackStocks[upperSymbol];
        if (fallback) {
          // Add slight randomization to simulate real-time changes
          res.json({
            ...fallback,
            price: fallback.price * (1 + (Math.random() - 0.5) * 0.01),
            change: fallback.change * (1 + (Math.random() - 0.5) * 0.2),
            changePercent: fallback.changePercent * (1 + (Math.random() - 0.5) * 0.2),
          });
        } else {
          // Generate generic fallback for unknown symbols
          const basePrice = 100 + Math.random() * 200;
          const change = (Math.random() - 0.5) * 10;
          res.json({
            symbol: upperSymbol,
            name: `${upperSymbol} Inc.`,
            price: basePrice,
            change: change,
            changePercent: (change / basePrice) * 100,
            previousClose: basePrice - change,
            dayHigh: basePrice * 1.02,
            dayLow: basePrice * 0.98,
            volume: Math.floor(Math.random() * 10000000),
            marketCap: Math.floor(Math.random() * 500000000000),
          });
        }
      }
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

  // Cache for top performers (5 minute TTL)
  let topPerformersCache: { data: any[]; timestamp: number } | null = null;
  const STOCK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Fallback stock data when Yahoo Finance API fails
  const fallbackStockData = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 178.50, change: 2.35, changePercent: 1.33, previousClose: 176.15, dayHigh: 179.80, dayLow: 175.90, volume: 52340000, marketCap: 2800000000000 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', price: 378.25, change: 4.12, changePercent: 1.10, previousClose: 374.13, dayHigh: 380.50, dayLow: 373.20, volume: 22150000, marketCap: 2820000000000 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.80, change: 1.95, changePercent: 1.38, previousClose: 140.85, dayHigh: 143.90, dayLow: 140.10, volume: 18920000, marketCap: 1780000000000 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.90, change: 3.45, changePercent: 1.97, previousClose: 175.45, dayHigh: 180.20, dayLow: 174.80, volume: 31250000, marketCap: 1850000000000 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 495.50, change: 12.80, changePercent: 2.65, previousClose: 482.70, dayHigh: 498.90, dayLow: 480.10, volume: 45680000, marketCap: 1220000000000 },
    { symbol: 'META', name: 'Meta Platforms Inc.', price: 355.40, change: 5.20, changePercent: 1.49, previousClose: 350.20, dayHigh: 358.10, dayLow: 349.30, volume: 14820000, marketCap: 910000000000 },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.75, change: -3.25, changePercent: -1.29, previousClose: 252.00, dayHigh: 253.80, dayLow: 245.90, volume: 98450000, marketCap: 790000000000 },
    { symbol: 'BRK-B', name: 'Berkshire Hathaway Inc.', price: 365.80, change: 1.45, changePercent: 0.40, previousClose: 364.35, dayHigh: 367.20, dayLow: 363.50, volume: 3250000, marketCap: 780000000000 },
    { symbol: 'LLY', name: 'Eli Lilly and Company', price: 598.20, change: 8.90, changePercent: 1.51, previousClose: 589.30, dayHigh: 602.50, dayLow: 587.10, volume: 2890000, marketCap: 568000000000 },
    { symbol: 'AVGO', name: 'Broadcom Inc.', price: 925.30, change: 15.40, changePercent: 1.69, previousClose: 909.90, dayHigh: 930.80, dayLow: 905.20, volume: 1980000, marketCap: 385000000000 },
    { symbol: 'V', name: 'Visa Inc.', price: 258.90, change: 2.15, changePercent: 0.84, previousClose: 256.75, dayHigh: 260.20, dayLow: 255.80, volume: 6540000, marketCap: 530000000000 },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', price: 172.45, change: 1.80, changePercent: 1.06, previousClose: 170.65, dayHigh: 173.90, dayLow: 169.80, volume: 8920000, marketCap: 495000000000 },
    { symbol: 'WMT', name: 'Walmart Inc.', price: 165.35, change: 0.95, changePercent: 0.58, previousClose: 164.40, dayHigh: 166.20, dayLow: 163.90, volume: 5680000, marketCap: 445000000000 },
    { symbol: 'XOM', name: 'Exxon Mobil Corporation', price: 104.80, change: -0.65, changePercent: -0.62, previousClose: 105.45, dayHigh: 106.10, dayLow: 103.90, volume: 12450000, marketCap: 420000000000 },
    { symbol: 'UNH', name: 'UnitedHealth Group Inc.', price: 528.90, change: 4.35, changePercent: 0.83, previousClose: 524.55, dayHigh: 532.40, dayLow: 522.80, volume: 2890000, marketCap: 490000000000 },
    { symbol: 'MA', name: 'Mastercard Incorporated', price: 418.65, change: 3.20, changePercent: 0.77, previousClose: 415.45, dayHigh: 420.80, dayLow: 414.20, volume: 2780000, marketCap: 390000000000 },
    { symbol: 'PG', name: 'The Procter & Gamble Company', price: 156.80, change: 0.55, changePercent: 0.35, previousClose: 156.25, dayHigh: 157.50, dayLow: 155.90, volume: 5120000, marketCap: 368000000000 },
    { symbol: 'JNJ', name: 'Johnson & Johnson', price: 162.45, change: -0.30, changePercent: -0.18, previousClose: 162.75, dayHigh: 163.80, dayLow: 161.50, volume: 6890000, marketCap: 392000000000 },
    { symbol: 'HD', name: 'The Home Depot Inc.', price: 345.20, change: 4.80, changePercent: 1.41, previousClose: 340.40, dayHigh: 348.50, dayLow: 339.10, volume: 3450000, marketCap: 345000000000 },
    { symbol: 'COST', name: 'Costco Wholesale Corporation', price: 578.90, change: 6.25, changePercent: 1.09, previousClose: 572.65, dayHigh: 582.30, dayLow: 570.80, volume: 1890000, marketCap: 258000000000 },
  ];

  app.get('/api/stocks/top-performers', async (req, res) => {
    try {
      // Return cached data if valid
      if (topPerformersCache && (Date.now() - topPerformersCache.timestamp) < STOCK_CACHE_TTL) {
        return res.json(topPerformersCache.data);
      }

      // Curated list of top stocks
      const topStocks = [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'LLY', 'AVGO',
        'V', 'JPM', 'WMT', 'XOM', 'UNH', 'MA', 'PG', 'JNJ', 'HD', 'COST'
      ];

      // Try fetching one stock first to test if API is available
      let apiAvailable = false;
      try {
        const testQuote: any = await yahooFinance.quote('AAPL');
        if (testQuote && testQuote.regularMarketPrice) {
          apiAvailable = true;
        }
      } catch {
        apiAvailable = false;
      }

      // If API is rate limited, use fallback data with slight randomization
      if (!apiAvailable) {
        const data = fallbackStockData.map(stock => ({
          ...stock,
          // Add small random variation to simulate real-time changes
          price: stock.price * (1 + (Math.random() - 0.5) * 0.01),
          change: stock.change * (1 + (Math.random() - 0.5) * 0.2),
          changePercent: stock.changePercent * (1 + (Math.random() - 0.5) * 0.2),
        }));
        topPerformersCache = { data, timestamp: Date.now() };
        return res.json(data);
      }

      // Fetch remaining stocks in smaller batches with delay
      const batchSize = 3;
      const allQuotes: any[] = [];
      
      for (let i = 0; i < topStocks.length; i += batchSize) {
        const batch = topStocks.slice(i, i + batchSize);
        const batchQuotes = await Promise.all(
          batch.map(async (symbol) => {
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
              // Return fallback data for this symbol if individual fetch fails
              const fallback = fallbackStockData.find(s => s.symbol === symbol);
              return fallback || null;
            }
          })
        );
        allQuotes.push(...batchQuotes.filter(q => q !== null));
        
        // Add delay between batches
        if (i + batchSize < topStocks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Cache the results
      topPerformersCache = { data: allQuotes, timestamp: Date.now() };
      
      res.json(allQuotes);
    } catch (error) {
      console.error("Error fetching top performers:", error);
      // Return fallback data on error
      res.json(fallbackStockData);
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

  // Get detailed user info for admin
  app.get('/api/admin/users/:userId', adminAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove sensitive fields but include contact/address info
      const { passwordHash, xpCode, ...userDetails } = user;
      
      res.json(userDetails);
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ message: "Failed to fetch user details" });
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

  // Admin login history endpoint
  app.get('/api/admin/login-history', adminAuth, async (req: any, res) => {
    try {
      const loginHistory = await storage.getAllLoginHistory();
      res.json(loginHistory);
    } catch (error) {
      console.error("Error fetching login history:", error);
      res.status(500).json({ message: "Failed to fetch login history" });
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

      // Get user before update to have email info
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.updateUserKycStatus(id, kycStatus);
      
      // Send approval email if status changed to approved
      if (kycStatus === 'approved' && user.email) {
        try {
          const { emailService } = await import('./email');
          await emailService.sendAccountApprovedEmail(user.email, user.firstName || 'User');
        } catch (emailError) {
          console.error('Failed to send account approval email:', emailError);
        }
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user KYC status:", error);
      res.status(500).json({ message: "Failed to update user KYC status" });
    }
  });

  // Bulk update users
  app.post('/api/admin/users/bulk', adminAuth, async (req: any, res) => {
    try {
      const { userIds, action } = req.body;
      
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "No users selected" });
      }
      
      if (!['approve_kyc', 'reject_kyc', 'suspend', 'activate'].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }
      
      let updatedCount = 0;
      for (const userId of userIds) {
        try {
          if (action === 'approve_kyc') {
            await storage.updateUserKycStatus(userId, 'approved');
          } else if (action === 'reject_kyc') {
            await storage.updateUserKycStatus(userId, 'rejected');
          } else if (action === 'suspend') {
            await storage.updateUserKycStatus(userId, 'rejected');
          } else if (action === 'activate') {
            await storage.updateUserKycStatus(userId, 'approved');
          }
          updatedCount++;
        } catch (e) {
          console.error(`Failed to update user ${userId}:`, e);
        }
      }
      
      res.json({ message: `Updated ${updatedCount} users`, count: updatedCount });
    } catch (error) {
      console.error("Error bulk updating users:", error);
      res.status(500).json({ message: "Failed to bulk update users" });
    }
  });

  // Create user (admin)
  app.post('/api/admin/users', adminAuth, async (req: any, res) => {
    try {
      const { email, firstName, lastName, password, role, kycStatus } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      const bcrypt = await import('bcryptjs');
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
      
      const { nanoid } = await import('nanoid');
      const userId = nanoid();
      
      const newUser = await storage.createUser({
        id: userId,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        passwordHash: hashedPassword,
        authType: 'password',
        role: role || 'user',
        kycStatus: kycStatus || 'pending',
        accountType: 'personal',
        balance: '0',
        xpBalance: 0,
      });
      
      res.json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Send email to user
  app.post('/api/admin/users/:id/email', adminAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { subject, message } = req.body;
      
      if (!subject || !message) {
        return res.status(400).json({ message: "Subject and message are required" });
      }
      
      const user = await storage.getUser(id);
      if (!user || !user.email) {
        return res.status(404).json({ message: "User not found or no email" });
      }
      
      const { emailService } = await import('./email');
      const result = await emailService.sendEmail({
        to: user.email,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a1a1a; margin: 0;">Reflux Capital</h1>
            </div>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Hi ${user.firstName || 'there'},
            </p>
            <div style="color: #333; font-size: 16px; line-height: 1.6;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Reflux Capital. All rights reserved.
              </p>
            </div>
          </div>
        `,
      });
      
      if (result.success) {
        res.json({ message: "Email sent successfully" });
      } else {
        res.status(500).json({ message: result.error || "Failed to send email" });
      }
    } catch (error) {
      console.error("Error sending email to user:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Get user transactions/deposits
  app.get('/api/admin/users/:id/transactions', adminAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const deposits = await storage.getUserDeposits(id);
      const stockPurchases = await storage.getUserStockPurchases(id);
      
      const transactions = [
        ...deposits.map((d: any) => ({ ...d, type: 'deposit' })),
        ...stockPurchases.map((s: any) => ({ ...s, type: 'stock_purchase' })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching user transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Export users as CSV
  app.get('/api/admin/users/export', adminAuth, async (req: any, res) => {
    try {
      const users = await storage.getUsers();
      
      const csv = [
        ['ID', 'Email', 'First Name', 'Last Name', 'Role', 'KYC Status', 'Balance', 'Account Type', 'Created At'].join(','),
        ...users.map((u: any) => [
          u.id,
          u.email || '',
          u.firstName || '',
          u.lastName || '',
          u.role || 'user',
          u.kycStatus || 'pending',
          u.balance || '0',
          u.accountType || 'personal',
          u.createdAt || '',
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting users:", error);
      res.status(500).json({ message: "Failed to export users" });
    }
  });

  // Delete user (admin only)
  app.delete('/api/admin/users/:id', adminAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const adminId = req.user?.claims?.sub;
      
      // Prevent admin from deleting themselves
      if (id === adminId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Prevent deleting other admins
      if (user.role === 'admin') {
        return res.status(400).json({ message: "Cannot delete admin accounts" });
      }
      
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Adjust user balance (add or withdraw money)
  app.post('/api/admin/users/:id/balance', adminAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { amount, type, reason } = req.body;
      const adminId = req.user?.claims?.sub;
      
      if (!amount || !type) {
        return res.status(400).json({ message: "Amount and type are required" });
      }
      
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      if (!['add', 'withdraw'].includes(type)) {
        return res.status(400).json({ message: "Type must be 'add' or 'withdraw'" });
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const currentBalance = parseFloat(user.balance || '0');
      let newBalance: number;
      
      if (type === 'add') {
        newBalance = currentBalance + numAmount;
      } else {
        if (currentBalance < numAmount) {
          return res.status(400).json({ message: "Insufficient balance for withdrawal" });
        }
        newBalance = currentBalance - numAmount;
      }
      
      console.log(`[Admin Balance Adjustment] User ${id}: Current balance: ${currentBalance}, Amount: ${numAmount}, Type: ${type}, New balance: ${newBalance}`);
      
      // Update user balance - use toFixed(8) to match decimal precision
      try {
        const updatedUserFromBalance = await storage.updateUserBalance(id, newBalance.toFixed(8));
        console.log(`[Admin Balance Adjustment] Updated user balance result:`, updatedUserFromBalance?.balance);
        
        if (!updatedUserFromBalance) {
          console.error(`[Admin Balance Adjustment] updateUserBalance returned undefined for user ${id}`);
        }
      } catch (balanceError) {
        console.error(`[Admin Balance Adjustment] Error updating balance:`, balanceError);
        throw balanceError;
      }
      
      // Create a deposit record for tracking
      const { nanoid } = await import('nanoid');
      await storage.createDeposit({
        userId: id,
        amount: type === 'add' ? numAmount.toString() : `-${numAmount}`,
        depositMethod: 'admin_adjustment',
        status: 'completed',
        transactionId: `ADMIN-${Date.now()}`,
        metadata: { 
          adjustedBy: adminId, 
          type, 
          reason: reason || 'Admin adjustment' 
        },
      });
      
      const updatedUser = await storage.getUser(id);
      res.json({ 
        message: `Successfully ${type === 'add' ? 'added' : 'withdrew'} $${numAmount.toFixed(2)}`,
        newBalance: updatedUser?.balance 
      });
    } catch (error) {
      console.error("Error adjusting user balance:", error);
      res.status(500).json({ message: "Failed to adjust balance" });
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

  app.post("/api/admin/deposits/:id/cancel", adminAuth, async (req, res) => {
    try {
      const adminId = req.user?.claims?.sub || '';
      const deposit = await storage.cancelDeposit(req.params.id, adminId);
      res.json({ success: true, deposit, message: "Deposit cancelled successfully" });
    } catch (error: any) {
      console.error("Error cancelling deposit:", error);
      res.status(400).json({ message: error.message || "Failed to cancel deposit" });
    }
  });

  // Admin Withdrawal Management
  app.get("/api/admin/withdrawals", adminAuth, async (req, res) => {
    try {
      const withdrawals = await storage.getAllWithdrawals();
      res.json(withdrawals);
    } catch (error: any) {
      console.error("Error fetching all withdrawals:", error);
      res.status(500).json({ message: "Failed to fetch withdrawals" });
    }
  });

  app.post("/api/admin/withdrawals/:id/approve", adminAuth, async (req, res) => {
    try {
      const adminId = req.user?.claims?.sub || '';
      const withdrawal = await storage.approveWithdrawal(req.params.id, adminId);
      res.json({ success: true, withdrawal, message: "Withdrawal approved successfully" });
    } catch (error: any) {
      console.error("Error approving withdrawal:", error);
      res.status(400).json({ message: error.message || "Failed to approve withdrawal" });
    }
  });

  app.post("/api/admin/withdrawals/:id/reject", adminAuth, async (req, res) => {
    try {
      const adminId = req.user?.claims?.sub || '';
      const withdrawal = await storage.rejectWithdrawal(req.params.id, adminId);
      res.json({ success: true, withdrawal, message: "Withdrawal rejected successfully" });
    } catch (error: any) {
      console.error("Error rejecting withdrawal:", error);
      res.status(400).json({ message: error.message || "Failed to reject withdrawal" });
    }
  });

  app.post("/api/admin/withdrawals/:id/cancel", adminAuth, async (req, res) => {
    try {
      const adminId = req.user?.claims?.sub || '';
      const withdrawal = await storage.cancelWithdrawal(req.params.id, adminId);
      res.json({ success: true, withdrawal, message: "Withdrawal cancelled successfully" });
    } catch (error: any) {
      console.error("Error cancelling withdrawal:", error);
      res.status(400).json({ message: error.message || "Failed to cancel withdrawal" });
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
      const { code, description, rewardAmount, maxUses, expiresAt, isActive } = req.body;
      
      if (!code || !rewardAmount) {
        return res.status(400).json({ message: "Code and reward amount are required" });
      }
      
      const couponData = {
        code: code.toUpperCase(),
        description: description || null,
        rewardAmount: rewardAmount.toString(),
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== false,
      };
      
      const coupon = await storage.createCoupon(couponData);
      res.json(coupon);
    } catch (error: any) {
      console.error("Error creating coupon:", error);
      res.status(500).json({ message: error.message || "Failed to create coupon" });
    }
  });

  app.patch("/api/admin/coupons/:id", adminAuth, async (req, res) => {
    try {
      const { code, description, rewardAmount, maxUses, expiresAt, isActive } = req.body;
      
      const updateData: any = {};
      if (code !== undefined) updateData.code = code.toUpperCase();
      if (description !== undefined) updateData.description = description;
      if (rewardAmount !== undefined) updateData.rewardAmount = rewardAmount.toString();
      if (maxUses !== undefined) updateData.maxUses = maxUses ? parseInt(maxUses) : null;
      if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      const coupon = await storage.updateCoupon(req.params.id, updateData);
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
          settingKey: 'daily_bonus_amount',
          settingValue: dailyBonusAmount,
          updatedBy: 'admin',
        });
      }
      
      if (xpPerClaim) {
        await storage.setSetting({
          settingKey: 'xp_per_claim',
          settingValue: xpPerClaim,
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

  // Email Settings and Notifications (Resend API)
  const emailConfigSchema = z.object({
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
      const emailSettings: Record<string, string> = {};
      
      const emailKeys = [
        'email_from_address', 'email_from_name',
        'email_welcome_enabled', 'email_deposit_enabled', 
        'email_stock_enabled', 'email_rewards_enabled'
      ];
      
      for (const setting of settings) {
        if (emailKeys.includes(setting.settingKey)) {
          emailSettings[setting.settingKey] = setting.settingValue;
        }
      }
      
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
        if (value !== undefined) {
          await storage.setSetting({
            settingKey: key,
            settingValue: value as string,
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

  // Get current API key status (masked)
  app.get("/api/admin/email/api-key-status", adminAuth, async (req, res) => {
    try {
      // Check database first
      const dbApiKey = await storage.getSetting('email_resend_api_key');
      const envApiKey = process.env.RESEND_API_KEY;
      
      const activeKey = dbApiKey?.settingValue || envApiKey;
      const source = dbApiKey?.settingValue ? 'database' : (envApiKey ? 'environment' : 'none');
      
      res.json({
        hasApiKey: !!activeKey,
        source,
        apiKeyPrefix: activeKey ? activeKey.substring(0, 12) + '...' : null,
      });
    } catch (error: any) {
      console.error("Error checking API key status:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Save API key to database
  app.post("/api/admin/email/api-key", adminAuth, async (req: any, res) => {
    try {
      const { apiKey } = req.body;
      const userId = req.user?.claims?.sub || 'admin';
      
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }
      
      // Validate API key format
      if (!apiKey.startsWith('re_')) {
        return res.status(400).json({ message: "Invalid API key format. Resend API keys start with 're_'" });
      }
      
      // Test the API key before saving
      const { Resend } = await import('resend');
      const resend = new Resend(apiKey);
      
      try {
        const { data, error } = await resend.domains.list();
        if (error) {
          // Check if it's just a restricted key (can only send emails)
          if (error.message?.includes('restricted')) {
            // Key is valid but restricted - still save it
            console.log('API key is restricted but valid for sending');
          } else {
            return res.status(400).json({ 
              message: `API key validation failed: ${error.message}`,
              hint: 'Make sure the API key has "Full access" permission in Resend'
            });
          }
        }
      } catch (apiError: any) {
        return res.status(400).json({ 
          message: `Failed to validate API key: ${apiError.message}` 
        });
      }
      
      // Save to database
      await storage.setSetting({
        settingKey: 'email_resend_api_key',
        settingValue: apiKey,
        updatedBy: userId,
      });
      
      res.json({ 
        success: true, 
        message: "API key saved successfully",
        apiKeyPrefix: apiKey.substring(0, 12) + '...'
      });
    } catch (error: any) {
      console.error("Error saving API key:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Clear database API key (revert to env var)
  app.delete("/api/admin/email/api-key", adminAuth, async (req: any, res) => {
    try {
      // Delete the setting by setting it to empty
      const userId = req.user?.claims?.sub || 'admin';
      await storage.setSetting({
        settingKey: 'email_resend_api_key',
        settingValue: '',
        updatedBy: userId,
      });
      
      res.json({ 
        success: true, 
        message: "Database API key cleared. Using environment variable." 
      });
    } catch (error: any) {
      console.error("Error clearing API key:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Resend diagnostic endpoint - check domain and API status
  app.get("/api/admin/email/diagnostics", adminAuth, async (req, res) => {
    try {
      // Check database first, then env var
      const dbApiKey = await storage.getSetting('email_resend_api_key');
      const apiKey = dbApiKey?.settingValue || process.env.RESEND_API_KEY;
      if (!apiKey) {
        return res.json({ 
          status: 'error',
          message: 'RESEND_API_KEY not configured',
          apiKeyPrefix: null,
          domains: []
        });
      }

      const { Resend } = await import('resend');
      const resend = new Resend(apiKey);
      
      // Try to list domains to check API status and domain verification
      try {
        const { data: domains, error } = await resend.domains.list();
        
        if (error) {
          return res.json({
            status: 'error',
            message: error.message,
            apiKeyPrefix: apiKey.substring(0, 12) + '...',
            domains: [],
            hint: 'This API key may not have permission to list domains, or your Resend account needs production access.'
          });
        }

        res.json({
          status: 'success',
          apiKeyPrefix: apiKey.substring(0, 12) + '...',
          domains: domains || [],
          hint: domains && domains.length > 0 
            ? 'Check if your sending domain shows status: verified'
            : 'No domains found. Add and verify a domain in Resend dashboard.'
        });
      } catch (apiError: any) {
        res.json({
          status: 'api_error',
          message: apiError.message,
          apiKeyPrefix: apiKey.substring(0, 12) + '...',
          domains: [],
          hint: 'Your Resend account may be in test/sandbox mode. Request production access in Resend dashboard.'
        });
      }
    } catch (error: any) {
      console.error("Error checking Resend diagnostics:", error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // Payment settings endpoints
  const paymentKeys = [
    // Deposit/Withdrawal toggles
    'deposit_crypto_enabled', 'deposit_bank_enabled', 'deposit_card_enabled',
    'withdrawal_crypto_enabled', 'withdrawal_wire_enabled', 'withdrawal_merchant_enabled',
    // Limits
    'deposit_min_amount', 'deposit_max_amount', 'deposit_fee_percent',
    'withdrawal_min_amount', 'withdrawal_max_amount', 'withdrawal_fee_percent',
    'withdrawal_processing_time', 'withdrawal_daily_limit',
    // Crypto addresses
    'crypto_btc_address', 'crypto_eth_address', 'crypto_usdt_address', 'crypto_usdt_network',
    'crypto_ltc_address', 'crypto_xrp_address', 'crypto_sol_address',
    // Bank deposit details
    'bank_name', 'bank_account_name', 'bank_account_number', 'bank_routing_number',
    'bank_swift_code', 'bank_iban', 'bank_address', 'bank_instructions',
    // Wire transfer details
    'wire_bank_name', 'wire_account_name', 'wire_account_number', 'wire_routing_number',
    'wire_swift_code', 'wire_iban', 'wire_address', 'wire_instructions',
    // Currency settings
    'supported_currencies', 'default_currency'
  ];

  app.get("/api/admin/payment/config", adminAuth, async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      const paymentSettings: Record<string, string> = {};
      
      for (const setting of settings) {
        if (paymentKeys.includes(setting.settingKey)) {
          paymentSettings[setting.settingKey] = setting.settingValue;
        }
      }
      
      res.json(paymentSettings);
    } catch (error: any) {
      console.error("Error fetching payment config:", error);
      res.status(500).json({ message: "Failed to fetch payment configuration" });
    }
  });

  app.post("/api/admin/payment/config", adminAuth, async (req: any, res) => {
    try {
      const { settings } = req.body;
      const userId = req.user?.claims?.sub || 'admin';
      
      for (const [key, value] of Object.entries(settings)) {
        if (paymentKeys.includes(key) && value !== undefined) {
          await storage.setSetting({
            settingKey: key,
            settingValue: value as string,
            updatedBy: userId,
          });
        }
      }
      
      res.json({ success: true, message: "Payment settings saved successfully" });
    } catch (error: any) {
      console.error("Error saving payment config:", error);
      res.status(500).json({ message: "Failed to save payment configuration" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
