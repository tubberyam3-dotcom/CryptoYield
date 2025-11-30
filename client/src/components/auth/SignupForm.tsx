import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, User, Mail, Lock, Building, Target, DollarSign, ArrowLeft, UserIcon, Users, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { personalSignupSchema, businessSignupSchema, jointSignupSchema } from "@shared/schema";
import type { AccountType } from "@shared/schema";

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
  onBackToLanding?: () => void;
}

// Form component that is properly keyed and initialized for each account type
function AccountTypeForm({ 
  accountType, 
  onSuccess, 
  onBack,
  onSwitchToLogin 
}: { 
  accountType: AccountType; 
  onSuccess?: () => void; 
  onBack: () => void;
  onSwitchToLogin?: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    resolver: zodResolver(getSchemaForAccountType(accountType)),
    defaultValues: getDefaultValues(accountType),
  });

  const signupMutation = useMutation({
    mutationFn: async (data: any) => {
      const { confirmPassword, ...signupData } = data;
      const response = await apiRequest("POST", "/api/auth/register", signupData);
      return response.json();
    },
    onSuccess: (responseData) => {
      // Invalidate auth cache to trigger re-fetch of user
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Check if this was a joint account signup
      if (responseData.jointAccount && responseData.jointAccount.joinCode) {
        toast({
          title: "Joint Account Created!",
          description: `Your join code is: ${responseData.jointAccount.joinCode}. Share this with your partner so they can join.`,
          duration: 10000,
        });
        console.log("Joint Account Join Code:", responseData.jointAccount.joinCode);
        console.log("Partner can join at Settings > Profile > Joint Account section");
      } else {
        toast({
          title: "Account Created!",
          description: "Welcome to Reflux Capital. You're now logged in.",
        });
      }
      
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

  const onSubmit = (data: any) => {
    signupMutation.mutate(data);
  };

  return (
    <Card className="w-full max-w-md mx-auto px-4 sm:px-0">
      <CardHeader className="space-y-1 px-4 sm:px-6">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            data-testid="button-back-to-account-type"
            className="min-w-[44px] h-11 w-11 sm:h-auto sm:w-auto sm:min-w-[40px]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg sm:text-xl font-bold truncate">
              {accountType === "personal" && "Personal Account"}
              {accountType === "business" && "Business Account"}
              {accountType === "joint" && "Joint Account"}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {accountType === "personal" && "Set up your personal crypto investment account"}
              {accountType === "business" && "Register your business for institutional investing"}
              {accountType === "joint" && "Create a shared account with your partner"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Register the accountType field */}
          <input type="hidden" {...form.register("accountType")} />

          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  {String(form.formState.errors.firstName?.message)}
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
                  {String(form.formState.errors.lastName?.message)}
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
                {String(form.formState.errors.email?.message)}
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
                {String(form.formState.errors.password?.message)}
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
                {String(form.formState.errors.confirmPassword?.message)}
              </p>
            )}
          </div>

          {/* Account Type Specific Fields */}
          {accountType === "personal" && (
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
                    {String(form.formState.errors.investmentGoal?.message)}
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
                    {String(form.formState.errors.riskTolerance?.message)}
                  </p>
                )}
              </div>
            </>
          )}

          {accountType === "business" && (
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
                    {String(form.formState.errors.companyName?.message)}
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
                    {String(form.formState.errors.companyType?.message)}
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
                    {String(form.formState.errors.taxId?.message)}
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
                    {String(form.formState.errors.investmentTarget?.message)}
                  </p>
                )}
              </div>
            </>
          )}

          {accountType === "joint" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      {String(form.formState.errors.spouseFirstName?.message)}
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
                      {String(form.formState.errors.spouseLastName?.message)}
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
                    {String(form.formState.errors.spouseEmail?.message)}
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
                    {String(form.formState.errors.relationshipType?.message)}
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
                    {String(form.formState.errors.investmentTarget?.message)}
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

export function SignupForm({ onSuccess, onSwitchToLogin, onBackToLanding }: SignupFormProps) {
  const [step, setStep] = useState<"account-type" | "form">("account-type");
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType | null>(null);
  const [tempSelectedType, setTempSelectedType] = useState<AccountType | null>("personal"); // Default to first option

  const handleAccountTypeSelect = (accountType: AccountType) => {
    setTempSelectedType(accountType);
  };

  const handleContinue = () => {
    if (tempSelectedType) {
      setSelectedAccountType(tempSelectedType);
      setStep("form");
    }
  };

  const accountTypes: AccountType[] = ["personal", "business", "joint"];
  
  const handleKeyDown = (event: React.KeyboardEvent, accountType: AccountType) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setTempSelectedType(accountType);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      const currentIndex = accountTypes.indexOf(accountType);
      const nextIndex = (currentIndex + 1) % accountTypes.length;
      setTempSelectedType(accountTypes[nextIndex]);
      // Focus the next card
      const nextCard = document.querySelector(`[data-testid="card-${accountTypes[nextIndex]}-account"]`) as HTMLElement;
      nextCard?.focus();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const currentIndex = accountTypes.indexOf(accountType);
      const prevIndex = currentIndex === 0 ? accountTypes.length - 1 : currentIndex - 1;
      setTempSelectedType(accountTypes[prevIndex]);
      // Focus the previous card
      const prevCard = document.querySelector(`[data-testid="card-${accountTypes[prevIndex]}-account"]`) as HTMLElement;
      prevCard?.focus();
    }
  };

  // If form step and account type selected, render the form
  if (step === "form" && selectedAccountType) {
    return (
      <AccountTypeForm
        accountType={selectedAccountType}
        onSuccess={onSuccess}
        onSwitchToLogin={onSwitchToLogin}
        onBack={() => {
          setTempSelectedType(selectedAccountType);
          setStep("account-type");
        }}
      />
    );
  }

  // Account type selection screen
  return (
    <Card className="w-full max-w-lg mx-auto px-4 sm:px-0">
      <CardHeader className="space-y-1 px-4 sm:px-6">
        {onBackToLanding && (
          <div className="flex justify-start mb-4">
            <Button
              variant="ghost"
              className="flex items-center gap-2"
              onClick={onBackToLanding}
              data-testid="button-back-to-landing"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </div>
        )}
        <CardTitle className="text-xl sm:text-2xl font-bold text-center">Choose Your Account Type</CardTitle>
        <CardDescription className="text-center text-sm sm:text-base">
          Select the account type that best fits your investment needs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        <div role="radiogroup" aria-label="Account type selection" data-testid="radiogroup-account-type" className="space-y-3">
          {/* Personal Account Card */}
          <button 
            type="button"
            role="radio"
            aria-checked={tempSelectedType === "personal"}
            className={`w-full rounded-xl border transition-all duration-200 p-4 text-left ${
              tempSelectedType === "personal" 
                ? "border-primary ring-2 ring-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => handleAccountTypeSelect("personal")}
            onKeyDown={(e) => handleKeyDown(e, "personal")}
            data-testid="card-personal-account"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 grid place-items-center">
                <UserIcon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Personal</h3>
                <p className="text-xs text-muted-foreground">Individual investing</p>
              </div>
              {tempSelectedType === "personal" && (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </div>
          </button>

          {/* Business Account Card */}
          <button 
            type="button"
            role="radio"
            aria-checked={tempSelectedType === "business"}
            className={`w-full rounded-xl border transition-all duration-200 p-4 text-left ${
              tempSelectedType === "business" 
                ? "border-primary ring-2 ring-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => handleAccountTypeSelect("business")}
            onKeyDown={(e) => handleKeyDown(e, "business")}
            data-testid="card-business-account"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 grid place-items-center">
                <Building className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Business</h3>
                <p className="text-xs text-muted-foreground">Corporate investing</p>
              </div>
              {tempSelectedType === "business" && (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </div>
          </button>

          {/* Joint Account Card */}
          <button 
            type="button"
            role="radio"
            aria-checked={tempSelectedType === "joint"}
            className={`w-full rounded-xl border transition-all duration-200 p-4 text-left ${
              tempSelectedType === "joint" 
                ? "border-primary ring-2 ring-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => handleAccountTypeSelect("joint")}
            onKeyDown={(e) => handleKeyDown(e, "joint")}
            data-testid="card-joint-account"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 grid place-items-center">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Joint</h3>
                <p className="text-xs text-muted-foreground">Couples & families</p>
              </div>
              {tempSelectedType === "joint" && (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </div>
          </button>
        </div>

        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          disabled={!tempSelectedType}
          className="w-full"
          data-testid="button-continue"
        >
          Continue
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
      </CardContent>
    </Card>
  );
}