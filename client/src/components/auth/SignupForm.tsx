import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Mail, Lock, User, Phone, Globe, FileText, ArrowLeft, ArrowRight, CheckCircle2, UserIcon, Building, Users, Upload, X, Copy, Check, Heart, Link2 } from "lucide-react";
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
  joinCode?: string;
}

type SignupStep = "account-type" | "email" | "password" | "name" | "phone" | "document" | "success" | "pending-approval";

interface JointAccountResponse {
  id: string;
  joinCode: string;
  name: string;
}

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
  { code: "AF", name: "Afghanistan", phoneCode: "+93" },
  { code: "AL", name: "Albania", phoneCode: "+355" },
  { code: "DZ", name: "Algeria", phoneCode: "+213" },
  { code: "AD", name: "Andorra", phoneCode: "+376" },
  { code: "AO", name: "Angola", phoneCode: "+244" },
  { code: "AG", name: "Antigua and Barbuda", phoneCode: "+1-268" },
  { code: "AR", name: "Argentina", phoneCode: "+54" },
  { code: "AM", name: "Armenia", phoneCode: "+374" },
  { code: "AU", name: "Australia", phoneCode: "+61" },
  { code: "AT", name: "Austria", phoneCode: "+43" },
  { code: "AZ", name: "Azerbaijan", phoneCode: "+994" },
  { code: "BS", name: "Bahamas", phoneCode: "+1-242" },
  { code: "BH", name: "Bahrain", phoneCode: "+973" },
  { code: "BD", name: "Bangladesh", phoneCode: "+880" },
  { code: "BB", name: "Barbados", phoneCode: "+1-246" },
  { code: "BY", name: "Belarus", phoneCode: "+375" },
  { code: "BE", name: "Belgium", phoneCode: "+32" },
  { code: "BZ", name: "Belize", phoneCode: "+501" },
  { code: "BJ", name: "Benin", phoneCode: "+229" },
  { code: "BT", name: "Bhutan", phoneCode: "+975" },
  { code: "BO", name: "Bolivia", phoneCode: "+591" },
  { code: "BA", name: "Bosnia and Herzegovina", phoneCode: "+387" },
  { code: "BW", name: "Botswana", phoneCode: "+267" },
  { code: "BR", name: "Brazil", phoneCode: "+55" },
  { code: "BN", name: "Brunei", phoneCode: "+673" },
  { code: "BG", name: "Bulgaria", phoneCode: "+359" },
  { code: "BF", name: "Burkina Faso", phoneCode: "+226" },
  { code: "BI", name: "Burundi", phoneCode: "+257" },
  { code: "CV", name: "Cabo Verde", phoneCode: "+238" },
  { code: "KH", name: "Cambodia", phoneCode: "+855" },
  { code: "CM", name: "Cameroon", phoneCode: "+237" },
  { code: "CA", name: "Canada", phoneCode: "+1" },
  { code: "CF", name: "Central African Republic", phoneCode: "+236" },
  { code: "TD", name: "Chad", phoneCode: "+235" },
  { code: "CL", name: "Chile", phoneCode: "+56" },
  { code: "CN", name: "China", phoneCode: "+86" },
  { code: "CO", name: "Colombia", phoneCode: "+57" },
  { code: "KM", name: "Comoros", phoneCode: "+269" },
  { code: "CG", name: "Congo", phoneCode: "+242" },
  { code: "CD", name: "Congo (DRC)", phoneCode: "+243" },
  { code: "CR", name: "Costa Rica", phoneCode: "+506" },
  { code: "CI", name: "Côte d'Ivoire", phoneCode: "+225" },
  { code: "HR", name: "Croatia", phoneCode: "+385" },
  { code: "CU", name: "Cuba", phoneCode: "+53" },
  { code: "CY", name: "Cyprus", phoneCode: "+357" },
  { code: "CZ", name: "Czech Republic", phoneCode: "+420" },
  { code: "DK", name: "Denmark", phoneCode: "+45" },
  { code: "DJ", name: "Djibouti", phoneCode: "+253" },
  { code: "DM", name: "Dominica", phoneCode: "+1-767" },
  { code: "DO", name: "Dominican Republic", phoneCode: "+1-809" },
  { code: "EC", name: "Ecuador", phoneCode: "+593" },
  { code: "EG", name: "Egypt", phoneCode: "+20" },
  { code: "SV", name: "El Salvador", phoneCode: "+503" },
  { code: "GQ", name: "Equatorial Guinea", phoneCode: "+240" },
  { code: "ER", name: "Eritrea", phoneCode: "+291" },
  { code: "EE", name: "Estonia", phoneCode: "+372" },
  { code: "SZ", name: "Eswatini", phoneCode: "+268" },
  { code: "ET", name: "Ethiopia", phoneCode: "+251" },
  { code: "FJ", name: "Fiji", phoneCode: "+679" },
  { code: "FI", name: "Finland", phoneCode: "+358" },
  { code: "FR", name: "France", phoneCode: "+33" },
  { code: "GA", name: "Gabon", phoneCode: "+241" },
  { code: "GM", name: "Gambia", phoneCode: "+220" },
  { code: "GE", name: "Georgia", phoneCode: "+995" },
  { code: "DE", name: "Germany", phoneCode: "+49" },
  { code: "GH", name: "Ghana", phoneCode: "+233" },
  { code: "GR", name: "Greece", phoneCode: "+30" },
  { code: "GD", name: "Grenada", phoneCode: "+1-473" },
  { code: "GT", name: "Guatemala", phoneCode: "+502" },
  { code: "GN", name: "Guinea", phoneCode: "+224" },
  { code: "GW", name: "Guinea-Bissau", phoneCode: "+245" },
  { code: "GY", name: "Guyana", phoneCode: "+592" },
  { code: "HT", name: "Haiti", phoneCode: "+509" },
  { code: "HN", name: "Honduras", phoneCode: "+504" },
  { code: "HU", name: "Hungary", phoneCode: "+36" },
  { code: "IS", name: "Iceland", phoneCode: "+354" },
  { code: "IN", name: "India", phoneCode: "+91" },
  { code: "ID", name: "Indonesia", phoneCode: "+62" },
  { code: "IR", name: "Iran", phoneCode: "+98" },
  { code: "IQ", name: "Iraq", phoneCode: "+964" },
  { code: "IE", name: "Ireland", phoneCode: "+353" },
  { code: "IL", name: "Israel", phoneCode: "+972" },
  { code: "IT", name: "Italy", phoneCode: "+39" },
  { code: "JM", name: "Jamaica", phoneCode: "+1-876" },
  { code: "JP", name: "Japan", phoneCode: "+81" },
  { code: "JO", name: "Jordan", phoneCode: "+962" },
  { code: "KZ", name: "Kazakhstan", phoneCode: "+7" },
  { code: "KE", name: "Kenya", phoneCode: "+254" },
  { code: "KI", name: "Kiribati", phoneCode: "+686" },
  { code: "KP", name: "North Korea", phoneCode: "+850" },
  { code: "KR", name: "South Korea", phoneCode: "+82" },
  { code: "KW", name: "Kuwait", phoneCode: "+965" },
  { code: "KG", name: "Kyrgyzstan", phoneCode: "+996" },
  { code: "LA", name: "Laos", phoneCode: "+856" },
  { code: "LV", name: "Latvia", phoneCode: "+371" },
  { code: "LB", name: "Lebanon", phoneCode: "+961" },
  { code: "LS", name: "Lesotho", phoneCode: "+266" },
  { code: "LR", name: "Liberia", phoneCode: "+231" },
  { code: "LY", name: "Libya", phoneCode: "+218" },
  { code: "LI", name: "Liechtenstein", phoneCode: "+423" },
  { code: "LT", name: "Lithuania", phoneCode: "+370" },
  { code: "LU", name: "Luxembourg", phoneCode: "+352" },
  { code: "MG", name: "Madagascar", phoneCode: "+261" },
  { code: "MW", name: "Malawi", phoneCode: "+265" },
  { code: "MY", name: "Malaysia", phoneCode: "+60" },
  { code: "MV", name: "Maldives", phoneCode: "+960" },
  { code: "ML", name: "Mali", phoneCode: "+223" },
  { code: "MT", name: "Malta", phoneCode: "+356" },
  { code: "MH", name: "Marshall Islands", phoneCode: "+692" },
  { code: "MR", name: "Mauritania", phoneCode: "+222" },
  { code: "MU", name: "Mauritius", phoneCode: "+230" },
  { code: "MX", name: "Mexico", phoneCode: "+52" },
  { code: "FM", name: "Micronesia", phoneCode: "+691" },
  { code: "MD", name: "Moldova", phoneCode: "+373" },
  { code: "MC", name: "Monaco", phoneCode: "+377" },
  { code: "MN", name: "Mongolia", phoneCode: "+976" },
  { code: "ME", name: "Montenegro", phoneCode: "+382" },
  { code: "MA", name: "Morocco", phoneCode: "+212" },
  { code: "MZ", name: "Mozambique", phoneCode: "+258" },
  { code: "MM", name: "Myanmar", phoneCode: "+95" },
  { code: "NA", name: "Namibia", phoneCode: "+264" },
  { code: "NR", name: "Nauru", phoneCode: "+674" },
  { code: "NP", name: "Nepal", phoneCode: "+977" },
  { code: "NL", name: "Netherlands", phoneCode: "+31" },
  { code: "NZ", name: "New Zealand", phoneCode: "+64" },
  { code: "NI", name: "Nicaragua", phoneCode: "+505" },
  { code: "NE", name: "Niger", phoneCode: "+227" },
  { code: "NG", name: "Nigeria", phoneCode: "+234" },
  { code: "MK", name: "North Macedonia", phoneCode: "+389" },
  { code: "NO", name: "Norway", phoneCode: "+47" },
  { code: "OM", name: "Oman", phoneCode: "+968" },
  { code: "PK", name: "Pakistan", phoneCode: "+92" },
  { code: "PW", name: "Palau", phoneCode: "+680" },
  { code: "PS", name: "Palestine", phoneCode: "+970" },
  { code: "PA", name: "Panama", phoneCode: "+507" },
  { code: "PG", name: "Papua New Guinea", phoneCode: "+675" },
  { code: "PY", name: "Paraguay", phoneCode: "+595" },
  { code: "PE", name: "Peru", phoneCode: "+51" },
  { code: "PH", name: "Philippines", phoneCode: "+63" },
  { code: "PL", name: "Poland", phoneCode: "+48" },
  { code: "PT", name: "Portugal", phoneCode: "+351" },
  { code: "QA", name: "Qatar", phoneCode: "+974" },
  { code: "RO", name: "Romania", phoneCode: "+40" },
  { code: "RU", name: "Russia", phoneCode: "+7" },
  { code: "RW", name: "Rwanda", phoneCode: "+250" },
  { code: "KN", name: "Saint Kitts and Nevis", phoneCode: "+1-869" },
  { code: "LC", name: "Saint Lucia", phoneCode: "+1-758" },
  { code: "VC", name: "Saint Vincent and the Grenadines", phoneCode: "+1-784" },
  { code: "WS", name: "Samoa", phoneCode: "+685" },
  { code: "SM", name: "San Marino", phoneCode: "+378" },
  { code: "ST", name: "São Tomé and Príncipe", phoneCode: "+239" },
  { code: "SA", name: "Saudi Arabia", phoneCode: "+966" },
  { code: "SN", name: "Senegal", phoneCode: "+221" },
  { code: "RS", name: "Serbia", phoneCode: "+381" },
  { code: "SC", name: "Seychelles", phoneCode: "+248" },
  { code: "SL", name: "Sierra Leone", phoneCode: "+232" },
  { code: "SG", name: "Singapore", phoneCode: "+65" },
  { code: "SK", name: "Slovakia", phoneCode: "+421" },
  { code: "SI", name: "Slovenia", phoneCode: "+386" },
  { code: "SB", name: "Solomon Islands", phoneCode: "+677" },
  { code: "SO", name: "Somalia", phoneCode: "+252" },
  { code: "ZA", name: "South Africa", phoneCode: "+27" },
  { code: "SS", name: "South Sudan", phoneCode: "+211" },
  { code: "ES", name: "Spain", phoneCode: "+34" },
  { code: "LK", name: "Sri Lanka", phoneCode: "+94" },
  { code: "SD", name: "Sudan", phoneCode: "+249" },
  { code: "SR", name: "Suriname", phoneCode: "+597" },
  { code: "SE", name: "Sweden", phoneCode: "+46" },
  { code: "CH", name: "Switzerland", phoneCode: "+41" },
  { code: "SY", name: "Syria", phoneCode: "+963" },
  { code: "TW", name: "Taiwan", phoneCode: "+886" },
  { code: "TJ", name: "Tajikistan", phoneCode: "+992" },
  { code: "TZ", name: "Tanzania", phoneCode: "+255" },
  { code: "TH", name: "Thailand", phoneCode: "+66" },
  { code: "TL", name: "Timor-Leste", phoneCode: "+670" },
  { code: "TG", name: "Togo", phoneCode: "+228" },
  { code: "TO", name: "Tonga", phoneCode: "+676" },
  { code: "TT", name: "Trinidad and Tobago", phoneCode: "+1-868" },
  { code: "TN", name: "Tunisia", phoneCode: "+216" },
  { code: "TR", name: "Turkey", phoneCode: "+90" },
  { code: "TM", name: "Turkmenistan", phoneCode: "+993" },
  { code: "TV", name: "Tuvalu", phoneCode: "+688" },
  { code: "UG", name: "Uganda", phoneCode: "+256" },
  { code: "UA", name: "Ukraine", phoneCode: "+380" },
  { code: "AE", name: "United Arab Emirates", phoneCode: "+971" },
  { code: "GB", name: "United Kingdom", phoneCode: "+44" },
  { code: "US", name: "United States", phoneCode: "+1" },
  { code: "UY", name: "Uruguay", phoneCode: "+598" },
  { code: "UZ", name: "Uzbekistan", phoneCode: "+998" },
  { code: "VU", name: "Vanuatu", phoneCode: "+678" },
  { code: "VA", name: "Vatican City", phoneCode: "+379" },
  { code: "VE", name: "Venezuela", phoneCode: "+58" },
  { code: "VN", name: "Vietnam", phoneCode: "+84" },
  { code: "YE", name: "Yemen", phoneCode: "+967" },
  { code: "ZM", name: "Zambia", phoneCode: "+260" },
  { code: "ZW", name: "Zimbabwe", phoneCode: "+263" },
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

export function SignupForm({ onSuccess, onSwitchToLogin, onBackToLanding, joinCode }: SignupFormProps) {
  const [step, setStep] = useState<SignupStep>("account-type");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isStepLoading, setIsStepLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof SignupData, string>>>({});
  const [jointAccountData, setJointAccountData] = useState<JointAccountResponse | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
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

  const getShareableLink = (code: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join/${code}`;
  };

  const copyShareableLink = () => {
    if (jointAccountData?.joinCode) {
      const link = getShareableLink(jointAccountData.joinCode);
      navigator.clipboard.writeText(link);
      setLinkCopied(true);
      toast({
        title: "Link Copied!",
        description: "Share this link with your partner to join your account.",
      });
      setTimeout(() => setLinkCopied(false), 3000);
    }
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
        joinCode: joinCode || undefined,
      };
      const response = await apiRequest("POST", "/api/auth/register", signupPayload);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      if (data.jointAccount && data.joinedExisting) {
        toast({
          title: "Welcome!",
          description: "You've successfully joined the joint account. Awaiting approval.",
        });
        setStep("pending-approval");
      } else if (data.jointAccount && formData.accountType === 'joint') {
        setJointAccountData(data.jointAccount);
        setStep("success");
        toast({
          title: "Account Created!",
          description: "Share the invite link with your partner.",
        });
      } else {
        toast({
          title: "Account Created!",
          description: "Your account is awaiting approval.",
        });
        setStep("pending-approval");
      }
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
      case "success": return "Account Created";
      default: return "";
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
      case "success": return "Share your invite link with your partner";
      default: return "";
    }
  };

  if (step === "pending-approval") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1 px-4 sm:px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-amber-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Account Created Successfully!</CardTitle>
          <CardDescription className="text-base">
            Your account is awaiting approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">⏳</span>
              </div>
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200">What happens next?</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Our team will review your application and verify your information. This usually takes 1-2 business days.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                We've sent a confirmation email to <strong className="text-foreground">{formData.email}</strong>
              </span>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              You'll receive another email once your account has been approved.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              onClick={() => onSwitchToLogin?.()}
              className="w-full bg-[#e4fe7b] text-black hover:bg-[#d4ee6b]"
              data-testid="button-back-to-login"
            >
              Back to Login
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            If you have any questions, please contact our support team.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (step === "success" && jointAccountData) {
    const shareableLink = getShareableLink(jointAccountData.joinCode);
    
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1 px-4 sm:px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-[#e4fe7b]/20 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-10 h-10 text-[#e4fe7b]" />
          </div>
          <CardTitle className="text-2xl font-bold">Joint Account Created!</CardTitle>
          <CardDescription className="text-base">
            Share the link below with your partner to invite them to your joint account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6">
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Partner Invite Link</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted/50 rounded-lg border text-sm break-all font-mono">
                {shareableLink}
              </div>
              <Button
                onClick={copyShareableLink}
                variant="outline"
                size="icon"
                className="flex-shrink-0 h-10 w-10"
                data-testid="button-copy-link"
              >
                {linkCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Link2 className="h-4 w-4 text-primary" />
              <span className="font-medium">Join Code: {jointAccountData.joinCode}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your partner can also enter this code manually if they already have an account
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-4">
            <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
              <strong>Note:</strong> Your account is pending approval. You'll receive an email once verified.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={copyShareableLink}
              className="w-full bg-[#e4fe7b] text-black hover:bg-[#d4ee6b]"
              data-testid="button-share-link"
            >
              {linkCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Invite Link
                </>
              )}
            </Button>
            
            <Button
              onClick={() => onSwitchToLogin?.()}
              variant="outline"
              className="w-full"
              data-testid="button-back-to-login"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isStepLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1 px-4 sm:px-6">
          {step !== "account-type" && step !== "success" && (
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
        {step !== "account-type" && step !== "success" && (
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
        {step !== "account-type" && step !== "success" && (
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
              <Label>Country of Residence</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => {
                  updateFormData("country", value);
                  const selectedCountry = countries.find(c => c.code === value);
                  if (selectedCountry) {
                    const phoneCode = selectedCountry.phoneCode.replace(/-/g, '') + ' ';
                    if (!formData.phone || formData.phone.trim() === '' || countries.some(c => formData.phone.startsWith(c.phoneCode.replace(/-/g, '')))) {
                      updateFormData("phone", phoneCode);
                    }
                  }
                }}
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

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder={formData.country ? `${countries.find(c => c.code === formData.country)?.phoneCode || '+1'} (555) 000-0000` : "+1 (555) 000-0000"}
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
