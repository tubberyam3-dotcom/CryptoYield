import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Users, Plus, Copy, Check, Heart, Shield } from "lucide-react";

export function JointAccountManager() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [newJointAccount, setNewJointAccount] = useState({
    name: "",
    description: ""
  });

  const { user, hasJointAccount, jointAccount, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createJointAccountMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const response = await apiRequest("POST", "/api/joint-accounts", data);
      return response.json();
    },
    onSuccess: (jointAccount) => {
      toast({
        title: "Joint Account Created!",
        description: `Your joint account "${jointAccount.name}" has been created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setCreateDialogOpen(false);
      setNewJointAccount({ name: "", description: "" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please log in to continue",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Failed to Create Joint Account",
        description: "There was an error creating your joint account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const joinJointAccountMutation = useMutation({
    mutationFn: async (joinCode: string) => {
      const response = await apiRequest("POST", "/api/joint-accounts/join", { joinCode });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Successfully Joined!",
        description: "You have successfully joined the joint account.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setJoinDialogOpen(false);
      setJoinCode("");
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please log in to continue",
          variant: "destructive",
        });
        return;
      }
      let errorMessage = "There was an error joining the joint account.";
      if (error.message === 'Invalid join code') {
        errorMessage = "Invalid join code. Please check the code and try again.";
      } else if (error.message === 'You are already part of this joint account') {
        errorMessage = "You are already a member of this joint account.";
      }
      toast({
        title: "Failed to Join",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleCopyJoinCode = async () => {
    if (jointAccount?.joinCode) {
      await navigator.clipboard.writeText(jointAccount.joinCode);
      setCopied(true);
      toast({
        title: "Join Code Copied!",
        description: "Share this code with your partner to invite them to your joint account.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateJointAccount = () => {
    if (!newJointAccount.name.trim()) {
      toast({
        title: "Account Name Required",
        description: "Please enter a name for your joint account.",
        variant: "destructive",
      });
      return;
    }
    createJointAccountMutation.mutate(newJointAccount);
  };

  const handleJoinJointAccount = () => {
    if (!joinCode.trim()) {
      toast({
        title: "Join Code Required",
        description: "Please enter the join code provided by your partner.",
        variant: "destructive",
      });
      return;
    }
    joinJointAccountMutation.mutate(joinCode.toUpperCase());
  };

  const getRoleDisplay = (role: string) => {
    return role === 'primary' ? 'Account Creator' : 'Partner';
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === 'primary' ? 'default' : 'secondary';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Heart className="h-6 w-6 text-pink-500" />
          <h3 className="text-2xl font-semibold">Joint Account</h3>
        </div>
        {!hasJointAccount && (
          <div className="flex space-x-2">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-create-joint-account">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Joint Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Joint Account</DialogTitle>
                  <DialogDescription>
                    Create a shared account to manage investments together with your partner.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="account-name">Account Name</Label>
                    <Input
                      id="account-name"
                      placeholder="e.g., John & Sarah's Investment Account"
                      value={newJointAccount.name}
                      onChange={(e) => setNewJointAccount({ ...newJointAccount, name: e.target.value })}
                      data-testid="input-joint-account-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-description">Description (Optional)</Label>
                    <Textarea
                      id="account-description"
                      placeholder="Share your investment goals and strategy..."
                      value={newJointAccount.description}
                      onChange={(e) => setNewJointAccount({ ...newJointAccount, description: e.target.value })}
                      data-testid="input-joint-account-description"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setCreateDialogOpen(false)}
                      data-testid="button-cancel-create-joint-account"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateJointAccount}
                      disabled={createJointAccountMutation.isPending}
                      data-testid="button-confirm-create-joint-account"
                    >
                      {createJointAccountMutation.isPending ? "Creating..." : "Create Account"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-join-joint-account">
                  <Users className="h-4 w-4 mr-2" />
                  Join Joint Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join Joint Account</DialogTitle>
                  <DialogDescription>
                    Enter the join code provided by your partner to access their joint account.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="join-code">Join Code</Label>
                    <Input
                      id="join-code"
                      placeholder="Enter 8-character join code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      maxLength={8}
                      style={{ textTransform: 'uppercase' }}
                      data-testid="input-join-code"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setJoinDialogOpen(false)}
                      data-testid="button-cancel-join-joint-account"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleJoinJointAccount}
                      disabled={joinJointAccountMutation.isPending}
                      data-testid="button-confirm-join-joint-account"
                    >
                      {joinJointAccountMutation.isPending ? "Joining..." : "Join Account"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {hasJointAccount && jointAccount ? (
        <Card data-testid="card-joint-account-info">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{jointAccount.name}</span>
              <Badge variant={getRoleBadgeVariant(userRole || 'secondary')} data-testid="badge-user-role">
                {getRoleDisplay(userRole || 'secondary')}
              </Badge>
            </CardTitle>
            {jointAccount.description && (
              <CardDescription>{jointAccount.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-sm font-medium">Join Code</Label>
                <p className="text-xs text-muted-foreground">Share this code with your partner</p>
              </div>
              <div className="flex items-center space-x-2">
                <code className="px-3 py-1 bg-background rounded text-lg font-mono" data-testid="text-join-code">
                  {jointAccount.joinCode}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyJoinCode}
                  data-testid="button-copy-join-code"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Your investment data is automatically aggregated across both individual and joint accounts</span>
            </div>

            <div className="pt-2">
              <Label className="text-sm font-medium">Account Status</Label>
              <div className="mt-1 flex items-center space-x-2">
                <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                  Active
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Created {new Date(jointAccount.createdAt || '').toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="card-no-joint-account">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-pink-500" />
              <span>Create a Joint Account</span>
            </CardTitle>
            <CardDescription>
              Manage your investments together with your partner in a shared account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium">Benefits of Joint Accounts:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>Shared investment portfolio management</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>Combined staking rewards tracking</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span>Joint participation in challenges</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    <span>Unified dashboard and analytics</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium">How it works:</h4>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">1</span>
                    <span>Create a joint account with a custom name</span>
                  </li>
                  <li className="flex space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">2</span>
                    <span>Share the secure join code with your partner</span>
                  </li>
                  <li className="flex space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">3</span>
                    <span>Both accounts are automatically linked</span>
                  </li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}