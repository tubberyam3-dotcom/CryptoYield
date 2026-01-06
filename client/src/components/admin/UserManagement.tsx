import { useState } from "react";
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
import type { User } from "@shared/schema";
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
  Loader2
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
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
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
                      <DropdownMenuItem data-testid={`menu-assign-group-${user.id}`}>
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Assign to Group
                      </DropdownMenuItem>
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
                <div>
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
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <img 
                        src={userDetails.verificationDocumentUrl} 
                        alt="Verification Document"
                        className="max-w-full h-auto rounded-lg"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(userDetails.verificationDocumentUrl!, '_blank')}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Full Document
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                    No verification document uploaded
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
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">
                      {userDetails.createdAt ? new Date(userDetails.createdAt).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
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
    </div>
  );
}
