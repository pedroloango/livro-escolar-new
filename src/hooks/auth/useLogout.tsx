
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useLogout(authState: any) {
  const { setUser, setIsAdmin, setCurrentSchool } = authState;
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('user');
      setUser(null);
      setIsAdmin(false);
      setCurrentSchool(null);
      navigate('/login');
      toast.info('Você saiu do sistema');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast.error('Erro ao sair do sistema');
    }
  };

  return { logout };
}
