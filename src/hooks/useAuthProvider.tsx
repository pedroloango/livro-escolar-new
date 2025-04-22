import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from './auth/useAuthState';
import { useLogout } from './auth/useLogout';
import { supabase } from '@/integrations/supabase/client';
import { ADMIN_CREDENTIALS } from '@/hooks/auth/constants';

export function useAuthProvider() {
  useEffect(() => {
    // Auto-login no Supabase com credenciais de administrador
    const autoLogin = async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
      });
      if (error) console.error('Erro ao autenticar Supabase:', error);
    };
    autoLogin();
  }, []);

  const navigate = useNavigate();
  const authState = useAuthState();
  const { isAdmin, currentSchool } = authState;
  
  // Set up logout handler
  const { logout } = useLogout(authState);

  return {
    user: {
      id: '1',
      email: 'admin@example.com',
      is_confirmed: true
    },
    loading: false,
    login: async () => {},
    logout,
    isAuthenticated: true,
    isAdmin: true,
    currentSchool,
  };
}
