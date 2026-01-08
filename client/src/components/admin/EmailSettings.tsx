import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Send, CheckCircle, AlertCircle, Loader2, Key, Eye, EyeOff, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

interface EmailConfig {
  email_from_address?: string;
  email_from_name?: string;
  email_welcome_enabled?: string;
  email_deposit_enabled?: string;
  email_stock_enabled?: string;
  email_rewards_enabled?: string;
}

interface ApiKeyStatus {
  hasApiKey: boolean;
  source: 'database' | 'environment' | 'none';
  apiKeyPrefix: string | null;
}

export function EmailSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testEmail, setTestEmail] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [formData, setFormData] = useState<EmailConfig>({
    email_from_address: "info@refluxcapital.com",
    email_from_name: "Reflux Capital",
    email_welcome_enabled: "true",
    email_deposit_enabled: "true",
    email_stock_enabled: "true",
    email_rewards_enabled: "true",
  });

  const { data: config, isLoading } = useQuery<EmailConfig>({
    queryKey: ["/api/admin/email/config"],
  });

  const { data: apiKeyStatus, isLoading: isLoadingApiKey } = useQuery<ApiKeyStatus>({
    queryKey: ["/api/admin/email/api-key-status"],
  });

  useEffect(() => {
    if (config) {
      setFormData((prev) => ({
        ...prev,
        ...config,
      }));
    }
  }, [config]);

  const saveApiKeyMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      const response = await apiRequest("POST", "/api/admin/email/api-key", { apiKey });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "API Key Saved",
        description: data.message,
      });
      setNewApiKey("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/api-key-status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Save API Key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearApiKeyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/admin/email/api-key");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "API Key Cleared",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/api-key-status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Clear API Key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (settings: EmailConfig) => {
      const response = await apiRequest("POST", "/api/admin/email/config", { settings });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Email configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email/config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Save",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/admin/email/send-test", { email });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Email Sent",
        description: "Check your inbox for the test email.",
      });
      setTestEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveConfigMutation.mutate(formData);
  };

  const handleSendTestEmail = () => {
    if (!testEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to send the test to.",
        variant: "destructive",
      });
      return;
    }
    sendTestEmailMutation.mutate(testEmail);
  };

  const handleSaveApiKey = () => {
    if (!newApiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter an API key.",
        variant: "destructive",
      });
      return;
    }
    if (!newApiKey.startsWith('re_')) {
      toast({
        title: "Invalid Format",
        description: "Resend API keys start with 're_'",
        variant: "destructive",
      });
      return;
    }
    saveApiKeyMutation.mutate(newApiKey);
  };

  const handleClearApiKey = () => {
    if (confirm("Clear the database API key and revert to environment variable?")) {
      clearApiKeyMutation.mutate();
    }
  };

  if (isLoading || isLoadingApiKey) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Key Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Resend API Key
              </CardTitle>
              <CardDescription>
                Configure your Resend API key for sending emails
              </CardDescription>
            </div>
            {apiKeyStatus?.hasApiKey ? (
              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                {apiKeyStatus.source === 'database' ? 'Custom Key Active' : 'Environment Key Active'}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                No API Key
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiKeyStatus?.hasApiKey && (
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Current API Key</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {apiKeyStatus.apiKeyPrefix}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {apiKeyStatus.source === 'database' ? 'Database' : 'Environment Variable'}
                  </Badge>
                  {apiKeyStatus.source === 'database' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearApiKey}
                      disabled={clearApiKeyMutation.isPending}
                      data-testid="button-clear-api-key"
                    >
                      {clearApiKeyMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="api-key">
              {apiKeyStatus?.hasApiKey ? 'Replace API Key' : 'Set API Key'}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="re_xxxxxxxx..."
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  data-testid="input-api-key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowApiKey(!showApiKey)}
                  data-testid="button-toggle-api-key-visibility"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                onClick={handleSaveApiKey}
                disabled={saveApiKeyMutation.isPending || !newApiKey}
                className="bg-[#e4fe7b] text-black hover:bg-[#d4ee6b]"
                data-testid="button-save-api-key"
              >
                {saveApiKeyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Save Key
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">resend.com/api-keys</a>. Use "Full access" permission.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Configure email settings for sending notifications via Resend API
              </CardDescription>
            </div>
            {apiKeyStatus?.hasApiKey && (
              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                Resend API Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from-address">From Email Address</Label>
              <Input
                id="from-address"
                placeholder="info@refluxcapital.com"
                value={formData.email_from_address || ""}
                onChange={(e) => setFormData({ ...formData, email_from_address: e.target.value })}
                data-testid="input-from-address"
              />
              <p className="text-xs text-muted-foreground">
                Must be from a verified domain in Resend
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from-name">From Name</Label>
              <Input
                id="from-name"
                placeholder="Reflux Capital"
                value={formData.email_from_name || ""}
                onChange={(e) => setFormData({ ...formData, email_from_name: e.target.value })}
                data-testid="input-from-name"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saveConfigMutation.isPending}
              className="bg-[#e4fe7b] text-black hover:bg-[#d4ee6b]"
              data-testid="button-save-email-settings"
            >
              {saveConfigMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Enable or disable different types of email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div>
              <p className="font-medium">Welcome Emails</p>
              <p className="text-sm text-muted-foreground">Send welcome email when new users register</p>
            </div>
            <Switch
              checked={formData.email_welcome_enabled === "true"}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, email_welcome_enabled: checked ? "true" : "false" })
              }
              data-testid="switch-welcome-email"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div>
              <p className="font-medium">Deposit Notifications</p>
              <p className="text-sm text-muted-foreground">Notify users when deposits are approved</p>
            </div>
            <Switch
              checked={formData.email_deposit_enabled === "true"}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, email_deposit_enabled: checked ? "true" : "false" })
              }
              data-testid="switch-deposit-email"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div>
              <p className="font-medium">Stock Purchase Notifications</p>
              <p className="text-sm text-muted-foreground">Notify users when stock purchases are approved</p>
            </div>
            <Switch
              checked={formData.email_stock_enabled === "true"}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, email_stock_enabled: checked ? "true" : "false" })
              }
              data-testid="switch-stock-email"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div>
              <p className="font-medium">Rewards Notifications</p>
              <p className="text-sm text-muted-foreground">Notify users about XP rewards and bonuses</p>
            </div>
            <Switch
              checked={formData.email_rewards_enabled === "true"}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, email_rewards_enabled: checked ? "true" : "false" })
              }
              data-testid="switch-rewards-email"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Test Email
          </CardTitle>
          <CardDescription>
            Send a test email to verify your configuration is working
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1"
              data-testid="input-test-email"
            />
            <Button
              onClick={handleSendTestEmail}
              disabled={sendTestEmailMutation.isPending || !testEmail}
              data-testid="button-send-test-email"
            >
              {sendTestEmailMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Test
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
