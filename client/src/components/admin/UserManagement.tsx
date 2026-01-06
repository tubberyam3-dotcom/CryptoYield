import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  X
} from "lucide-react";

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  pendingKyc: number;
  approvedKyc: number;
  adminUsers: number;
}

type UserDetails = User;

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<string>("");
  const [showSearch, setShowSearch] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: userStats } = useQuery<UserStats>({
    queryKey: ["/api/admin/users/stats"],
  });

  const updateUserKycMutation = useMutation({
    mutationFn: async ({ userId, kycStatus }: { userId: string; kycStatus: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/kyc`, { kycStatus });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "KYC Status Updated",
        description: "User KYC status has been updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/stats"] });
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
        title: "Failed to Update KYC Status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: userDetails, isLoading: isLoadingDetails } = useQuery<UserDetails>({
    queryKey: [`/api/admin/users/${viewingUserId}`],
    enabled: !!viewingUserId,
  });

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
    toast({
      title: "Bulk Action",
      description: `Applied "${bulkAction}" to ${selectedUsers.length} users`,
    });
    setBulkAction("");
    setSelectedUsers([]);
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
          <Button variant="outline" className="gap-2" data-testid="button-export">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button className="gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white" data-testid="button-add-user">
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
              <SelectItem value="delete">Delete</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="secondary" 
            className="bg-[#e4fe7b] text-black hover:bg-[#d4ee6b]"
            onClick={handleBulkApply}
            disabled={!bulkAction || selectedUsers.length === 0}
            data-testid="button-apply-bulk"
          >
            Apply
          </Button>
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
                      <DropdownMenuItem data-testid={`menu-transaction-${user.id}`}>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Transaction
                      </DropdownMenuItem>
                      <DropdownMenuItem data-testid={`menu-send-email-${user.id}`}>
                        <Send className="w-4 h-4 mr-2" />
                        Send an Email
                      </DropdownMenuItem>
                      <DropdownMenuItem data-testid={`menu-reset-password-${user.id}`}>
                        <Key className="w-4 h-4 mr-2" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        data-testid={`menu-suspend-${user.id}`}
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        Suspend User
                      </DropdownMenuItem>
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
