import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Mail, Lock, User, Phone, Globe, FileText, ArrowLeft, ArrowRight, CheckCircle2, UserIcon, Building, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AccountType } from "@shared/schema";

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
  onBackToLanding?: () => void;
}

type SignupStep = "account-type" | "email" | "password" | "name" | "phone" | "document";

interface SignupData {
  accountType: AccountType;
  email: string;
  referralCode: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  documentType: string;
  documentNumber: string;
}

const countries = [
  { code: "US", name: "United States" },
  { code: "UK", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "NG", name: "Nigeria" },
  { code: "ZA", name: "South Africa" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "OTHER", name: "Other" },
];

const documentTypes = [
  { value: "national_id", label: "National ID" },
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "other", label: "Other Valid Document" },
];

export function SignupForm({ onSuccess, onSwitchToLogin, onBackToLanding }: SignupFormProps) {
  const [step, setStep] = useState<SignupStep>("account-type");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof SignupData, string>>>({});
  
  const [formData, setFormData] = useState<SignupData>({
    accountType: "personal",
    email: "",
    referralCode: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    country: "",
    documentType: "",
    documentNumber: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const steps: SignupStep[] = ["account-type", "email", "password", "name", "phone", "document"];
  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex) / (steps.length - 1)) * 100;

  const updateFormData = (field: keyof SignupData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validateStep = (): boolean => {
    const newErrors: Partial<Record<keyof SignupData, string>> = {};

    switch (step) {
      case "email":
        if (!formData.email) {
          newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = "Please enter a valid email";
        }
        break;
      case "password":
        if (!formData.password) {
          newErrors.password = "Password is required";
        } else if (formData.password.length < 6) {
          newErrors.password = "Password must be at least 6 characters";
        }
        if (!formData.confirmPassword) {
          newErrors.confirmPassword = "Please confirm your password";
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match";
        }
        break;
      case "name":
        if (!formData.firstName) {
          newErrors.firstName = "First name is required";
        }
        if (!formData.lastName) {
          newErrors.lastName = "Last name is required";
        }
        break;
      case "phone":
        if (!formData.phone) {
          newErrors.phone = "Phone number is required";
        }
        if (!formData.country) {
          newErrors.country = "Country is required";
        }
        break;
      case "document":
        if (!formData.documentType) {
          newErrors.documentType = "Document type is required";
        }
        if (!formData.documentNumber) {
          newErrors.documentNumber = "Document number is required";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const signupMutation = useMutation({
    mutationFn: async (data: SignupData) => {
      const signupPayload = {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        accountType: data.accountType,
        phone: data.phone,
        country: data.country,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        referralCode: data.referralCode || undefined,
      };
      const response = await apiRequest("POST", "/api/auth/register", signupPayload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Account Created!",
        description: "Welcome to Reflux Capital. You're now logged in.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Signup Failed",
        description: error.message || "Unable to create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNext = async () => {
    if (!validateStep()) return;

    if (step === "document") {
      signupMutation.mutate(formData);
    } else {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < steps.length) {
        setStep(steps[nextIndex]);
      }
    }
  };

  const handleBack = () => {
    if (step === "account-type" && onBackToLanding) {
      onBackToLanding();
    } else {
      const prevIndex = currentStepIndex - 1;
      if (prevIndex >= 0) {
        setStep(steps[prevIndex]);
      }
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case "account-type": return "Choose Account Type";
      case "email": return "Enter Your Email";
      case "password": return "Create Password";
      case "name": return "Your Name";
      case "phone": return "Contact Details";
      case "document": return "Verify Identity";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case "account-type": return "Select the account type that fits your needs";
      case "email": return "We'll use this to keep your account secure";
      case "password": return "Choose a strong password to protect your account";
      case "name": return "Let us know who you are";
      case "phone": return "Your phone number and country of residence";
      case "document": return "Provide a valid identification document";
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 px-4 sm:px-6">
        {step !== "account-type" && (
          <Progress value={progress} className="w-full h-1.5 mb-4" />
        )}
        <div className="flex items-center gap-2">
          {(step !== "account-type" || onBackToLanding) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-8 w-8"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1">
            <CardTitle className="text-xl font-bold">{getStepTitle()}</CardTitle>
            <CardDescription className="text-sm">{getStepDescription()}</CardDescription>
          </div>
        </div>
        {step !== "account-type" && (
          <p className="text-xs text-muted-foreground">
            Step {currentStepIndex} of {steps.length - 1}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4 px-4 sm:px-6">
        {step === "account-type" && (
          <div className="space-y-3">
            <button 
              type="button"
              className={`w-full rounded-xl border transition-all duration-200 p-4 text-left ${
                formData.accountType === "personal" 
                  ? "border-primary ring-2 ring-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => updateFormData("accountType", "personal")}
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
                {formData.accountType === "personal" && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
            </button>

            <button 
              type="button"
              className={`w-full rounded-xl border transition-all duration-200 p-4 text-left ${
                formData.accountType === "business" 
                  ? "border-primary ring-2 ring-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => updateFormData("accountType", "business")}
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
                {formData.accountType === "business" && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
            </button>

            <button 
              type="button"
              className={`w-full rounded-xl border transition-all duration-200 p-4 text-left ${
                formData.accountType === "joint" 
                  ? "border-primary ring-2 ring-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => updateFormData("accountType", "joint")}
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
                {formData.accountType === "joint" && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
            </button>
          </div>
        )}

        {step === "email" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  data-testid="input-email"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralCode">Referral Code (Optional)</Label>
              <Input
                id="referralCode"
                placeholder="Enter referral code"
                value={formData.referralCode}
                onChange={(e) => updateFormData("referralCode", e.target.value)}
                data-testid="input-referral-code"
              />
            </div>
          </div>
        )}

        {step === "password" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={formData.password}
                  onChange={(e) => updateFormData("password", e.target.value)}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                  data-testid="input-confirm-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
        )}

        {step === "name" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="firstName"
                  placeholder="John"
                  className="pl-10"
                  value={formData.firstName}
                  onChange={(e) => updateFormData("firstName", e.target.value)}
                  data-testid="input-first-name"
                />
              </div>
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName}</p>
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
                  value={formData.lastName}
                  onChange={(e) => updateFormData("lastName", e.target.value)}
                  data-testid="input-last-name"
                />
              </div>
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>
        )}

        {step === "phone" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  className="pl-10"
                  value={formData.phone}
                  onChange={(e) => updateFormData("phone", e.target.value)}
                  data-testid="input-phone"
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Country of Residence</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => updateFormData("country", value)}
              >
                <SelectTrigger data-testid="select-country">
                  <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && (
                <p className="text-sm text-destructive">{errors.country}</p>
              )}
            </div>
          </div>
        )}

        {step === "document" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select
                value={formData.documentType}
                onValueChange={(value) => updateFormData("documentType", value)}
              >
                <SelectTrigger data-testid="select-document-type">
                  <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((doc) => (
                    <SelectItem key={doc.value} value={doc.value}>
                      {doc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.documentType && (
                <p className="text-sm text-destructive">{errors.documentType}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentNumber">Document Number</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="documentNumber"
                  placeholder="Enter document number"
                  className="pl-10"
                  value={formData.documentNumber}
                  onChange={(e) => updateFormData("documentNumber", e.target.value)}
                  data-testid="input-document-number"
                />
              </div>
              {errors.documentNumber && (
                <p className="text-sm text-destructive">{errors.documentNumber}</p>
              )}
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Your document information is encrypted and securely stored. We use this for identity verification only.
              </p>
            </div>
          </div>
        )}

        <Button
          onClick={handleNext}
          disabled={signupMutation.isPending}
          className="w-full"
          data-testid="button-continue"
        >
          {signupMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Creating Account...
            </>
          ) : step === "document" ? (
            "Create Account"
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>

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
