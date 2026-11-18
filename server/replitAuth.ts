import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Replit OAuth is optional: outside Replit (e.g. Railway) the app runs with
// password-based sessions only.
const replitOAuthEnabled = Boolean(process.env.REPLIT_DOMAINS && process.env.REPL_ID);

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // New accounts start with $0.00 balance - production ready
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    balance: '0',
    xpBalance: 0,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  let config: Awaited<ReturnType<typeof getOidcConfig>> | undefined;
  try {
    if (replitOAuthEnabled) config = await getOidcConfig();
  } catch (error) {
    console.warn("Failed to setup OAuth configuration, authentication will not work:", error);
    // In development, we'll still continue without OAuth
    if (process.env.NODE_ENV !== 'development') {
      throw error;
    }
    config = undefined;
  }

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Only setup OAuth strategies if config is available
  if (config) {
    // Register strategies for both Replit domains and localhost
    const domains = process.env.REPLIT_DOMAINS!.split(",");
    const allDomains = [...domains, "localhost", "127.0.0.1"];
    
    for (const domain of allDomains) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: domain.includes("localhost") || domain.includes("127.0.0.1") 
            ? `http://${domain}:5000/api/callback`
            : `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // In development mode without OAuth config, redirect to demo mode
    if (process.env.NODE_ENV === 'development' && !config) {
      return res.redirect("/?demo=true");
    }
    
    if (!config) {
      return res.status(503).json({ message: "Authentication service unavailable" });
    }
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req: any, res, next) => {
    if (!config) {
      return res.redirect("/?demo=true");
    }
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      failureRedirect: "/api/login",
    })(async (req: any, res: any, next: any) => {
      // After OAuth, check KYC status before allowing login
      const claims = req.user?.claims;
      if (claims?.sub) {
        const dbUser = await storage.getUser(claims.sub);
        if (dbUser && dbUser.role !== 'admin' && dbUser.kycStatus !== 'approved') {
          // Log them out and redirect to pending page
          req.logout(() => {
            if (dbUser.kycStatus === 'rejected') {
              return res.redirect("/?kyc=rejected");
            }
            return res.redirect("/?kyc=pending");
          });
          return;
        }
        
        // Record successful OAuth login
        try {
          await storage.recordLogin({
            userId: claims.sub,
            loginMethod: 'oauth',
            ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            success: true,
          });
        } catch (loginError) {
          console.error("Failed to record OAuth login:", loginError);
        }
      }
      
      // Clear logout flag on successful OAuth login
      if (req.session) {
        delete req.session.loggedOut;
      }
      return res.redirect("/");
    })(req, res, next);
  });

  app.get("/api/logout", (req: any, res) => {
    // Clear password-based session if it exists
    if (req.session.user) {
      delete req.session.user;
    }
    
    // Clear admin session if it exists
    if (req.session.adminUser) {
      delete req.session.adminUser;
    }
    
    // Mark as logged out to prevent demo mode from auto-authenticating
    req.session.loggedOut = true;
    
    // Handle OAuth logout
    req.logout(() => {
      // In demo mode or when OAuth is not configured, just redirect to landing page
      if (!config || process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development') {
        return res.redirect("/");
      }
      
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
