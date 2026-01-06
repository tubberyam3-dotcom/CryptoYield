import { useState, useCallback, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/providers/ThemeProvider";
import { JointAccountManager } from "@/components/account/JointAccountManager";
import { cn } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { KeyRound, Copy, Check } from "lucide-react";

type SettingsTab = 'profile' | 'notifications' | 'security' | 'preferences';
type KycStep = 'intro' | 'personal' | 'address' | 'documents' | 'review';

export default function Settings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [showKycFlow, setShowKycFlow] = useState(false);
  const [kycStep, setKycStep] = useState<KycStep>('intro');
  const [kycData, setKycData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationality: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    idType: 'passport',
    idNumber: '',
    idFront: null as File | null,
    idBack: null as File | null,
    selfie: null as File | null,
  });
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
    portfolio: true,
    staking: true,
    challenges: false,
  });
  const [security, setSecurity] = useState({
    twoFactor: false,
    loginAlerts: true,
    deviceTracking: true,
  });
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const [generatedXpCode, setGeneratedXpCode] = useState<string | null>(null);
  const [xpCodeCopied, setXpCodeCopied] = useState(false);

  const generateXpCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/generate-xp-code");
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedXpCode(data.xpCode);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "XP Code Generated",
        description: "Your one-time XP Code has been created. Save it securely - you cannot generate another one.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Could not generate XP Code.",
        variant: "destructive",
      });
    },
  });

  const copyXpCode = () => {
    if (generatedXpCode) {
      navigator.clipboard.writeText(generatedXpCode);
      setXpCodeCopied(true);
      setTimeout(() => setXpCodeCopied(false), 2000);
      toast({
        title: "Copied",
        description: "XP Code copied to clipboard.",
      });
    }
  };

  const handleSaveProfile = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile settings have been saved successfully.",
    });
  };

  const handleSaveNotifications = () => {
    toast({
      title: "Notification Settings Updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const handleSaveSecurity = () => {
    toast({
      title: "Security Settings Updated",
      description: "Your security settings have been updated.",
    });
  };

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 text-green-500';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      case 'rejected': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  const kycSteps: { key: KycStep; label: string; icon: string }[] = [
    { key: 'intro', label: 'Start', icon: 'fas fa-play' },
    { key: 'personal', label: 'Personal', icon: 'fas fa-user' },
    { key: 'address', label: 'Address', icon: 'fas fa-home' },
    { key: 'documents', label: 'Documents', icon: 'fas fa-file-alt' },
    { key: 'review', label: 'Review', icon: 'fas fa-check' },
  ];

  const getKycProgress = () => {
    const stepIndex = kycSteps.findIndex(s => s.key === kycStep);
    return ((stepIndex) / (kycSteps.length - 1)) * 100;
  };

  const handleKycNext = () => {
    const currentIndex = kycSteps.findIndex(s => s.key === kycStep);
    if (currentIndex < kycSteps.length - 1) {
      setKycStep(kycSteps[currentIndex + 1].key);
    }
  };

  const handleKycBack = () => {
    const currentIndex = kycSteps.findIndex(s => s.key === kycStep);
    if (currentIndex > 0) {
      setKycStep(kycSteps[currentIndex - 1].key);
    }
  };

  const resetKycData = () => {
    setKycData({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      nationality: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      idType: 'passport',
      idNumber: '',
      idFront: null,
      idBack: null,
      selfie: null,
    });
    setKycStep('intro');
  };

  const handleKycClose = () => {
    setShowKycFlow(false);
    resetKycData();
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: {
      firstName: string;
      lastName: string;
      phoneNumber?: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
      verificationDocumentType?: string;
    }) => {
      const response = await apiRequest("PATCH", "/api/user/profile", profileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "KYC Submitted",
        description: "Your verification documents have been submitted for review. This usually takes 1-3 business days.",
      });
      setShowKycFlow(false);
      resetKycData();
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Could not submit your verification.",
        variant: "destructive",
      });
    },
  });

  const handleKycSubmit = () => {
    updateProfileMutation.mutate({
      firstName: kycData.firstName,
      lastName: kycData.lastName,
      address: kycData.address,
      city: kycData.city,
      state: kycData.state,
      zipCode: kycData.postalCode,
      country: kycData.country,
      verificationDocumentType: kycData.idType as any,
    });
  };

  const tabs: { key: SettingsTab; label: string; icon: string }[] = [
    { key: 'profile', label: 'Profile', icon: 'fas fa-user' },
    { key: 'notifications', label: 'Alerts', icon: 'fas fa-bell' },
    { key: 'security', label: 'Security', icon: 'fas fa-shield-alt' },
    { key: 'preferences', label: 'Preferences', icon: 'fas fa-cog' },
  ];

  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    align: 'start',
    skipSnaps: false,
    dragFree: false,
  });

  const onTabSelect = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
    setActiveTab(tabs[index].key);
  }, [emblaApi]);

  const onSlideChange = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setActiveTab(tabs[index].key);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSlideChange);
    return () => {
      emblaApi.off('select', onSlideChange);
    };
  }, [emblaApi, onSlideChange]);

  useEffect(() => {
    if (!emblaApi) return;
    const index = tabs.findIndex(t => t.key === activeTab);
    if (index !== -1 && emblaApi.selectedScrollSnap() !== index) {
      emblaApi.scrollTo(index);
    }
  }, [activeTab, emblaApi]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const renderKycFlow = () => {
    return (
      <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
        <div className="min-h-screen p-4 md:p-6">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Identity Verification</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleKycClose}
                data-testid="button-close-kyc"
              >
                <i className="fas fa-times text-lg"></i>
              </Button>
            </div>

            <div className="mb-6">
              <Progress value={getKycProgress()} className="h-2" />
              <div className="flex justify-between mt-2">
                {kycSteps.map((step, index) => (
                  <div 
                    key={step.key}
                    className={cn(
                      "flex flex-col items-center",
                      kycSteps.findIndex(s => s.key === kycStep) >= index 
                        ? "text-primary" 
                        : "text-muted-foreground"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs mb-1",
                      kycSteps.findIndex(s => s.key === kycStep) >= index
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}>
                      <i className={step.icon}></i>
                    </div>
                    <span className="text-[10px] hidden sm:block">{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Card className="p-4 md:p-6">
              {kycStep === 'intro' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <i className="fas fa-id-card text-2xl text-primary"></i>
                  </div>
                  <h3 className="text-lg font-semibold">Verify Your Identity</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete your KYC verification to unlock higher investment limits and full platform access. This process takes about 5 minutes.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                    <p className="text-sm font-medium">You'll need:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <i className="fas fa-check text-green-500 text-xs"></i>
                        Government-issued ID (passport, driver's license, or national ID)
                      </li>
                      <li className="flex items-center gap-2">
                        <i className="fas fa-check text-green-500 text-xs"></i>
                        Proof of address (utility bill or bank statement)
                      </li>
                      <li className="flex items-center gap-2">
                        <i className="fas fa-check text-green-500 text-xs"></i>
                        A clear selfie for verification
                      </li>
                    </ul>
                  </div>
                  <Button onClick={handleKycNext} className="w-full" data-testid="button-start-kyc">
                    Start Verification
                  </Button>
                </div>
              )}

              {kycStep === 'personal' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Personal Information</h3>
                  <p className="text-sm text-muted-foreground">Please enter your legal name as it appears on your ID.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="kyc-firstName">First Name</Label>
                      <Input
                        id="kyc-firstName"
                        value={kycData.firstName}
                        onChange={(e) => setKycData({ ...kycData, firstName: e.target.value })}
                        placeholder="John"
                        data-testid="input-kyc-first-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="kyc-lastName">Last Name</Label>
                      <Input
                        id="kyc-lastName"
                        value={kycData.lastName}
                        onChange={(e) => setKycData({ ...kycData, lastName: e.target.value })}
                        placeholder="Doe"
                        data-testid="input-kyc-last-name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="kyc-dob">Date of Birth</Label>
                    <Input
                      id="kyc-dob"
                      type="date"
                      value={kycData.dateOfBirth}
                      onChange={(e) => setKycData({ ...kycData, dateOfBirth: e.target.value })}
                      data-testid="input-kyc-dob"
                    />
                  </div>

                  <div>
                    <Label htmlFor="kyc-nationality">Nationality</Label>
                    <Input
                      id="kyc-nationality"
                      value={kycData.nationality}
                      onChange={(e) => setKycData({ ...kycData, nationality: e.target.value })}
                      placeholder="United States"
                      data-testid="input-kyc-nationality"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={handleKycBack} className="flex-1" data-testid="button-kyc-back">
                      Back
                    </Button>
                    <Button onClick={handleKycNext} className="flex-1" data-testid="button-kyc-next">
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {kycStep === 'address' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Residential Address</h3>
                  <p className="text-sm text-muted-foreground">Enter your current residential address.</p>
                  
                  <div>
                    <Label htmlFor="kyc-address">Street Address</Label>
                    <Input
                      id="kyc-address"
                      value={kycData.address}
                      onChange={(e) => setKycData({ ...kycData, address: e.target.value })}
                      placeholder="123 Main Street"
                      data-testid="input-kyc-address"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="kyc-city">City</Label>
                      <Input
                        id="kyc-city"
                        value={kycData.city}
                        onChange={(e) => setKycData({ ...kycData, city: e.target.value })}
                        placeholder="New York"
                        data-testid="input-kyc-city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="kyc-state">State/Province</Label>
                      <Input
                        id="kyc-state"
                        value={kycData.state}
                        onChange={(e) => setKycData({ ...kycData, state: e.target.value })}
                        placeholder="NY"
                        data-testid="input-kyc-state"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="kyc-postal">Postal Code</Label>
                      <Input
                        id="kyc-postal"
                        value={kycData.postalCode}
                        onChange={(e) => setKycData({ ...kycData, postalCode: e.target.value })}
                        placeholder="10001"
                        data-testid="input-kyc-postal"
                      />
                    </div>
                    <div>
                      <Label htmlFor="kyc-country">Country</Label>
                      <Input
                        id="kyc-country"
                        value={kycData.country}
                        onChange={(e) => setKycData({ ...kycData, country: e.target.value })}
                        placeholder="United States"
                        data-testid="input-kyc-country"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={handleKycBack} className="flex-1" data-testid="button-kyc-back">
                      Back
                    </Button>
                    <Button onClick={handleKycNext} className="flex-1" data-testid="button-kyc-next">
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {kycStep === 'documents' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Upload Documents</h3>
                  <p className="text-sm text-muted-foreground">Upload clear photos of your identification documents.</p>
                  
                  <div>
                    <Label>ID Type</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {['passport', 'license', 'national_id'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setKycData({ ...kycData, idType: type })}
                          className={cn(
                            "p-3 rounded-lg border text-center text-sm transition-colors",
                            kycData.idType === type
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50"
                          )}
                          data-testid={`button-id-type-${type}`}
                        >
                          <i className={cn(
                            "fas mb-1 block",
                            type === 'passport' ? 'fa-passport' :
                            type === 'license' ? 'fa-id-card' : 'fa-address-card'
                          )}></i>
                          {type === 'passport' ? 'Passport' :
                           type === 'license' ? "Driver's License" : 'National ID'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="kyc-id-number">ID Number</Label>
                    <Input
                      id="kyc-id-number"
                      value={kycData.idNumber}
                      onChange={(e) => setKycData({ ...kycData, idNumber: e.target.value })}
                      placeholder="Enter your ID number"
                      data-testid="input-kyc-id-number"
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label>Front of ID</Label>
                      <div className="mt-2 border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="id-front"
                          onChange={(e) => setKycData({ ...kycData, idFront: e.target.files?.[0] || null })}
                        />
                        <label htmlFor="id-front" className="cursor-pointer">
                          <i className="fas fa-cloud-upload-alt text-2xl text-muted-foreground mb-2"></i>
                          <p className="text-sm text-muted-foreground">
                            {kycData.idFront ? kycData.idFront.name : 'Click to upload front of ID'}
                          </p>
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label>Back of ID</Label>
                      <div className="mt-2 border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="id-back"
                          onChange={(e) => setKycData({ ...kycData, idBack: e.target.files?.[0] || null })}
                        />
                        <label htmlFor="id-back" className="cursor-pointer">
                          <i className="fas fa-cloud-upload-alt text-2xl text-muted-foreground mb-2"></i>
                          <p className="text-sm text-muted-foreground">
                            {kycData.idBack ? kycData.idBack.name : 'Click to upload back of ID'}
                          </p>
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label>Selfie with ID</Label>
                      <div className="mt-2 border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="selfie"
                          onChange={(e) => setKycData({ ...kycData, selfie: e.target.files?.[0] || null })}
                        />
                        <label htmlFor="selfie" className="cursor-pointer">
                          <i className="fas fa-camera text-2xl text-muted-foreground mb-2"></i>
                          <p className="text-sm text-muted-foreground">
                            {kycData.selfie ? kycData.selfie.name : 'Take a selfie holding your ID'}
                          </p>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={handleKycBack} className="flex-1" data-testid="button-kyc-back">
                      Back
                    </Button>
                    <Button onClick={handleKycNext} className="flex-1" data-testid="button-kyc-next">
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {kycStep === 'review' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Review Your Information</h3>
                  <p className="text-sm text-muted-foreground">Please review your details before submitting.</p>
                  
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <i className="fas fa-user text-primary"></i>
                        Personal Information
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Name:</span>
                          <p className="font-medium">{kycData.firstName} {kycData.lastName}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">DOB:</span>
                          <p className="font-medium">{kycData.dateOfBirth || 'Not provided'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Nationality:</span>
                          <p className="font-medium">{kycData.nationality || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <i className="fas fa-home text-primary"></i>
                        Address
                      </h4>
                      <p className="text-sm">
                        {kycData.address || 'Not provided'}<br />
                        {kycData.city}, {kycData.state} {kycData.postalCode}<br />
                        {kycData.country}
                      </p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <i className="fas fa-file-alt text-primary"></i>
                        Documents
                      </h4>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <i className={cn("fas", kycData.idFront ? "fa-check text-green-500" : "fa-times text-red-500")}></i>
                          <span>Front of ID</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className={cn("fas", kycData.idBack ? "fa-check text-green-500" : "fa-times text-red-500")}></i>
                          <span>Back of ID</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className={cn("fas", kycData.selfie ? "fa-check text-green-500" : "fa-times text-red-500")}></i>
                          <span>Selfie with ID</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      <i className="fas fa-info-circle mr-2"></i>
                      By submitting, you confirm that all information provided is accurate and matches your official documents.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={handleKycBack} className="flex-1" data-testid="button-kyc-back">
                      Back
                    </Button>
                    <Button onClick={handleKycSubmit} className="flex-1" data-testid="button-kyc-submit">
                      Submit Verification
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="settings-page">
      {showKycFlow && renderKycFlow()}
      
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="ml-0 lg:ml-64 min-h-screen">
        <TopBar title="Settings" onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />
        
        <main className="p-4 md:p-6 pb-24 lg:pb-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
              {tabs.map((tab, index) => (
                <button
                  key={tab.key}
                  onClick={() => onTabSelect(index)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                  data-testid={`tab-${tab.key}`}
                >
                  <i className={tab.icon}></i>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 mb-4 lg:hidden">
              {tabs.map((tab, index) => (
                <button
                  key={tab.key}
                  onClick={() => onTabSelect(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    activeTab === tab.key
                      ? "bg-primary w-6"
                      : "bg-muted-foreground/30"
                  )}
                  aria-label={`Go to ${tab.label}`}
                />
              ))}
            </div>

            <div className="lg:hidden overflow-hidden" ref={emblaRef}>
              <div className="flex">
                <div className="flex-[0_0_100%] min-w-0 px-1">
                  <div className="space-y-4">
                    <Card className="p-4" data-testid="card-profile-settings-mobile">
                      <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
                      
                      <div className="flex flex-col items-center gap-4 mb-6">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={user?.profileImageUrl || ""} />
                          <AvatarFallback className="text-lg bg-gradient-to-br from-primary to-accent text-white">
                            {getInitials(user?.firstName, user?.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                          <h4 className="font-semibold text-lg">
                            {user?.firstName && user?.lastName 
                              ? `${user.firstName} ${user.lastName}`
                              : 'User'
                            }
                          </h4>
                          <p className="text-sm text-muted-foreground">{user?.email}</p>
                          <Badge className={cn("mt-1", getKycStatusColor(user?.kycStatus || 'pending'))}>
                            KYC: {user?.kycStatus || 'pending'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <div>
                          <Label htmlFor="firstName-mobile">First Name</Label>
                          <Input id="firstName-mobile" defaultValue={user?.firstName || ""} />
                        </div>
                        <div>
                          <Label htmlFor="lastName-mobile">Last Name</Label>
                          <Input id="lastName-mobile" defaultValue={user?.lastName || ""} />
                        </div>
                        <div>
                          <Label htmlFor="email-mobile">Email</Label>
                          <Input id="email-mobile" type="email" defaultValue={user?.email || ""} disabled />
                        </div>
                      </div>
                      
                      <Button onClick={handleSaveProfile} className="w-full">Save Changes</Button>
                    </Card>

                    <Card className="p-4" data-testid="card-kyc-section-mobile">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">Identity Verification</h3>
                          <p className="text-xs text-muted-foreground">Complete KYC for higher limits</p>
                        </div>
                        <Badge className={getKycStatusColor(user?.kycStatus || 'pending')}>
                          {user?.kycStatus || 'pending'}
                        </Badge>
                      </div>
                      
                      {user?.kycStatus !== 'approved' && (
                        <Button className="w-full" onClick={() => setShowKycFlow(true)}>
                          <i className="fas fa-id-card mr-2"></i>
                          Start Verification
                        </Button>
                      )}
                    </Card>
                  </div>
                </div>

                <div className="flex-[0_0_100%] min-w-0 px-1">
                  <Card className="p-4" data-testid="card-notification-settings-mobile">
                    <h3 className="text-lg font-semibold mb-4">Notifications</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Email</p>
                          <p className="text-xs text-muted-foreground">Receive email updates</p>
                        </div>
                        <Switch checked={notifications.email} onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Push</p>
                          <p className="text-xs text-muted-foreground">Browser notifications</p>
                        </div>
                        <Switch checked={notifications.push} onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">SMS</p>
                          <p className="text-xs text-muted-foreground">Text message alerts</p>
                        </div>
                        <Switch checked={notifications.sms} onCheckedChange={(checked) => setNotifications({ ...notifications, sms: checked })} />
                      </div>
                      
                      <div className="border-t border-border pt-4">
                        <h4 className="font-medium mb-3 text-sm">Content</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">Portfolio</p>
                            <Switch checked={notifications.portfolio} onCheckedChange={(checked) => setNotifications({ ...notifications, portfolio: checked })} />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">Staking</p>
                            <Switch checked={notifications.staking} onCheckedChange={(checked) => setNotifications({ ...notifications, staking: checked })} />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">Challenges</p>
                            <Switch checked={notifications.challenges} onCheckedChange={(checked) => setNotifications({ ...notifications, challenges: checked })} />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Button onClick={handleSaveNotifications} className="mt-4 w-full">Save Settings</Button>
                  </Card>
                </div>

                <div className="flex-[0_0_100%] min-w-0 px-1">
                  <Card className="p-4" data-testid="card-security-settings-mobile">
                    <h3 className="text-lg font-semibold mb-4">Security</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Two-Factor Auth</p>
                          <p className="text-xs text-muted-foreground">Extra security</p>
                        </div>
                        <Switch checked={security.twoFactor} onCheckedChange={(checked) => setSecurity({ ...security, twoFactor: checked })} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Login Alerts</p>
                          <p className="text-xs text-muted-foreground">New login notifications</p>
                        </div>
                        <Switch checked={security.loginAlerts} onCheckedChange={(checked) => setSecurity({ ...security, loginAlerts: checked })} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Device Tracking</p>
                          <p className="text-xs text-muted-foreground">Monitor devices</p>
                        </div>
                        <Switch checked={security.deviceTracking} onCheckedChange={(checked) => setSecurity({ ...security, deviceTracking: checked })} />
                      </div>
                    </div>
                    
                    <div className="border-t border-border pt-4 mt-4">
                      <h4 className="font-medium mb-3 text-sm">Sessions</h4>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                              <i className="fas fa-desktop text-green-500 text-sm"></i>
                            </div>
                            <div>
                              <p className="font-medium text-sm">Current</p>
                              <p className="text-xs text-muted-foreground">Chrome • Today</p>
                            </div>
                          </div>
                          <Badge className="bg-green-500/10 text-green-500 text-xs">Active</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <Button onClick={handleSaveSecurity} className="mt-4 w-full">Save Settings</Button>
                  </Card>
                </div>

                <div className="flex-[0_0_100%] min-w-0 px-1">
                  <Card className="p-4" data-testid="card-preferences-mobile">
                    <h3 className="text-lg font-semibold mb-4">Preferences</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Dark Mode</p>
                          <p className="text-xs text-muted-foreground">Toggle theme</p>
                        </div>
                        <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
                      </div>
                      
                      <div className="border-t border-border pt-4">
                        <h4 className="font-medium mb-3 text-sm">Limits</h4>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="dailyLimit-mobile">Daily</Label>
                            <Input id="dailyLimit-mobile" type="number" defaultValue="10000" />
                          </div>
                          <div>
                            <Label htmlFor="monthlyLimit-mobile">Monthly</Label>
                            <Input id="monthlyLimit-mobile" type="number" defaultValue="100000" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t border-border pt-4">
                        <h4 className="font-medium mb-3 text-sm">Risk</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">High-Risk Warnings</p>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">Auto-Rebalancing</p>
                            <Switch />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Button className="mt-4 w-full">Save Preferences</Button>
                  </Card>
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <Card className="p-4 md:p-6" data-testid="card-profile-settings">
                  <h3 className="text-lg font-semibold mb-4 md:mb-6">Profile Information</h3>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                    <Avatar className="w-16 h-16 md:w-20 md:h-20">
                      <AvatarImage src={user?.profileImageUrl || ""} />
                      <AvatarFallback className="text-lg bg-gradient-to-br from-primary to-accent text-white">
                        {getInitials(user?.firstName, user?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center sm:text-left">
                      <h4 className="font-semibold text-lg" data-testid="text-user-full-name">
                        {user?.firstName && user?.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : 'User'
                        }
                      </h4>
                      <p className="text-sm text-muted-foreground" data-testid="text-user-email">{user?.email}</p>
                      <Badge className={cn("mt-1", getKycStatusColor(user?.kycStatus || 'pending'))}>
                        KYC: {user?.kycStatus || 'pending'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        defaultValue={user?.firstName || ""}
                        data-testid="input-first-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        defaultValue={user?.lastName || ""}
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue={user?.email || ""}
                      disabled
                      data-testid="input-email"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Email cannot be changed. Contact support if needed.
                    </p>
                  </div>
                  
                  <Button onClick={handleSaveProfile} className="w-full sm:w-auto" data-testid="button-save-profile">
                    Save Changes
                  </Button>
                </Card>

                <Card className="p-4 md:p-6" data-testid="card-kyc-section">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Identity Verification</h3>
                      <p className="text-sm text-muted-foreground">
                        Complete KYC to unlock higher investment limits
                      </p>
                    </div>
                    <Badge className={getKycStatusColor(user?.kycStatus || 'pending')}>
                      {user?.kycStatus || 'pending'}
                    </Badge>
                  </div>
                  
                  {user?.kycStatus !== 'approved' && (
                    <Button 
                      className="w-full"
                      onClick={() => setShowKycFlow(true)}
                      data-testid="button-start-kyc"
                    >
                      <i className="fas fa-id-card mr-2"></i>
                      Start Verification
                    </Button>
                  )}

                  {user?.kycStatus === 'approved' && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                          <i className="fas fa-check text-green-500"></i>
                        </div>
                        <div>
                          <p className="font-medium text-green-600 dark:text-green-400">Verified</p>
                          <p className="text-sm text-muted-foreground">Your identity has been verified</p>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                <JointAccountManager />
              </div>
            )}
            
            {activeTab === 'notifications' && (
              <Card className="p-4 md:p-6" data-testid="card-notification-settings">
                <h3 className="text-lg font-semibold mb-4 md:mb-6">Notification Preferences</h3>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-4">Delivery Methods</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Email Notifications</p>
                          <p className="text-xs text-muted-foreground truncate">Receive updates via email</p>
                        </div>
                        <Switch
                          checked={notifications.email}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                          data-testid="switch-email-notifications"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Push Notifications</p>
                          <p className="text-xs text-muted-foreground truncate">Browser push notifications</p>
                        </div>
                        <Switch
                          checked={notifications.push}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                          data-testid="switch-push-notifications"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">SMS Notifications</p>
                          <p className="text-xs text-muted-foreground truncate">Text message alerts</p>
                        </div>
                        <Switch
                          checked={notifications.sms}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, sms: checked })}
                          data-testid="switch-sms-notifications"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-border pt-6">
                    <h4 className="font-medium mb-4">Content Types</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Portfolio Updates</p>
                          <p className="text-xs text-muted-foreground truncate">Performance alerts</p>
                        </div>
                        <Switch
                          checked={notifications.portfolio}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, portfolio: checked })}
                          data-testid="switch-portfolio-notifications"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Staking Rewards</p>
                          <p className="text-xs text-muted-foreground truncate">Reward payouts</p>
                        </div>
                        <Switch
                          checked={notifications.staking}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, staking: checked })}
                          data-testid="switch-staking-notifications"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Challenge Updates</p>
                          <p className="text-xs text-muted-foreground truncate">Community progress</p>
                        </div>
                        <Switch
                          checked={notifications.challenges}
                          onCheckedChange={(checked) => setNotifications({ ...notifications, challenges: checked })}
                          data-testid="switch-challenge-notifications"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button onClick={handleSaveNotifications} className="mt-6 w-full sm:w-auto" data-testid="button-save-notifications">
                  Save Settings
                </Button>
              </Card>
            )}
            
            {activeTab === 'security' && (
              <Card className="p-4 md:p-6" data-testid="card-security-settings">
                <h3 className="text-lg font-semibold mb-4 md:mb-6">Security Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Two-Factor Authentication</p>
                      <p className="text-xs text-muted-foreground truncate">Extra security layer</p>
                    </div>
                    <Switch
                      checked={security.twoFactor}
                      onCheckedChange={(checked) => setSecurity({ ...security, twoFactor: checked })}
                      data-testid="switch-two-factor"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Login Alerts</p>
                      <p className="text-xs text-muted-foreground truncate">Get notified of new logins</p>
                    </div>
                    <Switch
                      checked={security.loginAlerts}
                      onCheckedChange={(checked) => setSecurity({ ...security, loginAlerts: checked })}
                      data-testid="switch-login-alerts"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Device Tracking</p>
                      <p className="text-xs text-muted-foreground truncate">Monitor device access</p>
                    </div>
                    <Switch
                      checked={security.deviceTracking}
                      onCheckedChange={(checked) => setSecurity({ ...security, deviceTracking: checked })}
                      data-testid="switch-device-tracking"
                    />
                  </div>
                </div>
                
                <div className="border-t border-border pt-6 mt-6">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    XP Code Login
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate a one-time XP Code for secure login without password. This code can only be generated once.
                  </p>
                  
                  {(user as any)?.hasXpCode ? (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-muted-foreground">XP Code already generated</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Your XP Code was created previously. For security reasons, you cannot generate a new one.
                      </p>
                    </div>
                  ) : generatedXpCode ? (
                    <div className="space-y-3">
                      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-2">Your XP Code (save this securely):</p>
                        <div className="flex items-center justify-between gap-3">
                          <code className="text-lg font-mono font-bold tracking-widest text-primary">
                            {generatedXpCode}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={copyXpCode}
                            data-testid="button-copy-xp-code"
                          >
                            {xpCodeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Save this code now. You will not be able to see it again after leaving this page.
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={() => generateXpCodeMutation.mutate()}
                      disabled={generateXpCodeMutation.isPending}
                      variant="outline"
                      data-testid="button-generate-xp-code"
                    >
                      {generateXpCodeMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4 mr-2" />
                          Generate XP Code
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="border-t border-border pt-6 mt-6">
                  <h4 className="font-medium mb-4">Connected Sessions</h4>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center shrink-0">
                          <i className="fas fa-desktop text-green-500 text-sm"></i>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">Current Session</p>
                          <p className="text-xs text-muted-foreground truncate">Chrome • Today</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500/10 text-green-500 shrink-0">Active</Badge>
                    </div>
                  </div>
                </div>
                
                <Button onClick={handleSaveSecurity} className="mt-6 w-full sm:w-auto" data-testid="button-save-security">
                  Save Settings
                </Button>
              </Card>
            )}
            
            {activeTab === 'preferences' && (
              <Card className="p-4 md:p-6" data-testid="card-preferences">
                <h3 className="text-lg font-semibold mb-4 md:mb-6">App Preferences</h3>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Dark Mode</p>
                      <p className="text-xs text-muted-foreground truncate">Toggle light/dark themes</p>
                    </div>
                    <Switch
                      checked={theme === 'dark'}
                      onCheckedChange={toggleTheme}
                      data-testid="switch-dark-mode"
                    />
                  </div>
                  
                  <div className="border-t border-border pt-6">
                    <h4 className="font-medium mb-4">Investment Limits</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dailyLimit">Daily Limit</Label>
                        <Input
                          id="dailyLimit"
                          type="number"
                          defaultValue="10000"
                          data-testid="input-daily-limit"
                        />
                      </div>
                      <div>
                        <Label htmlFor="monthlyLimit">Monthly Limit</Label>
                        <Input
                          id="monthlyLimit"
                          type="number"
                          defaultValue="100000"
                          data-testid="input-monthly-limit"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-border pt-6">
                    <h4 className="font-medium mb-4">Risk Preferences</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">High-Risk Warnings</p>
                          <p className="text-xs text-muted-foreground truncate">Alert before risky investments</p>
                        </div>
                        <Switch defaultChecked data-testid="switch-risk-warnings" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Auto-Rebalancing</p>
                          <p className="text-xs text-muted-foreground truncate">Automatic portfolio rebalancing</p>
                        </div>
                        <Switch data-testid="switch-auto-rebalancing" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button className="mt-6 w-full sm:w-auto" data-testid="button-save-preferences">
                  Save Preferences
                </Button>
              </Card>
            )}
            </div>
          </div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
