import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Server, Send, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";

interface EmailConfig {
  email_smtp_host?: string;
  email_smtp_port?: string;
  email_smtp_secure?: string;
  email_smtp_user?: string;
  email_smtp_pass?: string;
  email_from_address?: string;
  email_from_name?: string;
  email_welcome_enabled?: string;
  email_deposit_enabled?: string;
  email_stock_enabled?: string;
  email_rewards_enabled?: string;
  has_smtp_password?: boolean;
}

export function EmailSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);
  
  const [formData, setFormData] = useState<EmailConfig>({
    email_smtp_host: "",
    email_smtp_port: "587",
    email_smtp_secure: "false",
    email_smtp_user: "",
    email_smtp_pass: "",
    email_from_address: "",
    email_from_name: "Reflux Capital",
    email_welcome_enabled: "true",
    email_deposit_enabled: "true",
    email_stock_enabled: "true",
    email_rewards_enabled: "false",
  });

  const { data: config, isLoading } = useQuery<EmailConfig>({
    queryKey: ["/api/admin/email/config"],
  });

  useEffect(() => {
    if (config) {
      setFormData((prev) => ({
        ...prev,
        ...config,
        email_smtp_pass: "",
      }));
      setPasswordChanged(false);
    }
  }, [config]);

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

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/email/test", {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection Successful",
        description: "SMTP connection verified successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Unable to connect to SMTP server",
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
    const dataToSave = { ...formData };
    if (!passwordChanged || !formData.email_smtp_pass) {
      delete dataToSave.email_smtp_pass;
    }
    delete (dataToSave as any).has_smtp_password;
    saveConfigMutation.mutate(dataToSave);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            SMTP Configuration
          </CardTitle>
          <CardDescription>
            Configure your email server settings for sending notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input
                id="smtp-host"
                placeholder="smtp.gmail.com"
                value={formData.email_smtp_host || ""}
                onChange={(e) => setFormData({ ...formData, email_smtp_host: e.target.value })}
                data-testid="input-smtp-host"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">SMTP Port</Label>
              <Input
                id="smtp-port"
                placeholder="587"
                value={formData.email_smtp_port || ""}
                onChange={(e) => setFormData({ ...formData, email_smtp_port: e.target.value })}
                data-testid="input-smtp-port"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-user">SMTP Username</Label>
              <Input
                id="smtp-user"
                placeholder="your-email@gmail.com"
                value={formData.email_smtp_user || ""}
                onChange={(e) => setFormData({ ...formData, email_smtp_user: e.target.value })}
                data-testid="input-smtp-user"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-pass">
                SMTP Password
                {config?.has_smtp_password && !passwordChanged && (
                  <span className="ml-2 text-xs text-green-600">(configured)</span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="smtp-pass"
                  type={showPassword ? "text" : "password"}
                  placeholder={config?.has_smtp_password && !passwordChanged ? "••••••••••••" : "Enter SMTP password"}
                  value={formData.email_smtp_pass || ""}
                  onChange={(e) => {
                    setFormData({ ...formData, email_smtp_pass: e.target.value });
                    setPasswordChanged(true);
                  }}
                  data-testid="input-smtp-pass"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="smtp-secure"
              checked={formData.email_smtp_secure === "true"}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, email_smtp_secure: checked ? "true" : "false" })
              }
            />
            <Label htmlFor="smtp-secure">Use SSL/TLS (secure connection)</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Sender Information
          </CardTitle>
          <CardDescription>
            Configure how your emails appear to recipients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from-email">From Email Address</Label>
              <Input
                id="from-email"
                placeholder="noreply@refluxcapital.com"
                value={formData.email_from_address || ""}
                onChange={(e) => setFormData({ ...formData, email_from_address: e.target.value })}
                data-testid="input-from-email"
              />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Choose which email notifications to send to users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Welcome Emails</p>
              <p className="text-sm text-muted-foreground">Send welcome email when users register</p>
            </div>
            <Switch
              checked={formData.email_welcome_enabled === "true"}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, email_welcome_enabled: checked ? "true" : "false" })
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Deposit Notifications</p>
              <p className="text-sm text-muted-foreground">Notify users when deposits are approved or rejected</p>
            </div>
            <Switch
              checked={formData.email_deposit_enabled === "true"}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, email_deposit_enabled: checked ? "true" : "false" })
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Stock Purchase Updates</p>
              <p className="text-sm text-muted-foreground">Notify users when stock purchases are approved or rejected</p>
            </div>
            <Switch
              checked={formData.email_stock_enabled === "true"}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, email_stock_enabled: checked ? "true" : "false" })
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Daily Reward Notifications</p>
              <p className="text-sm text-muted-foreground">Send email when users claim daily rewards</p>
            </div>
            <Switch
              checked={formData.email_rewards_enabled === "true"}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, email_rewards_enabled: checked ? "true" : "false" })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Test Email
          </CardTitle>
          <CardDescription>
            Test your email configuration by sending a test email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Enter email address to test"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1"
              data-testid="input-test-email"
            />
            <Button
              onClick={handleSendTestEmail}
              disabled={sendTestEmailMutation.isPending || !testEmail}
              data-testid="button-send-test"
            >
              {sendTestEmailMutation.isPending ? "Sending..." : "Send Test"}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testConnectionMutation.isPending}
              data-testid="button-test-connection"
            >
              {testConnectionMutation.isPending ? "Testing..." : "Test SMTP Connection"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          onClick={handleSave}
          disabled={saveConfigMutation.isPending}
          className="min-w-[120px]"
          data-testid="button-save-email-config"
        >
          {saveConfigMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
