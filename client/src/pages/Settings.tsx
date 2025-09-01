import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/providers/ThemeProvider";

export default function Settings() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, isLoading, toast]);

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

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="settings-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="ml-0 lg:ml-64 min-h-screen">
        <TopBar title="Settings" onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6 pb-20 lg:pb-6">
          <div className="max-w-4xl mx-auto">
            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
                <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
                <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
                <TabsTrigger value="preferences" data-testid="tab-preferences">Preferences</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="space-y-6">
                <Card className="p-6" data-testid="card-profile-settings">
                  <h3 className="text-lg font-semibold mb-6">Profile Information</h3>
                  
                  <div className="flex items-center space-x-6 mb-6">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={user?.profileImageUrl || ""} />
                      <AvatarFallback className="text-lg bg-gradient-to-br from-primary to-accent text-white">
                        {getInitials(user?.firstName, user?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-lg" data-testid="text-user-full-name">
                        {user?.firstName && user?.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : 'User'
                        }
                      </h4>
                      <p className="text-muted-foreground" data-testid="text-user-email">{user?.email}</p>
                      <Badge className={getKycStatusColor(user?.kycStatus || 'pending')}>
                        KYC: {user?.kycStatus || 'pending'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                  
                  <div className="mb-6">
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
                  
                  <Button onClick={handleSaveProfile} data-testid="button-save-profile">
                    Save Changes
                  </Button>
                </Card>

                {/* KYC Section */}
                <Card className="p-6" data-testid="card-kyc-section">
                  <h3 className="text-lg font-semibold mb-4">Identity Verification (KYC)</h3>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium">Verification Status</p>
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
                      variant="outline" 
                      className="w-full"
                      onClick={() => toast({ title: "KYC Upload", description: "KYC upload functionality coming soon!" })}
                      data-testid="button-upload-kyc"
                    >
                      <i className="fas fa-upload mr-2"></i>
                      Upload KYC Documents
                    </Button>
                  )}
                </Card>
              </TabsContent>
              
              <TabsContent value="notifications" className="space-y-6">
                <Card className="p-6" data-testid="card-notification-settings">
                  <h3 className="text-lg font-semibold mb-6">Notification Preferences</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-4">Delivery Methods</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Email Notifications</p>
                            <p className="text-sm text-muted-foreground">Receive updates via email</p>
                          </div>
                          <Switch
                            checked={notifications.email}
                            onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                            data-testid="switch-email-notifications"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Push Notifications</p>
                            <p className="text-sm text-muted-foreground">Browser push notifications</p>
                          </div>
                          <Switch
                            checked={notifications.push}
                            onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                            data-testid="switch-push-notifications"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">SMS Notifications</p>
                            <p className="text-sm text-muted-foreground">Text message alerts</p>
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
                          <div>
                            <p className="font-medium">Portfolio Updates</p>
                            <p className="text-sm text-muted-foreground">Performance and rebalancing alerts</p>
                          </div>
                          <Switch
                            checked={notifications.portfolio}
                            onCheckedChange={(checked) => setNotifications({ ...notifications, portfolio: checked })}
                            data-testid="switch-portfolio-notifications"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Staking Rewards</p>
                            <p className="text-sm text-muted-foreground">Reward payouts and term completions</p>
                          </div>
                          <Switch
                            checked={notifications.staking}
                            onCheckedChange={(checked) => setNotifications({ ...notifications, staking: checked })}
                            data-testid="switch-staking-notifications"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Challenge Updates</p>
                            <p className="text-sm text-muted-foreground">Community challenge progress</p>
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
                  
                  <Button onClick={handleSaveNotifications} className="mt-6" data-testid="button-save-notifications">
                    Save Notification Settings
                  </Button>
                </Card>
              </TabsContent>
              
              <TabsContent value="security" className="space-y-6">
                <Card className="p-6" data-testid="card-security-settings">
                  <h3 className="text-lg font-semibold mb-6">Security Settings</h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                      </div>
                      <Switch
                        checked={security.twoFactor}
                        onCheckedChange={(checked) => setSecurity({ ...security, twoFactor: checked })}
                        data-testid="switch-two-factor"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Login Alerts</p>
                        <p className="text-sm text-muted-foreground">Get notified of new login attempts</p>
                      </div>
                      <Switch
                        checked={security.loginAlerts}
                        onCheckedChange={(checked) => setSecurity({ ...security, loginAlerts: checked })}
                        data-testid="switch-login-alerts"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Device Tracking</p>
                        <p className="text-sm text-muted-foreground">Monitor devices accessing your account</p>
                      </div>
                      <Switch
                        checked={security.deviceTracking}
                        onCheckedChange={(checked) => setSecurity({ ...security, deviceTracking: checked })}
                        data-testid="switch-device-tracking"
                      />
                    </div>
                  </div>
                  
                  <div className="border-t border-border pt-6 mt-6">
                    <h4 className="font-medium mb-4">Connected Sessions</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                            <i className="fas fa-desktop text-green-500"></i>
                          </div>
                          <div>
                            <p className="font-medium">Current Session</p>
                            <p className="text-sm text-muted-foreground">Chrome • Today</p>
                          </div>
                        </div>
                        <Badge className="bg-green-500/10 text-green-500">Active</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={handleSaveSecurity} className="mt-6" data-testid="button-save-security">
                    Save Security Settings
                  </Button>
                </Card>
              </TabsContent>
              
              <TabsContent value="preferences" className="space-y-6">
                <Card className="p-6" data-testid="card-preferences">
                  <h3 className="text-lg font-semibold mb-6">App Preferences</h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Dark Mode</p>
                        <p className="text-sm text-muted-foreground">Toggle between light and dark themes</p>
                      </div>
                      <Switch
                        checked={theme === 'dark'}
                        onCheckedChange={toggleTheme}
                        data-testid="switch-dark-mode"
                      />
                    </div>
                    
                    <div className="border-t border-border pt-6">
                      <h4 className="font-medium mb-4">Investment Limits</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="dailyLimit">Daily Investment Limit</Label>
                          <Input
                            id="dailyLimit"
                            type="number"
                            defaultValue="10000"
                            data-testid="input-daily-limit"
                          />
                        </div>
                        <div>
                          <Label htmlFor="monthlyLimit">Monthly Investment Limit</Label>
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
                          <div>
                            <p className="font-medium">High-Risk Portfolio Warnings</p>
                            <p className="text-sm text-muted-foreground">Get alerts before investing in high-risk portfolios</p>
                          </div>
                          <Switch defaultChecked data-testid="switch-risk-warnings" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Auto-Rebalancing</p>
                            <p className="text-sm text-muted-foreground">Allow automatic portfolio rebalancing</p>
                          </div>
                          <Switch data-testid="switch-auto-rebalancing" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button className="mt-6" data-testid="button-save-preferences">
                    Save Preferences
                  </Button>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
