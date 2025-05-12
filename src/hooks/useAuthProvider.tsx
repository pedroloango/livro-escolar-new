import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from './auth/useAuthState';
import { useLogout } from './auth/useLogout';
import { useLogin } from './auth/useLogin';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserWithSchool } from '@/services/userService';

export function useAuthProvider() {
  const navigate = useNavigate();
  const authState = useAuthState();
  const { logout } = useLogout(authState);
  const { login } = useLogin(authState);

  // Restaurar sessão do Supabase ao montar
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session && isMounted) {
          // Buscar usuário completo
          const userWithProfile = await getCurrentUserWithSchool();
          if (userWithProfile) {
            authState.setUser(userWithProfile);
            authState.setIsAdmin(userWithProfile.profile?.role === 'admin');
            authState.setCurrentSchool(userWithProfile.profile?.escola || null);
          }
        } else if (isMounted) {
          authState.setUser(null);
          authState.setIsAdmin(false);
          authState.setCurrentSchool(null);
        }
      } catch (error) {
        console.error('Erro ao restaurar sessão:', error);
        authState.setUser(null);
        authState.setIsAdmin(false);
        authState.setCurrentSchool(null);
      } finally {
        if (isMounted) authState.setLoading(false);
      }
    };
    restoreSession();
    return () => { isMounted = false; };
  }, []);

  return {
    user: authState.user,
    loading: authState.loading,
    login,
    logout,
    isAuthenticated: !!authState.user,
    isAdmin: authState.isAdmin,
    currentSchool: authState.currentSchool,
  };
}
