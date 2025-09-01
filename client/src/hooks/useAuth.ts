import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0, // Always check auth status
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
