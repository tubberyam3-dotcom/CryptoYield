import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Mail, Lock, User, Phone, Globe, FileText, ArrowLeft, ArrowRight, CheckCircle2, UserIcon, Building, Users, Upload, X } from "lucide-react";
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
  documentFile: File | null;
}

const countries = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "CV", name: "Cabo Verde" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CD", name: "Congo (DRC)" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "SZ", name: "Eswatini" },
  { code: "ET", name: "Ethiopia" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "GD", name: "Grenada" },
  { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "KP", name: "North Korea" },
  { code: "KR", name: "South Korea" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "MK", name: "North Macedonia" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PS", name: "Palestine" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "São Tomé and Príncipe" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VA", name: "Vatican City" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
];

const documentTypes = [
  { value: "national_id", label: "National ID" },
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "other", label: "Other Valid Document" },
];

function StepLoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );
}

export function SignupForm({ onSuccess, onSwitchToLogin, onBackToLanding }: SignupFormProps) {
  const [step, setStep] = useState<SignupStep>("account-type");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isStepLoading, setIsStepLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof SignupData, string>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    documentFile: null,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const steps: SignupStep[] = ["account-type", "email", "password", "name", "phone", "document"];
  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex) / (steps.length - 1)) * 100;

  const updateFormData = (field: keyof SignupData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      updateFormData("documentFile", file);
    }
  };

  const removeFile = () => {
    updateFormData("documentFile", null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
        if (!formData.documentFile) {
          newErrors.documentFile = "Please upload your document";
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
        title: "Signup Successful!",
        description: "You'll receive an email once your account is active.",
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
      setIsStepLoading(true);
      setTimeout(() => {
        setIsStepLoading(false);
        signupMutation.mutate(formData);
      }, 3000);
    } else {
      setIsStepLoading(true);
      setTimeout(() => {
        setIsStepLoading(false);
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < steps.length) {
          setStep(steps[nextIndex]);
        }
      }, 3000);
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

  if (isStepLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1 px-4 sm:px-6">
          {step !== "account-type" && (
            <Progress value={progress} className="w-full h-1.5 mb-4" />
          )}
          <CardTitle className="text-xl font-bold text-center">
            {step === "document" ? "Creating Your Account" : "Verifying Information"}
          </CardTitle>
          <CardDescription className="text-sm text-center">
            Please wait while we process your information
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <StepLoadingAnimation />
        </CardContent>
      </Card>
    );
  }

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

            <div className="space-y-2">
              <Label>Upload Document</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-document-file"
              />
              
              {formData.documentFile ? (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm truncate">{formData.documentFile.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    className="h-8 w-8 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 hover:border-primary/50 transition-colors"
                  data-testid="button-upload-document"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload your document</span>
                    <span className="text-xs text-muted-foreground">PDF, JPG, PNG (max 5MB)</span>
                  </div>
                </button>
              )}
              {errors.documentFile && (
                <p className="text-sm text-destructive">{errors.documentFile}</p>
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
          disabled={signupMutation.isPending || isStepLoading}
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
