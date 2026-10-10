import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, Heart, ArrowRight, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "@/components/auth/SignupForm";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import windmillBg from "@assets/stock_images/beautiful_windmill_l_fbf8ed03.jpg";

type AuthView = "info" | "signup" | "login";

interface JointAccountInfo {
  valid: boolean;
  jointAccountName: string;
  relationshipType: string;
  joinCode: string;
}

export default function JoinAccount() {
  const { joinCode } = useParams<{ joinCode: string }>();
  const [, setLocation] = useLocation();
  const [authView, setAuthView] = useState<AuthView>("info");
  const { isAuthenticated, hasJointAccount } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jointAccountInfo, isLoading, error } = useQuery<JointAccountInfo>({
    queryKey: ["/api/joint-accounts/verify", joinCode],
    queryFn: async () => {
      const response = await fetch(`/api/joint-accounts/verify/${joinCode}`);
      if (!response.ok) {
        throw new Error("Invalid join code");
      }
      return response.json();
    },
    enabled: !!joinCode,
    retry: false,
  });

  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/joint-accounts/join", { joinCode: code });
      return response.json();
    },
    onSuccess: (result) => {
      const alreadyMember = result?.alreadyMember === true ||
        ["approved", "joined", "already_member"].includes(result?.status);
      if (alreadyMember) {
        toast({ title: "Already a member", description: "This account is already connected to your profile." });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        setLocation("/");
        return;
      }
      toast({
        title: "Join Request Pending",
        description: "An administrator must approve your request before you can access this joint account.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/joint-accounts/join-requests/my"] });
    },
    onError: (error: any) => {
      if (error.message?.includes("already")) {
        setLocation("/");
        return;
      }
      toast({
        title: "Failed to join",
        description: error.message || "Could not join the joint account.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (isAuthenticated && hasJointAccount) {
      setLocation("/");
      return;
    }
    if (isAuthenticated && jointAccountInfo?.valid && joinCode && !joinMutation.isPending && !joinMutation.isSuccess && !joinMutation.isError) {
      joinMutation.mutate(joinCode);
    }
  }, [isAuthenticated, hasJointAccount, jointAccountInfo, joinCode, joinMutation.isPending, joinMutation.isSuccess, joinMutation.isError, setLocation]);

  if (joinMutation.isSuccess) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-amber-700" />
            </div>
            <CardTitle>Join Request Pending</CardTitle>
            <CardDescription>
              Your request to join {jointAccountInfo?.jointAccountName || "this joint account"} was sent for administrator review. You do not have access yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-center text-sm text-muted-foreground">Your account remains personal until approval is completed.</p>
            <Button
              onClick={() => setLocation("/")}
              className="w-full"
              data-testid="button-go-to-dashboard"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAuthSuccess = () => {
    window.location.replace('/');
  };

  const getRelationshipLabel = (type: string | null) => {
    switch (type) {
      case "married":
        return "Married Partners";
      case "domestic_partners":
        return "Domestic Partners";
      case "family":
        return "Family Members";
      default:
        return "Partners";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verifying invite link...</p>
        </div>
      </div>
    );
  }

  if (error || !jointAccountInfo?.valid) {
    return (
      <div className="min-h-[100dvh] h-[100dvh] relative flex items-center justify-center p-4 bg-background">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${windmillBg})` }}
        />
        <div className="fixed inset-0 bg-background" />
        <Card className="relative z-10 w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Invalid Invite Link</CardTitle>
            <CardDescription>
              This invite link is invalid or has expired. Please ask your partner to share a new link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation("/")}
              className="w-full"
              data-testid="button-go-home"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAuthenticated) {
    if (joinMutation.isError) {
      return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Request not sent</CardTitle>
              <CardDescription>{joinMutation.error?.message || "We couldn't submit your join request. Check your connection and try again."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                disabled={!joinCode}
                onClick={() => {
                  joinMutation.reset();
                  if (joinCode) joinMutation.mutate(joinCode);
                }}
              >
                Try again
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Joining joint account...</p>
        </div>
      </div>
    );
  }

  if (authView === "signup") {
    return (
      <div className="min-h-[100dvh] h-[100dvh] relative flex flex-col items-center justify-end md:justify-center p-4 overflow-hidden bg-background">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${windmillBg})` }}
        />
        <div className="fixed inset-0 bg-background" />
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            type: "spring",
            damping: 25,
            stiffness: 200,
            duration: 0.5
          }}
          className="relative z-10 w-full max-w-md pb-8 md:pb-0"
        >
          <SignupForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setAuthView("login")}
            onBackToLanding={() => setAuthView("info")}
            joinCode={joinCode}
          />
        </motion.div>
      </div>
    );
  }

  if (authView === "login") {
    return (
      <div className="min-h-[100dvh] h-[100dvh] relative flex flex-col items-center justify-end md:justify-center p-4 overflow-hidden bg-background">
        <div 
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${windmillBg})` }}
        />
        <div className="fixed inset-0 bg-background" />
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            type: "spring",
            damping: 25,
            stiffness: 200,
            duration: 0.5
          }}
          className="relative z-10 w-full max-w-md pb-8 md:pb-0"
        >
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToSignup={() => setAuthView("signup")}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] h-[100dvh] relative flex flex-col items-center justify-end md:justify-center p-4 overflow-hidden bg-background">
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${windmillBg})` }}
      />
      <div className="fixed inset-0 bg-background" />
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ 
          type: "spring",
          damping: 25,
          stiffness: 200,
          duration: 0.5
        }}
        className="relative z-10 w-full max-w-md pb-8 md:pb-0"
      >
        <Card className="w-full">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 rounded-full bg-[#e4fe7b]/20 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-[#e4fe7b]" />
            </div>
            <CardTitle className="text-2xl">You're Invited!</CardTitle>
            <CardDescription className="text-base">
              You've been invited to join a joint investment account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Account Name</p>
                  <p className="font-medium">{jointAccountInfo.jointAccountName}</p>
                </div>
              </div>
              {jointAccountInfo.relationshipType && (
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Relationship</p>
                    <p className="font-medium">{getRelationshipLabel(jointAccountInfo.relationshipType)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Create an account or sign in to join this investment account
              </p>
              
              <Button
                onClick={() => setAuthView("signup")}
                className="w-full bg-[#e4fe7b] text-black hover:bg-[#d4ee6b]"
                data-testid="button-create-account"
              >
                Create Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              
              <Button
                onClick={() => setAuthView("login")}
                variant="outline"
                className="w-full"
                data-testid="button-sign-in"
              >
                Already have an account? Sign In
              </Button>
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                Once approved, you'll have shared access to investments,<br />
                portfolios, and account features with your partner.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
