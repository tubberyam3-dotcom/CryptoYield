import { useState } from "react";
import { verificationDocumentLink, verificationDocumentExtension } from "@/lib/verificationDocuments";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { User, JointAccount } from "@shared/schema";
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Shield, 
  Eye,
  Search,
  Settings,
  Filter,
  MoreHorizontal,
  UserPlus,
  Download,
  Users,
  CreditCard,
  Send,
  Key,
  UserX,
  FolderPlus,
  Check,
  X,
  Loader2,
  Trash2,
  DollarSign,
  Plus,
  Minus,
  AlertTriangle,
  Edit
} from "lucide-react";

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  pendingKyc: number;
  approvedKyc: number;
  adminUsers: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: string;
  status: string;
  createdAt: string;
}

type UserDetails = User;

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<string>("");
  const [showSearch, setShowSearch] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showSendEmail, setShowSendEmail] = useState<string | null>(null);
  const [showTransactions, setShowTransactions] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showBalanceAdjust, setShowBalanceAdjust] = useState<string | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceType, setBalanceType] = useState<"add" | "withdraw">("add");
  const [balanceReason, setBalanceReason] = useState("");
  const [balanceDate, setBalanceDate] = useState("");
  const [balanceSendNotification, setBalanceSendNotification] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [showEditJointHolder, setShowEditJointHolder] = useState<string | null>(null);
  const [jointHolderName, setJointHolderName] = useState("");
  const [jointHolderEmail, setJointHolderEmail] = useState("");
  const [jointRelationshipType, setJointRelationshipType] = useState("");
  const [showConvertToJoint, setShowConvertToJoint] = useState<string | null>(null);
  const [convertJointName, setConvertJointName] = useState("");
  const [convertPartnerName, setConvertPartnerName] = useState("");
  const [convertPartnerEmail, setConvertPartnerEmail] = useState("");
  const [convertRelationshipType, setConvertRelationshipType] = useState("");
  // Close joint account confirmation
  const [showCloseJoint, setShowCloseJoint] = useState<{ jointAccountId: string; name: string; viewingUserId: string } | null>(null);
  // Link existing user as joint partner (from primary's page — enter partner email)
  const [showLinkPartner, setShowLinkPartner] = useState<{ primaryUserId: string; jointAccountId: string } | null>(null);
  const [linkPartnerEmail, setLinkPartnerEmail] = useState("");
  // Link this user to an existing joint account (from personal user's page — enter join code)
  const [showLinkToExisting, setShowLinkToExisting] = useState<string | null>(null); // stores the personal userId
  const [linkToExistingJoinCode, setLinkToExistingJoinCode] = useState("");
  // Edit user profile
  const [showEditProfile, setShowEditProfile] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  // Edit transaction date
  const [editingTxDate, setEditingTxDate] = useState<{ type: string; id: string } | null>(null);
  const [editTxDateValue, setEditTxDateValue] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [newUserKyc, setNewUserKyc] = useState("pending");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: userStats } = useQuery<UserStats>({
    queryKey: ["/api/admin/users/stats"],
  });

  const { data: userDetails, isLoading: isLoadingDetails } = useQuery<UserDetails>({
    queryKey: [`/api/admin/users/${viewingUserId}`],
    enabled: !!viewingUserId,
  });

  const { data: userTransactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: [`/api/admin/users/${showTransactions}/transactions`],
    enabled: !!showTransactions,
  });

  const { data: detailTransactions, isLoading: isLoadingDetailTx } = useQuery<Transaction[]>({
    queryKey: [`/api/admin/users/${viewingUserId}/transactions`],
    enabled: !!viewingUserId,
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ userIds, action }: { userIds: string[]; action: string }) => {
      const response = await apiRequest("POST", "/api/admin/users/bulk", { userIds, action });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Action Completed",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      setSelectedUsers([]);
      setBulkAction("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/admin/users", userData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Created",
        description: "New user has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      setShowAddUser(false);
      resetNewUserForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create User",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ userId, subject, message }: { userId: string; subject: string; message: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/email`, { subject, message });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "Email has been sent successfully!",
      });
      setShowSendEmail(null);
      setEmailSubject("");
      setEmailMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/kyc`, { kycStatus: 'rejected' });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Suspended",
        description: "User has been suspended successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Suspend User",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const activateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/kyc`, { kycStatus: 'approved' });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Activated",
        description: "User has been activated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Activate User",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const withdrawalSuspensionMutation = useMutation({
    mutationFn: async ({ userId, suspended }: { userId: string; suspended: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/withdrawal-suspension`, { suspended });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: data.user.withdrawalSuspended ? "Withdrawals Suspended" : "Withdrawals Restored", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      if (viewingUserId) queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${viewingUserId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to Update Withdrawals", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Deleted",
        description: "User has been deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
      setShowDeleteConfirm(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete User",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const adjustBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount, type, reason, date, sendNotification }: { userId: string; amount: string; type: string; reason: string; date?: string; sendNotification?: boolean }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/balance`, { amount, type, reason, date, sendNotification });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Balance Adjusted",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowBalanceAdjust(null);
      setBalanceAmount("");
      setBalanceType("add");
      setBalanceReason("");
      setBalanceDate("");
      setBalanceSendNotification(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Adjust Balance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateJointHolderMutation = useMutation({
    mutationFn: async ({ userId, name, partnerEmail, relationshipType }: { userId: string; name: string; partnerEmail: string; relationshipType: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/joint-account`, { name, partnerEmail, relationshipType });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Joint Account Updated", description: "Joint holder details have been saved." });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${showEditJointHolder}`] });
      setShowEditJointHolder(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to Update", description: error.message, variant: "destructive" });
    },
  });

  const convertToJointMutation = useMutation({
    mutationFn: async ({ userId, accountName, partnerName, partnerEmail, relationshipType }: { userId: string; accountName: string; partnerName: string; partnerEmail: string; relationshipType: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/convert-to-joint`, { accountName, partnerName, partnerEmail, relationshipType });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Account Converted", description: "Account has been switched to Joint." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${showConvertToJoint}`] });
      setShowConvertToJoint(null);
      setConvertJointName("");
      setConvertPartnerName("");
      setConvertPartnerEmail("");
      setConvertRelationshipType("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to Convert", description: error.message, variant: "destructive" });
    },
  });

  const linkPartnerMutation = useMutation({
    mutationFn: async ({ partnerUserId, jointAccountId }: { partnerUserId: string; jointAccountId: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${partnerUserId}/link-to-joint`, { jointAccountId });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Partner Linked", description: "User has been added to the joint account as a partner." });
      if (showLinkPartner) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${showLinkPartner.primaryUserId}`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowLinkPartner(null);
      setLinkPartnerEmail("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to Link Partner", description: error.message, variant: "destructive" });
    },
  });

  const linkToExistingMutation = useMutation({
    mutationFn: async ({ partnerUserId, joinCode }: { partnerUserId: string; joinCode: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${partnerUserId}/link-to-joint`, { joinCode });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "User Linked", description: "User has been added to the joint account as a partner." });
      if (showLinkToExisting) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${showLinkToExisting}`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowLinkToExisting(null);
      setLinkToExistingJoinCode("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to Link", description: error.message, variant: "destructive" });
    },
  });

  const closeJointAccountMutation = useMutation({
    mutationFn: async (jointAccountId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/joint-accounts/${jointAccountId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Joint Account Closed", description: "All members have been reverted to personal accounts." });
      if (showCloseJoint) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${showCloseJoint.viewingUserId}`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowCloseJoint(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to Close", description: error.message, variant: "destructive" });
    },
  });

  const editProfileMutation = useMutation({
    mutationFn: async ({ userId, firstName, lastName, email }: { userId: string; firstName: string; lastName: string; email: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/profile`, { firstName, lastName, email });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Profile Updated", description: "User's name and email have been saved." });
      if (showEditProfile) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${showEditProfile}`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowEditProfile(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to Update", description: error.message, variant: "destructive" });
    },
  });

  const updateTxDateMutation = useMutation({
    mutationFn: async ({ type, id, date }: { type: string; id: string; date: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/transactions/${type}/${id}/date`, { date });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Date Updated", description: "Transaction date has been changed." });
      if (viewingUserId) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${viewingUserId}/transactions`] });
      }
      setEditingTxDate(null);
      setEditTxDateValue("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to Update Date", description: error.message, variant: "destructive" });
    },
  });

  const resetNewUserForm = () => {
    setNewUserEmail("");
    setNewUserFirstName("");
    setNewUserLastName("");
    setNewUserPassword("");
    setNewUserRole("user");
    setNewUserKyc("pending");
  };

  const filteredUsers = users?.filter((user) => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getRoleColor = (role: string) => {
    return role === 'admin' 
      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  };

  const getInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    return user.email?.substring(0, 2).toUpperCase() || 'U';
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-cyan-500',
    ];
    return colors[index % colors.length];
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && filteredUsers) {
      setSelectedUsers(filteredUsers.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleBulkApply = () => {
    if (!bulkAction || selectedUsers.length === 0) return;
    bulkUpdateMutation.mutate({ userIds: selectedUsers, action: bulkAction });
  };

  const handleExport = () => {
    window.open('/api/admin/users/export', '_blank');
  };

  const handleCreateUser = () => {
    if (!newUserEmail) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate({
      email: newUserEmail,
      firstName: newUserFirstName || undefined,
      lastName: newUserLastName || undefined,
      password: newUserPassword || undefined,
      role: newUserRole,
      kycStatus: newUserKyc,
    });
  };

  const handleSendEmail = () => {
    if (!showSendEmail || !emailSubject || !emailMessage) {
      toast({
        title: "Error",
        description: "Subject and message are required",
        variant: "destructive",
      });
      return;
    }
    sendEmailMutation.mutate({ userId: showSendEmail, subject: emailSubject, message: emailMessage });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="user-management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Active Users</h1>
          <p className="text-muted-foreground">
            Total <span className="font-medium text-foreground">{userStats?.totalUsers || filteredUsers?.length || 0}</span> User account.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" data-testid="button-manage-groups">
            <Users className="w-4 h-4" />
            Manage Groups
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport} data-testid="button-export">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button 
            className="gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white" 
            onClick={() => setShowAddUser(true)}
            data-testid="button-add-user"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger className="w-40" data-testid="select-bulk-action">
              <SelectValue placeholder="Bulk Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="approve_kyc">Approve KYC</SelectItem>
              <SelectItem value="reject_kyc">Reject KYC</SelectItem>
              <SelectItem value="suspend">Suspend</SelectItem>
              <SelectItem value="activate">Activate</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="secondary" 
            className="bg-[#e4fe7b] text-black hover:bg-[#d4ee6b]"
            onClick={handleBulkApply}
            disabled={!bulkAction || selectedUsers.length === 0 || bulkUpdateMutation.isPending}
            data-testid="button-apply-bulk"
          >
            {bulkUpdateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
          </Button>
          {selectedUsers.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedUsers.length} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showSearch ? (
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
              autoFocus
              onBlur={() => !searchTerm && setShowSearch(false)}
              data-testid="input-search-users"
            />
          ) : (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowSearch(true)}
              data-testid="button-search"
            >
              <Search className="w-5 h-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" data-testid="button-filter">
            <Filter className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" data-testid="button-settings">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="p-4 text-left w-12">
                <Checkbox
                  checked={selectedUsers.length === (filteredUsers?.length || 0) && (filteredUsers?.length || 0) > 0}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">User</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Account Balance</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Verified</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Last Login</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="p-4 text-left w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers?.map((user, index) => (
              <tr key={user.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                <td className="p-4">
                  <Checkbox
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                    data-testid={`checkbox-user-${user.id}`}
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${getAvatarColor(index)}`}>
                      {getInitials(user)}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : 'Unknown User'
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="font-medium">
                    {parseFloat(user.balance || '0').toFixed(2)} USD
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${user.email ? 'bg-green-500' : 'bg-gray-300'}`}>
                        {user.email && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-sm text-muted-foreground">Email</span>
                    </div>
                    {user.kycStatus === 'approved' && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center bg-green-500">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className="text-sm text-muted-foreground">KYC</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-sm text-muted-foreground">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { 
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : 'Never'}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`text-sm font-medium ${user.kycStatus === 'approved' ? 'text-green-500' : user.kycStatus === 'rejected' ? 'text-red-500' : 'text-yellow-500'}`}>
                    {user.kycStatus === 'approved' ? 'Active' : user.kycStatus === 'rejected' ? 'Suspended' : 'Pending'}
                  </span>
                </td>
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-actions-${user.id}`}>
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setViewingUserId(user.id)} data-testid={`menu-view-details-${user.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowTransactions(user.id)} data-testid={`menu-transaction-${user.id}`}>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Transaction
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowSendEmail(user.id)} data-testid={`menu-send-email-${user.id}`}>
                        <Send className="w-4 h-4 mr-2" />
                        Send an Email
                      </DropdownMenuItem>
                      <DropdownMenuItem data-testid={`menu-reset-password-${user.id}`}>
                        <Key className="w-4 h-4 mr-2" />
                        Reset Password
                      </DropdownMenuItem>
                      {user.kycStatus === 'approved' ? (
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => suspendUserMutation.mutate(user.id)}
                          data-testid={`menu-suspend-${user.id}`}
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Suspend User
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          className="text-green-600"
                          onClick={() => activateUserMutation.mutate(user.id)}
                          data-testid={`menu-activate-${user.id}`}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Activate User
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className={(user as any).withdrawalSuspended ? "text-green-600" : "text-amber-600"}
                        onClick={() => withdrawalSuspensionMutation.mutate({
                          userId: user.id,
                          suspended: !(user as any).withdrawalSuspended,
                        })}
                        data-testid={`menu-withdrawal-suspension-${user.id}`}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        {(user as any).withdrawalSuspended ? "Restore Withdrawals" : "Suspend Withdrawals"}
                      </DropdownMenuItem>
                      <DropdownMenuItem data-testid={`menu-assign-group-${user.id}`}>
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Assign to Group
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setShowBalanceAdjust(user.id)}
                        data-testid={`menu-adjust-balance-${user.id}`}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Adjust Balance
                      </DropdownMenuItem>
                      {user.role !== 'admin' && (
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => setShowDeleteConfirm(user.id)}
                          data-testid={`menu-delete-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!filteredUsers || filteredUsers.length === 0) && (
          <div className="p-12 text-center text-muted-foreground">
            No users found
          </div>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md" data-testid="dialog-add-user">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add New User
            </DialogTitle>
            <DialogDescription>
              Create a new user account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                data-testid="input-new-user-email"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={newUserFirstName}
                  onChange={(e) => setNewUserFirstName(e.target.value)}
                  data-testid="input-new-user-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={newUserLastName}
                  onChange={(e) => setNewUserLastName(e.target.value)}
                  data-testid="input-new-user-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                data-testid="input-new-user-password"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newUserRole} onValueChange={setNewUserRole}>
                  <SelectTrigger data-testid="select-new-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>KYC Status</Label>
                <Select value={newUserKyc} onValueChange={setNewUserKyc}>
                  <SelectTrigger data-testid="select-new-user-kyc">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
              className="bg-[#22c55e] hover:bg-[#16a34a]"
              data-testid="button-create-user"
            >
              {createUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={!!showSendEmail} onOpenChange={(open) => !open && setShowSendEmail(null)}>
        <DialogContent className="max-w-md" data-testid="dialog-send-email">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Send Email
            </DialogTitle>
            <DialogDescription>
              Send an email to this user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Enter subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                data-testid="input-email-subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Enter your message..."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={6}
                data-testid="input-email-message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendEmail(null)}>Cancel</Button>
            <Button 
              onClick={handleSendEmail}
              disabled={sendEmailMutation.isPending}
              data-testid="button-send-email"
            >
              {sendEmailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transactions Dialog */}
      <Dialog open={!!showTransactions} onOpenChange={(open) => !open && setShowTransactions(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-transactions">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              User Transactions
            </DialogTitle>
            <DialogDescription>
              View all transactions for this user
            </DialogDescription>
          </DialogHeader>
          {isLoadingTransactions ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading transactions...</p>
            </div>
          ) : userTransactions && userTransactions.length > 0 ? (
            <div className="space-y-3">
              {userTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium capitalize">{tx.type.replace('_', ' ')}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${parseFloat(tx.amount || '0').toFixed(2)}</div>
                    <Badge className={tx.status === 'approved' || tx.status === 'completed' ? 'bg-green-100 text-green-800' : tx.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No transactions found
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={!!viewingUserId} onOpenChange={(open) => !open && setViewingUserId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-view-user">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              User Details
            </DialogTitle>
            <DialogDescription>
              Complete profile information for this user
            </DialogDescription>
          </DialogHeader>
          {isLoadingDetails ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading user details...</p>
            </div>
          ) : userDetails ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white text-2xl font-medium">
                  {userDetails.firstName?.charAt(0) || userDetails.email?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">
                    {userDetails.firstName && userDetails.lastName 
                      ? `${userDetails.firstName} ${userDetails.lastName}`
                      : 'Unknown User'
                    }
                  </h3>
                  <div className="flex gap-2 mt-1">
                    <Badge className={getRoleColor(userDetails.role || 'user')}>
                      {userDetails.role || 'user'}
                    </Badge>
                    <Badge className={getKycStatusColor(userDetails.kycStatus || 'pending')}>
                      KYC: {userDetails.kycStatus || 'pending'}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditFirstName(userDetails.firstName || '');
                    setEditLastName(userDetails.lastName || '');
                    setEditEmail(userDetails.email || '');
                    setShowEditProfile(userDetails.id);
                  }}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Contact Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{userDetails.email || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium">{userDetails.phoneNumber || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Address
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Street</span>
                      <span className="font-medium">{userDetails.address || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">City</span>
                      <span className="font-medium">{userDetails.city || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">State</span>
                      <span className="font-medium">{userDetails.state || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ZIP Code</span>
                      <span className="font-medium">{userDetails.zipCode || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Country</span>
                      <span className="font-medium">{userDetails.country || 'Not provided'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Verification Document
                </h4>
                {userDetails.verificationDocumentUrl ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Document Type</span>
                      <span className="font-medium capitalize">
                        {userDetails.verificationDocumentType?.replace(/_/g, ' ') || 'Unknown'}
                      </span>
                    </div>
                    {userDetails.verificationDocumentNumber && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Document Number</span>
                        <span className="font-medium">{userDetails.verificationDocumentNumber}</span>
                      </div>
                    )}
                    <div className="border rounded-lg p-4 bg-muted/50">
                      {verificationDocumentExtension(userDetails.verificationDocumentUrl) === "pdf" ? (
                        <iframe src={userDetails.verificationDocumentUrl} title="Verification document PDF"
                          className="w-full h-80 rounded-lg" />
                      ) : <img
                        src={userDetails.verificationDocumentUrl} 
                        alt="Verification Document"
                        className="max-w-full h-auto rounded-lg"
                      />}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(verificationDocumentLink(userDetails.verificationDocumentUrl!), '_blank', 'noopener,noreferrer')}
                        data-testid="button-view-document"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = verificationDocumentLink(userDetails.verificationDocumentUrl!);
                          link.download = `verification-document.${verificationDocumentExtension(userDetails.verificationDocumentUrl!)}`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        data-testid="button-download-document"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(userDetails.verificationDocumentType || userDetails.verificationDocumentNumber) ? (
                      <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                        {userDetails.verificationDocumentType && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Document Type</span>
                            <span className="font-medium capitalize">
                              {userDetails.verificationDocumentType?.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}
                        {userDetails.verificationDocumentNumber && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Document Number</span>
                            <span className="font-medium">{userDetails.verificationDocumentNumber}</span>
                          </div>
                        )}
                        <p className="text-muted-foreground italic">No document image uploaded</p>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                        No verification document provided
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Account Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Type</span>
                    <span className="font-medium capitalize">{userDetails.accountType || 'personal'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="font-medium">${parseFloat(userDetails.balance || '0').toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">XP Balance</span>
                    <span className="font-medium">{userDetails.xpBalance || 0} XP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Withdrawals</span>
                    <span className={(userDetails as any).withdrawalSuspended ? "font-medium text-red-500" : "font-medium text-green-500"}>
                      {(userDetails as any).withdrawalSuspended ? "Suspended" : "Enabled"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">
                      {userDetails.createdAt ? new Date(userDetails.createdAt).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                  {userDetails.referralCode && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Referral Code Used</span>
                      <span className="font-medium">{userDetails.referralCode}</span>
                    </div>
                  )}
                </div>
                {userDetails.accountType === 'business' && (
                  <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Business Name</span>
                      <span className="font-medium">{userDetails.businessName || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Business Type</span>
                      <span className="font-medium">{userDetails.businessType || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax ID</span>
                      <span className="font-medium">{userDetails.taxId || 'Not provided'}</span>
                    </div>
                  </div>
                )}

                {(userDetails as any).accountType !== 'joint' && !(userDetails as any).jointAccountInfo && (
                  <div className="flex flex-col gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                      onClick={() => {
                        setShowConvertToJoint(userDetails.id);
                        setConvertJointName(`${userDetails.firstName || ''} ${userDetails.lastName || ''} & Partner`.trim());
                      }}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Create New Joint Account
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                      onClick={() => {
                        setShowLinkToExisting(userDetails.id);
                        setLinkToExistingJoinCode("");
                      }}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add as Joint Partner
                    </Button>
                  </div>
                )}
              </div>

              {(userDetails as any).jointAccountInfo && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        Joint Account Details
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const ja = (userDetails as any).jointAccountInfo?.jointAccount;
                          setJointHolderName(ja?.name || '');
                          setJointHolderEmail(ja?.partnerEmail || '');
                          setJointRelationshipType(ja?.relationshipType || '');
                          setShowEditJointHolder(userDetails.id);
                        }}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Name</span>
                        <span className="font-medium">{(userDetails as any).jointAccountInfo?.jointAccount?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Role</span>
                        <span className="font-medium capitalize">{(userDetails as any).jointAccountInfo?.role || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Partner Email</span>
                        <span className="font-medium">{(userDetails as any).jointAccountInfo?.jointAccount?.partnerEmail || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Relationship</span>
                        <span className="font-medium capitalize">{(userDetails as any).jointAccountInfo?.jointAccount?.relationshipType?.replace('_', ' ') || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Join Code</span>
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400 tracking-wider">
                          {(userDetails as any).jointAccountInfo?.jointAccount?.joinCode || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Members</span>
                        <span className="font-medium">{(userDetails as any).jointAccountInfo?.members?.length || 1} holder(s)</span>
                      </div>
                    </div>
                    {/* Show "Add Partner" if fewer than 2 members */}
                    {((userDetails as any).jointAccountInfo?.members?.length || 1) < 2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                        onClick={() => {
                          const jaInfo = (userDetails as any).jointAccountInfo;
                          setShowLinkPartner({ primaryUserId: userDetails.id, jointAccountId: jaInfo?.jointAccount?.id });
                          setLinkPartnerEmail("");
                        }}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Partner User
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                      onClick={() => {
                        const jaInfo = (userDetails as any).jointAccountInfo;
                        setShowCloseJoint({
                          jointAccountId: jaInfo?.jointAccount?.id,
                          name: jaInfo?.jointAccount?.name || 'this joint account',
                          viewingUserId: userDetails.id,
                        });
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Close Joint Account
                    </Button>
                  </div>
                </>
              )}

              <Separator />

              {/* Transaction History */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Transaction History
                </h4>
                {isLoadingDetailTx ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading transactions...
                  </div>
                ) : detailTransactions && detailTransactions.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {detailTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium capitalize">{tx.type.replace(/_/g, ' ')}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            {editingTxDate?.id === tx.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="date"
                                  className="h-6 text-xs px-1 w-32"
                                  value={editTxDateValue}
                                  onChange={(e) => setEditTxDateValue(e.target.value)}
                                />
                                <Button
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  disabled={!editTxDateValue || updateTxDateMutation.isPending}
                                  onClick={() => editingTxDate && updateTxDateMutation.mutate({
                                    type: editingTxDate.type,
                                    id: editingTxDate.id,
                                    date: editTxDateValue,
                                  })}
                                >
                                  {updateTxDateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1 text-xs"
                                  onClick={() => { setEditingTxDate(null); setEditTxDateValue(""); }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                {new Date(tx.createdAt).toLocaleDateString()}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 w-4 p-0 opacity-50 hover:opacity-100"
                                  title="Edit date"
                                  onClick={() => {
                                    setEditingTxDate({ type: tx.type, id: tx.id });
                                    setEditTxDateValue(new Date(tx.createdAt).toISOString().split('T')[0]);
                                  }}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-3 shrink-0">
                          <div className="font-medium">${parseFloat(tx.amount || '0').toFixed(2)}</div>
                          <Badge className={`text-xs ${tx.status === 'approved' || tx.status === 'completed' ? 'bg-green-100 text-green-800' : tx.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg text-center">
                    No transactions found
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                User ID: {userDetails.id}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Unable to load user details
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-md" data-testid="dialog-delete-user">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone and will remove all associated data including:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>All portfolio investments</li>
              <li>Bond holdings</li>
              <li>Stock purchases</li>
              <li>Transaction history</li>
              <li>XP and bonuses</li>
            </ul>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(null)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => showDeleteConfirm && deleteUserMutation.mutate(showDeleteConfirm)}
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteUserMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Joint Holder Dialog */}
      <Dialog open={!!showEditJointHolder} onOpenChange={(open) => !open && setShowEditJointHolder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Edit Joint Account Details
            </DialogTitle>
            <DialogDescription>Update the joint account name and partner information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Account Name</Label>
              <Input
                value={jointHolderName}
                onChange={(e) => setJointHolderName(e.target.value)}
                placeholder="e.g. John & Jane's Account"
              />
            </div>
            <div>
              <Label>Partner Email</Label>
              <Input
                type="email"
                value={jointHolderEmail}
                onChange={(e) => setJointHolderEmail(e.target.value)}
                placeholder="partner@email.com"
              />
            </div>
            <div>
              <Label>Relationship Type</Label>
              <Select value={jointRelationshipType} onValueChange={setJointRelationshipType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="domestic_partners">Domestic Partners</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditJointHolder(null)}>Cancel</Button>
            <Button
              onClick={() => showEditJointHolder && updateJointHolderMutation.mutate({
                userId: showEditJointHolder,
                name: jointHolderName,
                partnerEmail: jointHolderEmail,
                relationshipType: jointRelationshipType,
              })}
              disabled={updateJointHolderMutation.isPending}
            >
              {updateJointHolderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Joint Account Dialog */}
      <Dialog open={!!showConvertToJoint} onOpenChange={(open) => !open && setShowConvertToJoint(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Switch to Joint Account
            </DialogTitle>
            <DialogDescription>
              Convert this personal account to a joint account. The account holder will be the primary owner and a join code will be generated for the partner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Account Name</Label>
              <Input
                value={convertJointName}
                onChange={(e) => setConvertJointName(e.target.value)}
                placeholder="e.g. John & Jane's Account"
              />
            </div>
            <div>
              <Label>Partner Name</Label>
              <Input
                value={convertPartnerName}
                onChange={(e) => setConvertPartnerName(e.target.value)}
                placeholder="Partner's full name"
              />
            </div>
            <div>
              <Label>Partner Email</Label>
              <Input
                type="email"
                value={convertPartnerEmail}
                onChange={(e) => setConvertPartnerEmail(e.target.value)}
                placeholder="partner@email.com"
              />
            </div>
            <div>
              <Label>Relationship Type</Label>
              <Select value={convertRelationshipType} onValueChange={setConvertRelationshipType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="domestic_partners">Domestic Partners</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConvertToJoint(null)}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => showConvertToJoint && convertToJointMutation.mutate({
                userId: showConvertToJoint,
                accountName: convertJointName,
                partnerName: convertPartnerName,
                partnerEmail: convertPartnerEmail,
                relationshipType: convertRelationshipType,
              })}
              disabled={convertToJointMutation.isPending}
            >
              {convertToJointMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Users className="w-4 h-4 mr-2" />}
              Convert to Joint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Partner User to Joint Account Dialog */}
      <Dialog open={!!showLinkPartner} onOpenChange={(open) => { if (!open) { setShowLinkPartner(null); setLinkPartnerEmail(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Add Partner to Joint Account
            </DialogTitle>
            <DialogDescription>
              Enter the email address of the existing user you want to add as the joint account partner. Their balance will be combined with the primary holder's balance on the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Partner's Email Address</Label>
              <Input
                type="email"
                value={linkPartnerEmail}
                onChange={(e) => setLinkPartnerEmail(e.target.value)}
                placeholder="partner@email.com"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowLinkPartner(null); setLinkPartnerEmail(""); }}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!linkPartnerEmail || linkPartnerMutation.isPending}
              onClick={() => {
                if (!showLinkPartner) return;
                // Find user by email from the loaded users list
                const partnerUser = (users as User[] | undefined)?.find(
                  (u) => u.email?.toLowerCase() === linkPartnerEmail.toLowerCase()
                );
                if (!partnerUser) {
                  toast({ title: "User Not Found", description: "No user found with that email address.", variant: "destructive" });
                  return;
                }
                linkPartnerMutation.mutate({ partnerUserId: partnerUser.id, jointAccountId: showLinkPartner.jointAccountId });
              }}
            >
              {linkPartnerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Link Partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Joint Account Confirmation Dialog */}
      <Dialog open={!!showCloseJoint} onOpenChange={(open) => { if (!open) setShowCloseJoint(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Close Joint Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to close <strong>{showCloseJoint?.name}</strong>? This will:
            </DialogDescription>
          </DialogHeader>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 px-1">
            <li>Remove the joint account partnership</li>
            <li>Revert all members back to personal accounts</li>
            <li>Existing investments will remain but will no longer be shared</li>
          </ul>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCloseJoint(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={closeJointAccountMutation.isPending}
              onClick={() => showCloseJoint && closeJointAccountMutation.mutate(showCloseJoint.jointAccountId)}
            >
              {closeJointAccountMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
              Close Joint Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add as Joint Partner Dialog (from personal user's page — enter join code) */}
      <Dialog open={!!showLinkToExisting} onOpenChange={(open) => { if (!open) { setShowLinkToExisting(null); setLinkToExistingJoinCode(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Add as Joint Partner
            </DialogTitle>
            <DialogDescription>
              Enter the join code from the primary account holder's joint account. This user will be linked as the partner — their balance will be combined on both users' dashboards.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Join Code</Label>
              <Input
                value={linkToExistingJoinCode}
                onChange={(e) => setLinkToExistingJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC12345"
                className="font-sans tracking-widest uppercase"
                maxLength={12}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Find this in the primary holder's Joint Account Details section.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowLinkToExisting(null); setLinkToExistingJoinCode(""); }}>Cancel</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!linkToExistingJoinCode.trim() || linkToExistingMutation.isPending}
              onClick={() => {
                if (!showLinkToExisting) return;
                linkToExistingMutation.mutate({ partnerUserId: showLinkToExisting, joinCode: linkToExistingJoinCode.trim() });
              }}
            >
              {linkToExistingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Link as Partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Profile Dialog */}
      <Dialog open={!!showEditProfile} onOpenChange={(open) => !open && setShowEditProfile(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit User Profile
            </DialogTitle>
            <DialogDescription>Update the user's name and email address.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name</Label>
                <Input
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-1">
                <Label>Last Name</Label>
                <Input
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditProfile(null)}>Cancel</Button>
            <Button
              disabled={editProfileMutation.isPending || (!editFirstName && !editLastName && !editEmail)}
              onClick={() => showEditProfile && editProfileMutation.mutate({
                userId: showEditProfile,
                firstName: editFirstName,
                lastName: editLastName,
                email: editEmail,
              })}
            >
              {editProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Adjustment Dialog */}
      <Dialog open={!!showBalanceAdjust} onOpenChange={() => {
        setShowBalanceAdjust(null);
        setBalanceAmount("");
        setBalanceType("add");
        setBalanceReason("");
        setBalanceDate("");
        setBalanceSendNotification(false);
      }}>
        <DialogContent className="max-w-md" data-testid="dialog-adjust-balance">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Adjust User Balance
            </DialogTitle>
            <DialogDescription>
              Add or withdraw funds from the user's account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={balanceType === "add" ? "default" : "outline"}
                className={balanceType === "add" ? "bg-green-600 hover:bg-green-700 flex-1" : "flex-1"}
                onClick={() => setBalanceType("add")}
                data-testid="button-balance-add"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Funds
              </Button>
              <Button
                variant={balanceType === "withdraw" ? "default" : "outline"}
                className={balanceType === "withdraw" ? "bg-red-600 hover:bg-red-700 flex-1" : "flex-1"}
                onClick={() => setBalanceType("withdraw")}
                data-testid="button-balance-withdraw"
              >
                <Minus className="w-4 h-4 mr-2" />
                Withdraw
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                data-testid="input-balance-amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                placeholder="e.g., Bonus, Correction, Refund..."
                value={balanceReason}
                onChange={(e) => setBalanceReason(e.target.value)}
                data-testid="input-balance-reason"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="balanceDate">Transaction Date (optional)</Label>
              <Input
                id="balanceDate"
                type="date"
                value={balanceDate}
                onChange={(e) => setBalanceDate(e.target.value)}
                data-testid="input-balance-date"
              />
              <p className="text-xs text-muted-foreground">Leave blank to use today's date</p>
            </div>
            {balanceType === "add" && (
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <Checkbox
                  id="sendNotification"
                  checked={balanceSendNotification}
                  onCheckedChange={(v) => setBalanceSendNotification(!!v)}
                  data-testid="checkbox-send-notification"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="sendNotification" className="text-sm font-medium cursor-pointer">
                    Send email notification to user
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    User will receive an email: "A deposit of ${balanceAmount || '0.00'} has been credited into your account."
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowBalanceAdjust(null);
                setBalanceAmount("");
                setBalanceType("add");
                setBalanceReason("");
                setBalanceDate("");
                setBalanceSendNotification(false);
              }}
              data-testid="button-cancel-balance"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => showBalanceAdjust && adjustBalanceMutation.mutate({
                userId: showBalanceAdjust,
                amount: balanceAmount,
                type: balanceType,
                reason: balanceReason,
                date: balanceDate || undefined,
                sendNotification: balanceSendNotification,
              })}
              disabled={adjustBalanceMutation.isPending || !balanceAmount || parseFloat(balanceAmount) <= 0}
              className={balanceType === "add" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              data-testid="button-confirm-balance"
            >
              {adjustBalanceMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : balanceType === "add" ? (
                <Plus className="w-4 h-4 mr-2" />
              ) : (
                <Minus className="w-4 h-4 mr-2" />
              )}
              {balanceType === "add" ? "Add Funds" : "Withdraw Funds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
