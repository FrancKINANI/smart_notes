import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';

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

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
}

// Hook d'authentification pour interagir avec l'API
export function useAuth() {
  const { toast } = useToast();

  // Requête pour obtenir l'utilisateur actuel
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery<User | null>({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/auth/user');
        if (res.status === 401) {
          return null;
        }
        return await res.json();
      } catch (err) {
        return null;
      }
    },
  });

  // Mutation pour l'inscription
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const res = await apiRequest('POST', '/api/auth/register', data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erreur lors de l\'inscription');
      }
      return res.json();
    },
    onSuccess: (data: User) => {
      queryClient.setQueryData(['/api/auth/user'], data);
      toast({
        title: 'Inscription réussie',
        description: 'Bienvenue sur l\'application !',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur d\'inscription',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation pour la connexion
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiRequest('POST', '/api/auth/login', credentials);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Identifiants invalides');
      }
      return res.json();
    },
    onSuccess: (data: User) => {
      queryClient.setQueryData(['/api/auth/user'], data);
      toast({
        title: 'Connexion réussie',
        description: `Bon retour, ${data.displayName || data.username}!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur de connexion',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation pour la déconnexion
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/auth/logout');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erreur lors de la déconnexion');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/user'], null);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: 'Déconnexion réussie',
        description: 'À bientôt !',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur de déconnexion',
        description: error.message,
        variant: 'destructive',
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