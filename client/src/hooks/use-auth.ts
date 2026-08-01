import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";

interface User {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  role: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
}

// Authentication hook to interact with the API
export function useAuth() {
  const { toast } = useToast();

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery<User | null>({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      try {
        return await api.get("/api/auth/user");
      } catch (err) {
        if (err instanceof Error && err.message.includes("401")) {
          return null;
        }
        throw err;
      }
    },
    retry: false,
  });

  // Mutation for registration
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      return api.post("/api/auth/register", data);
    },
    onSuccess: (data: User) => {
      queryClient.setQueryData(["auth", "user"], data);
      toast({
        title: "Registration successful",
        description: "Welcome to the app!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for login
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      return api.post("/api/auth/login", credentials);
    },
    onSuccess: (data: User) => {
      queryClient.setQueryData(["auth", "user"], data);
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.displayName || data.username}!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return api.post("/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.setQueryData(["auth", "user"], null);
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      toast({
        title: "Logout successful",
        description: "See you soon!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Logout error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    register: registerMutation.mutate,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isRegisterLoading: registerMutation.isPending,
    isLoginLoading: loginMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
    refetchUser: refetch,
  };
}
