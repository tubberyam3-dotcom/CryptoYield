import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignupForm } from "@/components/auth/SignupForm";
import { LoginForm } from "@/components/auth/LoginForm";
import { InvestmentCalculator } from "@/components/InvestmentCalculator";
import { ArrowLeft, TrendingUp, Briefcase, BarChart3, Trophy, LineChart } from "lucide-react";

type AuthView = 'landing' | 'signup' | 'login';

export default function Landing() {
  const [authView, setAuthView] = useState<AuthView>('login');

  const handleOAuthLogin = () => {
    window.location.href = "/api/login";
  };

  const handleDemo = () => {
    // Create demo user and show login form with demo credentials
    fetch('/api/seed-demo-user', { 
      method: 'POST', 
      credentials: 'include' 
    }).then(() => {
      setAuthView('login'); // Show login form where user can use demo credentials
    });
  };

  const handleLearnMore = () => {
    // Scroll to features section
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAuthSuccess = () => {
    // Authentication successful, page will redirect automatically
    window.location.reload();
  };

  // If showing auth forms, render them instead of the landing page
  if (authView === 'signup') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-end md:justify-center p-4 overflow-hidden">
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            type: "spring",
            damping: 25,
            stiffness: 200,
            duration: 0.5
          }}
          className="w-full max-w-md pb-8 md:pb-0"
        >
          <SignupForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setAuthView('login')}
            onBackToLanding={() => setAuthView('login')}
          />
        </motion.div>
      </div>
    );
  }

  if (authView === 'login') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-end md:justify-center p-4 overflow-hidden">
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            type: "spring",
            damping: 25,
            stiffness: 200,
            duration: 0.5
          }}
          className="w-full max-w-md pb-8 md:pb-0"
        >
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToSignup={() => setAuthView('signup')}
            onSwitchToOAuth={handleOAuthLogin}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
              <LineChart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Reflux Capital</span>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleDemo} 
              variant="outline"
              className="hover:scale-105 transition-transform"
              data-testid="button-try-demo"
            >
              Try Demo
            </Button>
            <Button 
              onClick={() => setAuthView('login')} 
              className="hover:scale-105 transition-transform"
              data-testid="button-login"
            >
              Sign In
            </Button>
            <Button
              onClick={() => setAuthView('signup')}
              variant="outline"
              className="hover:scale-105 transition-transform"
              data-testid="button-signup"
            >
              Create Account
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section with Calculator */}
      <section className="py-16 md:py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background pointer-events-none"></div>
        <div className="container mx-auto relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 space-y-6">
              <Badge className="px-4 py-1.5 text-sm font-semibold" variant="secondary">
                <TrendingUp className="w-4 h-4 mr-2 inline" />
                Professional Investment Advisory
              </Badge>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 bg-gradient-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent leading-tight">
                Invest in Bonds & Shares with Confidence
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                See potential returns based on historical performance. Choose your asset, set your timeline, and watch your investment grow.
              </p>
            </div>
            
            <InvestmentCalculator />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">Platform Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to build and manage your investment portfolio
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover-lift border-2 transition-all duration-300 hover:border-primary/50 hover:shadow-xl" data-testid="card-feature-portfolios">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                  <Briefcase className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-xl">Curated Portfolios</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Access professionally managed portfolios with stocks, ETFs, and mutual funds strategies.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-lift border-2 transition-all duration-300 hover:border-accent/50 hover:shadow-xl" data-testid="card-feature-bonds">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-br from-accent to-accent/60 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-xl">Bond Investments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Invest in government and corporate bonds with competitive yields and fixed maturity periods.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-lift border-2 transition-all duration-300 hover:border-yellow-500/50 hover:shadow-xl" data-testid="card-feature-challenges">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-xl">Community Challenges</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Join investment challenges with other users and achieve collective financial goals.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 gradient-bg rounded-md flex items-center justify-center">
              <LineChart className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold">Reflux Capital</span>
          </div>
          <p className="text-muted-foreground">
            © 2025 Reflux Capital. Professional investment brokerage and advisory services.
          </p>
        </div>
      </footer>
    </div>
  );
}
