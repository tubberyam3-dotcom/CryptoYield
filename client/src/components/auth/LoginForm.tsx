import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, EyeOff, Mail, Lock, ArrowLeft, ArrowRight, KeyRound } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { XpCodeInput } from "./XpCodeInput";

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const passwordSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

type EmailFormData = z.infer<typeof emailSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
  onSwitchToOAuth?: () => void;
}

export function LoginForm({ onSuccess, onSwitchToSignup }: LoginFormProps) {
  const [step, setStep] = useState<'email' | 'password' | 'xpcode'>('email');
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [xpCode, setXpCode] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
    },
  });

  const checkEmailMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      const response = await apiRequest("POST", "/api/auth/check-email", data);
      return response.json();
    },
    onSuccess: (data) => {
      setEmail(emailForm.getValues('email'));
      setUserName(data.firstName);
      setStep('password');
    },
    onError: (error: any) => {
      toast({
        title: "Account Not Found",
        description: "No account exists with this email address.",
        variant: "destructive",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome Back!",
        description: "You've successfully signed in.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('Login error:', error);
      
      if (error.kycStatus === 'pending') {
        toast({
          title: "Account Pending Approval",
          description: "Your account is awaiting KYC verification. Please wait for an administrator to review your application.",
          variant: "destructive",
        });
      } else if (error.kycStatus === 'rejected') {
        toast({
          title: "KYC Application Rejected",
          description: "Your verification has been rejected. Please contact support for assistance.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Failed",
          description: error.message || "Invalid password. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const xpCodeLoginMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/auth/xp-code-login", { xpCode: code });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome Back!",
        description: "You've successfully signed in with your XP Code.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('XP Code login error:', error);
      
      if (error.kycStatus === 'pending') {
        toast({
          title: "Account Pending Approval",
          description: "Your account is awaiting KYC verification. Please wait for an administrator to review your application.",
          variant: "destructive",
        });
      } else if (error.kycStatus === 'rejected') {
        toast({
          title: "KYC Application Rejected",
          description: "Your verification has been rejected. Please contact support for assistance.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Invalid XP Code",
          description: error.message || "The XP Code you entered is incorrect.",
          variant: "destructive",
        });
      }
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/auth/forgot-password", { email });
      return response.json();
    },
    onSuccess: () => {
      setForgotPasswordSent(true);
      toast({
        title: "Check Your Email",
        description: "If an account with that email exists, a password reset link has been sent.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Request Failed",
        description: error.message || "Failed to send password reset email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onEmailSubmit = (data: EmailFormData) => {
    checkEmailMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    loginMutation.mutate({ email, password: data.password });
  };

  const handleForgotPasswordSubmit = () => {
    if (!forgotPasswordEmail || !forgotPasswordEmail.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    forgotPasswordMutation.mutate(forgotPasswordEmail);
  };

  const openForgotPasswordDialog = () => {
    setForgotPasswordEmail(email);
    setForgotPasswordSent(false);
    setShowForgotPassword(true);
  };

  const onXpCodeSubmit = () => {
    if (xpCode.length !== 11) {
      toast({
        title: "Invalid Code",
        description: "Please enter all 11 characters of your XP Code.",
        variant: "destructive",
      });
      return;
    }
    xpCodeLoginMutation.mutate(xpCode);
  };

  const goBack = () => {
    if (step === 'xpcode') {
      setStep('email');
      setXpCode('');
    } else {
      setStep('email');
      passwordForm.reset();
    }
  };

  return (
    <>
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 'email' ? (
          <motion.div
            key="email-step"
            initial={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Welcome</CardTitle>
              <CardDescription className="text-center">
                Enter your email to sign in to Reflux Capital
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      className="pl-10"
                      {...emailForm.register("email")}
                      data-testid="input-email"
                    />
                  </div>
                  {emailForm.formState.errors.email && (
                    <p className="text-sm text-destructive" data-testid="error-email">
                      {emailForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={checkEmailMutation.isPending}
                  data-testid="button-next"
                >
                  {checkEmailMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Checking...
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep('xpcode')}
                  data-testid="button-xp-code-login"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Sign in with XP Code
                </Button>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={onSwitchToSignup}
                      className="text-primary hover:underline font-medium"
                      data-testid="link-switch-to-signup"
                    >
                      Create one now
                    </button>
                  </p>
                </div>
              </form>
            </CardContent>
          </motion.div>
        ) : step === 'xpcode' ? (
          <motion.div
            key="xpcode-step"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <CardHeader className="space-y-1">
              <button
                type="button"
                onClick={goBack}
                className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                data-testid="button-back-xpcode"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </button>
              <CardTitle className="text-2xl font-bold text-center">
                Enter Your XP Code
              </CardTitle>
              <CardDescription className="text-center">
                Enter your 11-character XP Code to sign in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="py-4">
                <XpCodeInput
                  value={xpCode}
                  onChange={setXpCode}
                  disabled={xpCodeLoginMutation.isPending}
                />
              </div>

              <Button
                type="button"
                className="w-full"
                onClick={onXpCodeSubmit}
                disabled={xpCode.length !== 11 || xpCodeLoginMutation.isPending}
                data-testid="button-xpcode-submit"
              >
                {xpCodeLoginMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  XP Codes are one-time codes generated from your account settings.
                </p>
              </div>
            </CardContent>
          </motion.div>
        ) : (
          <motion.div
            key="password-step"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <CardHeader className="space-y-1">
              <button
                type="button"
                onClick={goBack}
                className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </button>
              <CardTitle className="text-2xl font-bold text-center">
                Welcome back, {userName}!
              </CardTitle>
              <CardDescription className="text-center">
                Enter your password to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={openForgotPasswordDialog}
                      data-testid="link-forgot-password"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      autoFocus
                      {...passwordForm.register("password")}
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.password && (
                    <p className="text-sm text-destructive" data-testid="error-password">
                      {passwordForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Not {userName}?{" "}
                    <button
                      type="button"
                      onClick={goBack}
                      className="text-primary hover:underline font-medium"
                    >
                      Use a different account
                    </button>
                  </p>
                </div>
              </form>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>

    <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {forgotPasswordSent ? "Check Your Email" : "Reset Your Password"}
          </DialogTitle>
          <DialogDescription>
            {forgotPasswordSent 
              ? "If an account with that email exists, you'll receive a password reset link shortly."
              : "Enter your email address and we'll send you a link to reset your password."
            }
          </DialogDescription>
        </DialogHeader>
        
        {!forgotPasswordSent ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="john@example.com"
                  className="pl-10"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  data-testid="input-forgot-email"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowForgotPassword(false)}
                data-testid="button-cancel-forgot"
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={forgotPasswordMutation.isPending}
                onClick={handleForgotPasswordSubmit}
                data-testid="button-send-reset"
              >
                {forgotPasswordMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
              <Mail className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <p className="text-sm text-green-700 dark:text-green-300">
                A password reset link has been sent to your email address.
              </p>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => setShowForgotPassword(false)}
              data-testid="button-close-forgot"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
