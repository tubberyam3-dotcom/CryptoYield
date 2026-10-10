import { useQuery } from "@tanstack/react-query";
import type { User, JointAccount } from "@shared/schema";

export interface AccountContext {
  isJointAccount: boolean;
  accountId: string;
  userRole: string | null;
  jointAccountInfo: {
    jointAccount: JointAccount;
    userRole: string;
  } | null;
}

export interface AuthResponse extends User {
  accountContext?: AccountContext;
  hasXpCode?: boolean;
}

export function useAuth() {
  const { data: authResponse, isLoading, error } = useQuery<AuthResponse | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0, // Always check auth status
    refetchOnWindowFocus: false, // Disable refetch on window focus for demo mode
  });

  // Extract user and account context from response
  const user = authResponse ? {
    id: authResponse.id,
    email: authResponse.email,
    firstName: authResponse.firstName,
    lastName: authResponse.lastName,
    profileImageUrl: authResponse.profileImageUrl,
    role: authResponse.role,
    kycStatus: authResponse.kycStatus,
    withdrawalSuspended: authResponse.withdrawalSuspended,
    createdAt: authResponse.createdAt,
    updatedAt: authResponse.updatedAt,
  } as User : null;

  const accountContext = authResponse?.accountContext;

  // In demo mode, we'll always have a user after the initial load
  const isAuthenticated = !!user;
  const isDemoMode = user?.id === 'demo-user';
  const hasJointAccount = accountContext?.isJointAccount || false;
  const jointAccount = accountContext?.jointAccountInfo?.jointAccount;
  const userRole = accountContext?.userRole;

  return {
    user,
    isLoading,
    isAuthenticated,
    isDemoMode,
    hasJointAccount,
    jointAccount,
    userRole,
    accountContext,
    hasXpCode: !!authResponse?.hasXpCode,
    error,
  };
}
