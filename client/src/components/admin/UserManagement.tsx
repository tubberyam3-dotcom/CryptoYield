import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { User } from "@shared/schema";

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  pendingKyc: number;
  approvedKyc: number;
  adminUsers: number;
}

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterKyc, setFilterKyc] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: userStats } = useQuery<UserStats>({
    queryKey: ["/api/admin/users/stats"],
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Role Updated",
        description: "User role has been updated successfully!",
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
        title: "Failed to Update Role",
        description: error.message,
        variant: "destructive",
      });
    },
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

  const filteredUsers = users?.filter((user) => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesKyc = filterKyc === "all" || user.kycStatus === filterKyc;
    
    return matchesSearch && matchesRole && matchesKyc;
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Loading user data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="user-management">
      {/* User Statistics */}
      {userStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{userStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{userStats.activeUsers}</div>
              <p className="text-xs text-muted-foreground">Active Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{userStats.pendingKyc}</div>
              <p className="text-xs text-muted-foreground">Pending KYC</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{userStats.approvedKyc}</div>
              <p className="text-xs text-muted-foreground">Approved KYC</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{userStats.adminUsers}</div>
              <p className="text-xs text-muted-foreground">Admin Users</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <i className="fas fa-users text-primary"></i>
            User Management
          </CardTitle>
          <CardDescription>
            Manage user accounts, roles, and KYC status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Search users by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
              data-testid="input-search-users"
            />
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-role">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterKyc} onValueChange={setFilterKyc}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-kyc">
                <SelectValue placeholder="Filter by KYC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All KYC Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredUsers?.map((user) => (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-medium">
                        {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium truncate">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user.email || 'Unknown User'
                          }
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Role</span>
                      <Badge className={getRoleColor(user.role || 'user')}>
                        {user.role || 'user'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">KYC Status</span>
                      <Badge className={getKycStatusColor(user.kycStatus || 'pending')}>
                        {user.kycStatus || 'pending'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Joined</span>
                      <span className="text-sm">
                        {new Date(user.createdAt || '').toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => setSelectedUser(user)}
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          <i className="fas fa-edit mr-1"></i>
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent data-testid="dialog-edit-user">
                        <DialogHeader>
                          <DialogTitle>Edit User</DialogTitle>
                          <DialogDescription>
                            Update user role and KYC status
                          </DialogDescription>
                        </DialogHeader>
                        {selectedUser && (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">User Information</label>
                              <div className="bg-muted p-3 rounded-lg mt-1">
                                <p className="font-medium">
                                  {selectedUser.firstName && selectedUser.lastName 
                                    ? `${selectedUser.firstName} ${selectedUser.lastName}`
                                    : selectedUser.email || 'Unknown User'
                                  }
                                </p>
                                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                                <p className="text-xs text-muted-foreground">ID: {selectedUser.id}</p>
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-medium">Update Role</label>
                              <div className="flex gap-2 mt-2">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant={selectedUser.role === 'admin' ? 'default' : 'outline'}
                                      size="sm"
                                      disabled={updateUserRoleMutation.isPending}
                                    >
                                      Make Admin
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Update User Role</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to make this user an admin? This will give them full administrative privileges.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => updateUserRoleMutation.mutate({ 
                                          userId: selectedUser.id, 
                                          role: 'admin' 
                                        })}
                                      >
                                        Confirm
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant={selectedUser.role === 'user' ? 'default' : 'outline'}
                                      size="sm"
                                      disabled={updateUserRoleMutation.isPending}
                                    >
                                      Make User
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Update User Role</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to remove admin privileges from this user?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => updateUserRoleMutation.mutate({ 
                                          userId: selectedUser.id, 
                                          role: 'user' 
                                        })}
                                      >
                                        Confirm
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-medium">Update KYC Status</label>
                              <div className="flex gap-2 mt-2">
                                <Button 
                                  variant={selectedUser.kycStatus === 'approved' ? 'default' : 'outline'}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  disabled={updateUserKycMutation.isPending}
                                  onClick={() => updateUserKycMutation.mutate({ 
                                    userId: selectedUser.id, 
                                    kycStatus: 'approved' 
                                  })}
                                >
                                  <i className="fas fa-check mr-1"></i>
                                  Approve
                                </Button>
                                <Button 
                                  variant={selectedUser.kycStatus === 'rejected' ? 'default' : 'outline'}
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={updateUserKycMutation.isPending}
                                  onClick={() => updateUserKycMutation.mutate({ 
                                    userId: selectedUser.id, 
                                    kycStatus: 'rejected' 
                                  })}
                                >
                                  <i className="fas fa-times mr-1"></i>
                                  Reject
                                </Button>
                                <Button 
                                  variant={selectedUser.kycStatus === 'pending' ? 'default' : 'outline'}
                                  size="sm"
                                  disabled={updateUserKycMutation.isPending}
                                  onClick={() => updateUserKycMutation.mutate({ 
                                    userId: selectedUser.id, 
                                    kycStatus: 'pending' 
                                  })}
                                >
                                  <i className="fas fa-clock mr-1"></i>
                                  Pending
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredUsers?.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-users text-muted-foreground text-2xl"></i>
              </div>
              <h4 className="font-semibold mb-2">No users found</h4>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}