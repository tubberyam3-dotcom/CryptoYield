import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, User, Mail, Lock, Building, Users, UserIcon, ArrowLeft, Target, DollarSign, Heart, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Base schema for all account types (without refine)
const baseSignupObject = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  accountType: z.enum(["personal", "business", "joint"]),
});

// Personal account schema
const personalSignupSchema = baseSignupObject.extend({
  investmentGoal: z.string().min(1, "Investment goal is required"),
  riskTolerance: z.enum(["low", "medium", "high"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Business account schema  
const businessSignupSchema = baseSignupObject.extend({
  companyName: z.string().min(1, "Company name is required"),
  companyType: z.enum(["corporation", "llc", "partnership", "sole_proprietorship"]),
  taxId: z.string().min(9, "Valid tax ID is required"),
  investmentTarget: z.string().min(1, "Investment target is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Joint account schema
const jointSignupSchema = baseSignupObject.extend({
  spouseEmail: z.string().email("Valid spouse email is required"),
  spouseFirstName: z.string().min(1, "Spouse first name is required"),
  spouseLastName: z.string().min(1, "Spouse last name is required"),
  investmentTarget: z.string().min(1, "Desired investment target is required"),
  relationshipType: z.enum(["married", "domestic_partners", "family"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PersonalSignupData = z.infer<typeof personalSignupSchema>;
type BusinessSignupData = z.infer<typeof businessSignupSchema>;
type JointSignupData = z.infer<typeof jointSignupSchema>;
type AccountType = "personal" | "business" | "joint";

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps) {
  const [step, setStep] = useState<"account-type" | "form">("account-type");
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Dynamic form based on account type
  const getSchemaForAccountType = (accountType: AccountType) => {
    switch (accountType) {
      case "personal": return personalSignupSchema;
      case "business": return businessSignupSchema;
      case "joint": return jointSignupSchema;
      default: return personalSignupSchema;
    }
  };

  const getDefaultValues = (accountType: AccountType) => {
    const base = {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      accountType,
    };

    switch (accountType) {
      case "personal":
        return { ...base, investmentGoal: "", riskTolerance: "medium" as const };
      case "business":
        return { ...base, companyName: "", companyType: "corporation" as const, taxId: "", investmentTarget: "" };
      case "joint":
        return { ...base, spouseEmail: "", spouseFirstName: "", spouseLastName: "", investmentTarget: "", relationshipType: "married" as const };
      default:
        return base;
    }
  };

  const form = useForm<any>({
    resolver: selectedAccountType ? zodResolver(getSchemaForAccountType(selectedAccountType)) : undefined,
    defaultValues: selectedAccountType ? getDefaultValues(selectedAccountType) : {},
  });

  const signupMutation = useMutation({
    mutationFn: async (data: any) => {
      const { confirmPassword, ...signupData } = data;
      const response = await apiRequest("POST", "/api/auth/register", signupData);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate auth cache to trigger re-fetch of user
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Account Created!",
        description: "Welcome to CryptoVault. You're now logged in.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('Signup error:', error);
      toast({
        title: "Signup Failed",
        description: error.message || "Unable to create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAccountTypeSelect = (accountType: AccountType) => {
    setSelectedAccountType(accountType);
    setStep("form");
  };

  const onSubmit = (data: any) => {
    signupMutation.mutate(data);
  };

  // Account type selection screen
  if (step === "account-type") {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Choose Your Account Type</CardTitle>
          <CardDescription className="text-center">
            Select the account type that best fits your investment needs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Personal Account Card */}
          <button 
            type="button"
            className="group relative w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 p-5 shadow-sm hover:shadow-md transition-all duration-200 ease-out motion-safe:hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background text-left"
            onClick={() => handleAccountTypeSelect("personal")}
            data-testid="card-personal-account"
          >
            <div className="flex items-start space-x-4">
              <div className="h-12 w-12 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 grid place-items-center shadow-inner">
                <UserIcon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-foreground">Personal Account</h3>
                  <div className="rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs px-3 py-1 border border-blue-200 dark:border-blue-800">
                    Most Popular
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Perfect for individual investors looking to build their crypto portfolio
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Personal investment goals tracking
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Risk tolerance customization
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Individual portfolio management
                  </li>
                </ul>
              </div>
            </div>
          </button>

          {/* Business Account Card */}
          <button 
            type="button"
            className="group relative w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 p-5 shadow-sm hover:shadow-md transition-all duration-200 ease-out motion-safe:hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background text-left"
            onClick={() => handleAccountTypeSelect("business")}
            data-testid="card-business-account"
          >
            <div className="flex items-start space-x-4">
              <div className="h-12 w-12 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 grid place-items-center shadow-inner">
                <Building className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">Business Account</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Designed for companies managing corporate treasury and institutional investments
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Company registration details
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Corporate investment targets
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Tax compliance features
                  </li>
                </ul>
              </div>
            </div>
          </button>

          {/* Joint Account Card */}
          <button 
            type="button"
            className="group relative w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 p-5 shadow-sm hover:shadow-md transition-all duration-200 ease-out motion-safe:hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background text-left"
            onClick={() => handleAccountTypeSelect("joint")}
            data-testid="card-joint-account"
          >
            <div className="flex items-start space-x-4">
              <div className="h-12 w-12 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 grid place-items-center shadow-inner">
                <Users className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">Joint Account</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Ideal for couples and families to manage shared investments together
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Shared investment goals
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Partner/spouse information
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Collaborative decision making
                  </li>
                </ul>
              </div>
            </div>
          </button>

          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-primary hover:underline font-medium"
                data-testid="link-switch-to-login"
              >
                Sign in
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Registration form based on selected account type
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep("account-type")}
            data-testid="button-back-to-account-type"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <CardTitle className="text-xl font-bold">
              {selectedAccountType === "personal" && "Personal Account"}
              {selectedAccountType === "business" && "Business Account"}
              {selectedAccountType === "joint" && "Joint Account"}
            </CardTitle>
            <CardDescription className="text-sm">
              {selectedAccountType === "personal" && "Set up your personal crypto investment account"}
              {selectedAccountType === "business" && "Register your business for institutional investing"}
              {selectedAccountType === "joint" && "Create a shared account with your partner"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="firstName"
                  placeholder="John"
                  className="pl-10"
                  {...form.register("firstName")}
                  data-testid="input-first-name"
                />
              </div>
              {form.formState.errors.firstName && (
                <p className="text-sm text-destructive" data-testid="error-first-name">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="lastName"
                  placeholder="Doe"
                  className="pl-10"
                  {...form.register("lastName")}
                  data-testid="input-last-name"
                />
              </div>
              {form.formState.errors.lastName && (
                <p className="text-sm text-destructive" data-testid="error-last-name">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                className="pl-10"
                {...form.register("email")}
                data-testid="input-email"
              />
            </div>
            {form.formState.errors.email && (
              <p className="text-sm text-destructive" data-testid="error-email">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10 pr-10"
                {...form.register("password")}
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
            {form.formState.errors.password && (
              <p className="text-sm text-destructive" data-testid="error-password">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10 pr-10"
                {...form.register("confirmPassword")}
                data-testid="input-confirm-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                data-testid="button-toggle-confirm-password"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-destructive" data-testid="error-confirm-password">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Account Type Specific Fields */}
          {selectedAccountType === "personal" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="investmentGoal">Investment Goal</Label>
                <div className="relative">
                  <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="investmentGoal"
                    placeholder="e.g., Retirement, House down payment"
                    className="pl-10"
                    {...form.register("investmentGoal")}
                    data-testid="input-investment-goal"
                  />
                </div>
                {form.formState.errors.investmentGoal && (
                  <p className="text-sm text-destructive" data-testid="error-investment-goal">
                    {form.formState.errors.investmentGoal.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Risk Tolerance</Label>
                <Select
                  value={form.watch("riskTolerance")}
                  onValueChange={(value: "low" | "medium" | "high") =>
                    form.setValue("riskTolerance", value)
                  }
                >
                  <SelectTrigger data-testid="select-risk-tolerance">
                    <SelectValue placeholder="Select your risk tolerance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Conservative (Low Risk)</SelectItem>
                    <SelectItem value="medium">Moderate (Medium Risk)</SelectItem>
                    <SelectItem value="high">Aggressive (High Risk)</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.riskTolerance && (
                  <p className="text-sm text-destructive" data-testid="error-risk-tolerance">
                    {form.formState.errors.riskTolerance.message}
                  </p>
                )}
              </div>
            </>
          )}

          {selectedAccountType === "business" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="companyName"
                    placeholder="Your Company Inc."
                    className="pl-10"
                    {...form.register("companyName")}
                    data-testid="input-company-name"
                  />
                </div>
                {form.formState.errors.companyName && (
                  <p className="text-sm text-destructive" data-testid="error-company-name">
                    {form.formState.errors.companyName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Company Type</Label>
                <Select
                  value={form.watch("companyType")}
                  onValueChange={(value: "corporation" | "llc" | "partnership" | "sole_proprietorship") =>
                    form.setValue("companyType", value)
                  }
                >
                  <SelectTrigger data-testid="select-company-type">
                    <SelectValue placeholder="Select company type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corporation">Corporation</SelectItem>
                    <SelectItem value="llc">LLC</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.companyType && (
                  <p className="text-sm text-destructive" data-testid="error-company-type">
                    {form.formState.errors.companyType.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID (EIN)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="taxId"
                    placeholder="12-3456789"
                    className="pl-10"
                    {...form.register("taxId")}
                    data-testid="input-tax-id"
                  />
                </div>
                {form.formState.errors.taxId && (
                  <p className="text-sm text-destructive" data-testid="error-tax-id">
                    {form.formState.errors.taxId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="investmentTarget">Investment Target</Label>
                <div className="relative">
                  <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="investmentTarget"
                    placeholder="e.g., $100,000 for treasury management"
                    className="pl-10"
                    {...form.register("investmentTarget")}
                    data-testid="input-investment-target"
                  />
                </div>
                {form.formState.errors.investmentTarget && (
                  <p className="text-sm text-destructive" data-testid="error-investment-target">
                    {form.formState.errors.investmentTarget.message}
                  </p>
                )}
              </div>
            </>
          )}

          {selectedAccountType === "joint" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="spouseFirstName">Partner's First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="spouseFirstName"
                      placeholder="Jane"
                      className="pl-10"
                      {...form.register("spouseFirstName")}
                      data-testid="input-spouse-first-name"
                    />
                  </div>
                  {form.formState.errors.spouseFirstName && (
                    <p className="text-sm text-destructive" data-testid="error-spouse-first-name">
                      {form.formState.errors.spouseFirstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spouseLastName">Partner's Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="spouseLastName"
                      placeholder="Smith"
                      className="pl-10"
                      {...form.register("spouseLastName")}
                      data-testid="input-spouse-last-name"
                    />
                  </div>
                  {form.formState.errors.spouseLastName && (
                    <p className="text-sm text-destructive" data-testid="error-spouse-last-name">
                      {form.formState.errors.spouseLastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="spouseEmail">Partner's Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="spouseEmail"
                    type="email"
                    placeholder="jane@example.com"
                    className="pl-10"
                    {...form.register("spouseEmail")}
                    data-testid="input-spouse-email"
                  />
                </div>
                {form.formState.errors.spouseEmail && (
                  <p className="text-sm text-destructive" data-testid="error-spouse-email">
                    {form.formState.errors.spouseEmail.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Relationship Type</Label>
                <Select
                  value={form.watch("relationshipType")}
                  onValueChange={(value: "married" | "domestic_partners" | "family") =>
                    form.setValue("relationshipType", value)
                  }
                >
                  <SelectTrigger data-testid="select-relationship-type">
                    <SelectValue placeholder="Select relationship type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="domestic_partners">Domestic Partners</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.relationshipType && (
                  <p className="text-sm text-destructive" data-testid="error-relationship-type">
                    {form.formState.errors.relationshipType.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="investmentTarget">Desired Investment Target</Label>
                <div className="relative">
                  <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="investmentTarget"
                    placeholder="e.g., $50,000 for shared retirement goals"
                    className="pl-10"
                    {...form.register("investmentTarget")}
                    data-testid="input-joint-investment-target"
                  />
                </div>
                {form.formState.errors.investmentTarget && (
                  <p className="text-sm text-destructive" data-testid="error-joint-investment-target">
                    {form.formState.errors.investmentTarget.message}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={signupMutation.isPending}
            data-testid="button-signup"
          >
            {signupMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>

          {/* Switch to Login */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-primary hover:underline font-medium"
                data-testid="link-switch-to-login"
              >
                Sign in
              </button>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}