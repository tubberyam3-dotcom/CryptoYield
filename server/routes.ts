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
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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

  app.post('/api/portfolios', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/user/portfolios', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userPortfolios = await storage.getUserPortfolios(userId);
      res.json(userPortfolios);
    } catch (error) {
      console.error("Error fetching user portfolios:", error);
      res.status(500).json({ message: "Failed to fetch user portfolios" });
    }
  });

  app.post('/api/user/portfolios', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/staking/plans', isAuthenticated, async (req: any, res) => {
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

  app.get('/api/user/staking', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userStakings = await storage.getUserStaking(userId);
      res.json(userStakings);
    } catch (error) {
      console.error("Error fetching user staking:", error);
      res.status(500).json({ message: "Failed to fetch user staking" });
    }
  });

  app.post('/api/user/staking', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/challenges', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/challenges/:id/join', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
