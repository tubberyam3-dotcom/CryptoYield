import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isDemoMode } from "@/lib/authUtils";
import { SignupForm } from "@/components/auth/SignupForm";
import { LoginForm } from "@/components/auth/LoginForm";
import { ArrowLeft } from "lucide-react";

type AuthView = 'landing' | 'signup' | 'login';

export default function Landing() {
  const [authView, setAuthView] = useState<AuthView>('landing');
  const isDemo = isDemoMode();

  const handleOAuthLogin = () => {
    window.location.href = "/api/login";
  };

  const handleDemo = () => {
    // Clear logout state and reload to enable demo mode
    fetch('/api/auth/clear-logout', { 
      method: 'POST', 
      credentials: 'include' 
    }).then(() => {
      window.location.reload(); // Reload to trigger demo mode authentication
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Button
          variant="ghost"
          className="absolute top-6 left-6 flex items-center gap-2"
          onClick={() => setAuthView('landing')}
          data-testid="button-back-to-landing"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
        <SignupForm
          onSuccess={handleAuthSuccess}
          onSwitchToLogin={() => setAuthView('login')}
        />
      </div>
    );
  }

  if (authView === 'login') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Button
          variant="ghost"
          className="absolute top-6 left-6 flex items-center gap-2"
          onClick={() => setAuthView('landing')}
          data-testid="button-back-to-landing"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
        <LoginForm
          onSuccess={handleAuthSuccess}
          onSwitchToSignup={() => setAuthView('signup')}
          onSwitchToOAuth={handleOAuthLogin}
        />
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
              <i className="fas fa-cube text-white text-lg"></i>
            </div>
            <span className="text-xl font-bold">CryptoVault</span>
            {isDemo && (
              <Badge variant="secondary" className="ml-2">
                Demo Mode
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {isDemo && (
              <Button 
                onClick={handleDemo} 
                variant="outline"
                className="hover:scale-105 transition-transform"
                data-testid="button-try-demo"
              >
                Try Demo
              </Button>
            )}
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

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Professional Crypto Brokerage Platform
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Invest in curated crypto portfolios, earn through staking, and join community challenges. 
              All in one secure, professional platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => setAuthView('signup')}
                className="text-lg px-8 py-6 hover:scale-105 transition-transform cursor-pointer"
                data-testid="button-get-started"
              >
                🚀 Get Started
              </Button>
              {isDemo && (
                <Button 
                  size="lg" 
                  variant="secondary"
                  onClick={handleDemo}
                  className="text-lg px-8 py-6 hover:scale-105 transition-transform cursor-pointer"
                  data-testid="button-try-demo-main"
                >
                  🎮 Try Demo
                </Button>
              )}
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 hover:scale-105 transition-transform cursor-pointer"
                onClick={handleLearnMore}
                data-testid="button-learn-more"
              >
                📚 Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover-lift" data-testid="card-feature-portfolios">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <i className="fas fa-briefcase text-primary text-xl"></i>
                </div>
                <CardTitle>Curated Portfolios</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Access professionally managed crypto portfolios with AI, DeFi, and Layer 2 strategies.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-lift" data-testid="card-feature-staking">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <i className="fas fa-coins text-accent text-xl"></i>
                </div>
                <CardTitle>Flexible Staking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Lock your assets for fixed terms and earn competitive APY rewards up to 18.7%.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-lift" data-testid="card-feature-challenges">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center mb-4">
                  <i className="fas fa-trophy text-yellow-500 text-xl"></i>
                </div>
                <CardTitle>Community Challenges</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
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
              <i className="fas fa-cube text-white text-sm"></i>
            </div>
            <span className="text-lg font-bold">CryptoVault</span>
          </div>
          <p className="text-muted-foreground">
            © 2025 CryptoVault. Professional crypto investment platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
