import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0, // Always check auth status
    refetchOnWindowFocus: false, // Disable refetch on window focus for demo mode
  });

  // In demo mode, we'll always have a user after the initial load
  const isAuthenticated = !!user;
  const isDemoMode = user?.id === 'demo-user';

  return {
    user,
    isLoading,
    isAuthenticated,
    isDemoMode,
    error,
  };
}
