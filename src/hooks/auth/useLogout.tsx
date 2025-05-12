import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useLogout(authState: any) {
  const { setUser, setIsAdmin, setCurrentSchool, setLoading } = authState;
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('user');
      setUser(null);
      setIsAdmin(false);
      setCurrentSchool(null);
      setLoading(false);
      setTimeout(() => {
        navigate('/login');
        toast.info('Você saiu do sistema');
      }, 0);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast.error('Erro ao sair do sistema');
    }
  };

  return { logout };
}
