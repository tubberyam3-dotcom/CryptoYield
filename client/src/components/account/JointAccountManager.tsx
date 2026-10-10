import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Users, Plus, Copy, Check, Heart, Shield, Link as LinkIcon, RefreshCw } from "lucide-react";

export function JointAccountManager() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [newJointAccount, setNewJointAccount] = useState({
    name: "",
    description: ""
  });

  const { isAuthenticated, hasJointAccount, jointAccount, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    data: joinRequests,
    isLoading: joinRequestsLoading,
    isError: joinRequestsError,
    refetch: refetchJoinRequests,
  } = useQuery<Array<{
    id: string | number;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
    reviewedAt: string | null;
    jointAccountName: string;
  }>>({
    queryKey: ["/api/joint-accounts/join-requests/my"],
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });
  const latestJoinRequest = joinRequests
    ? [...joinRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : undefined;
  const pendingJoinRequest = joinRequests?.find((request) => request.status === "pending");
  const handledApprovalId = useRef<string | null>(null);
  const approvedJoinRequest = !hasJointAccount && latestJoinRequest?.status === "approved" &&
    handledApprovalId.current !== String(latestJoinRequest.id) ? latestJoinRequest : undefined;
  const restrictNewRequests = joinRequestsLoading || joinRequestsError || !!pendingJoinRequest || !!approvedJoinRequest;

  useEffect(() => {
    if (latestJoinRequest?.status === "approved" && handledApprovalId.current !== String(latestJoinRequest.id)) {
      handledApprovalId.current = String(latestJoinRequest.id);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  }, [latestJoinRequest?.id, latestJoinRequest?.status, queryClient]);

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
    onSuccess: (result) => {
      toast({
        title: "Join Request Submitted",
        description: "An administrator will review your request. You’ll get access only after it is approved.",
      });
      if (result?.request) {
        queryClient.setQueryData(
          ["/api/joint-accounts/join-requests/my"],
          (current: Array<{ id: string | number; status: string; createdAt: string; reviewedAt: string | null; jointAccountName: string }> | undefined) =>
            [result.request, ...(current ?? []).filter((request) => String(request.id) !== String(result.request.id))]
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/joint-accounts/join-requests/my"] });
      if (result?.status !== "pending") {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
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

  const handleCopyInviteLink = async () => {
    if (jointAccount?.joinCode) {
      const link = `https://app.refluxcapital.com/join/${jointAccount.joinCode}`;
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast({
        title: "Invite Link Copied!",
        description: "Share this link with your partner so they can join with one click.",
      });
      setTimeout(() => setCopiedLink(false), 2000);
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
    <div className="w-full min-w-0 space-y-6">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center space-x-3">
          <Heart className="h-6 w-6 shrink-0 text-pink-500" />
          <h3 className="text-xl font-semibold sm:text-2xl">Joint Account</h3>
        </div>
        {!hasJointAccount && !restrictNewRequests && (
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:space-x-2 sm:gap-0">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-auto min-h-9 min-w-0 whitespace-normal px-2 text-xs sm:text-sm" data-testid="button-create-joint-account">
                  <Plus className="mr-1 h-4 w-4 shrink-0 sm:mr-2" />
                  <span className="min-w-0 text-left">Create Joint Account</span>
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
                  <div className="flex flex-wrap justify-end gap-2">
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
                <Button variant="outline" size="sm" className="h-auto min-h-9 min-w-0 whitespace-normal px-2 text-xs sm:text-sm" data-testid="button-join-joint-account">
                  <Users className="mr-1 h-4 w-4 shrink-0 sm:mr-2" />
                  <span className="min-w-0 text-left">Join Joint Account</span>
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
                  <div className="flex flex-wrap justify-end gap-2">
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

      {!hasJointAccount && pendingJoinRequest && (
        <Card className="border-amber-300 bg-amber-50 shadow-none" role="status">
          <CardContent className="flex min-w-0 flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 [overflow-wrap:anywhere]">
              <p className="font-semibold text-amber-950">Join request pending</p>
              <p className="text-sm text-amber-900/80">
                <span className="[overflow-wrap:anywhere]">{pendingJoinRequest.jointAccountName}</span> · Submitted {new Date(pendingJoinRequest.createdAt).toLocaleDateString()}.
                An administrator must approve it before you have access.
              </p>
            </div>
            <Badge variant="outline" className="w-fit border-amber-400 bg-amber-100 text-amber-900">Pending</Badge>
          </CardContent>
        </Card>
      )}

      {!hasJointAccount && joinRequestsLoading && (
        <div className="h-20 animate-pulse rounded-md border bg-muted/40" role="status" aria-label="Checking join request status" />
      )}

      {!hasJointAccount && joinRequestsError && (
        <Card className="border-destructive/30 bg-destructive/5 shadow-none" role="alert">
          <CardContent className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-sm [overflow-wrap:anywhere] text-destructive">We couldn’t check your join-request status. Try again before creating or joining another account.</p>
            <Button variant="outline" size="sm" onClick={() => refetchJoinRequests()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!hasJointAccount && !pendingJoinRequest && latestJoinRequest?.status === "rejected" && (
        <Card className="border-rose-300 bg-rose-50 shadow-none" role="status">
          <CardContent className="flex min-w-0 flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-rose-950">Previous join request was declined</p>
              <p className="text-sm text-rose-900/80">You can try another join code or ask the account owner for help.</p>
            </div>
            <Badge variant="outline" className="w-fit border-rose-300 bg-rose-100 text-rose-900">Rejected</Badge>
          </CardContent>
        </Card>
      )}

      {approvedJoinRequest && (
        <Card className="border-emerald-300 bg-emerald-50 shadow-none" role="status">
          <CardContent className="flex min-w-0 flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-emerald-950">Request approved</p>
              <p className="text-sm text-emerald-900/80">
                Access is being refreshed. Your account remains personal until membership is confirmed.
              </p>
            </div>
            <Badge variant="outline" className="w-fit border-emerald-300 bg-emerald-100 text-emerald-900">Approved</Badge>
          </CardContent>
        </Card>
      )}

      {hasJointAccount && jointAccount ? (
        <Card className="w-full min-w-0" data-testid="card-joint-account-info">
          <CardHeader>
            <CardTitle className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0 [overflow-wrap:anywhere]">{jointAccount.name}</span>
              <Badge variant={getRoleBadgeVariant(userRole || 'secondary')} data-testid="badge-user-role">
                {getRoleDisplay(userRole || 'secondary')}
              </Badge>
            </CardTitle>
            {jointAccount.description && (
              <CardDescription className="min-w-0 [overflow-wrap:anywhere]">{jointAccount.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex min-w-0 flex-col gap-3 rounded-lg bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Label className="text-sm font-medium">Join Code</Label>
                  <p className="text-xs text-muted-foreground">Manual code entry</p>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <code className="min-w-0 break-all rounded bg-background px-3 py-1 font-mono text-lg" data-testid="text-join-code">
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
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleCopyInviteLink}
                data-testid="button-copy-invite-link"
              >
                {copiedLink ? <Check className="h-4 w-4 text-green-600" /> : <LinkIcon className="h-4 w-4" />}
                {copiedLink ? "Link Copied!" : "Copy Invite Link"}
              </Button>
            </div>

            <div className="flex min-w-0 items-start gap-2 text-sm text-muted-foreground">
              <Shield className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 [overflow-wrap:anywhere]">Your investment data is automatically aggregated across both individual and joint accounts</span>
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
        <Card className="w-full min-w-0" data-testid="card-no-joint-account">
          <CardHeader>
            <CardTitle className="flex min-w-0 items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              <span className="min-w-0 [overflow-wrap:anywhere]">Create a Joint Account</span>
            </CardTitle>
            <CardDescription className="min-w-0 [overflow-wrap:anywhere]">
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