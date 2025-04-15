import { useEffect } from 'react';
import { ALLOWED_USERS, ADMIN_CREDENTIALS } from './constants';
import { supabase } from '@/integrations/supabase/client';
import { getSchools } from '@/services/userService';
import { AuthState } from '@/types/auth';
import { UserWithProfile } from '@/types';
import { toast } from 'sonner';

export function useAuthListener(authState: AuthState) {
  const { setUser, setIsAdmin, setCurrentSchool, setLoading } = authState;

  useEffect(() => {
    let isMounted = true;

    // Configurar listener para mudanças de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Evento de autenticação:", event);
      
      if (event === 'SIGNED_IN' && session) {
        if (!isMounted) return;
        
        try {
          setLoading(true);
          console.log("Nova sessão detectada, buscando detalhes do usuário");
          
          // Verificar se é admin por email
          const isAdminUser = session.user.email?.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();
          setIsAdmin(isAdminUser);
          console.log("É admin?", isAdminUser);

          // Buscar perfil do usuário
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*, escola:escolas(*)')
            .eq('id', session.user.id)
            .single();
          
          if (profileError && profileError.code !== 'PGRST116') {
            console.error("Erro ao buscar perfil:", profileError);
            throw profileError;
          }

          if (isAdminUser) {
            console.log("Usuário identificado como administrador");
            
            if (!profile || profileError?.code === 'PGRST116') {
              // Criar perfil de admin se não existir
              const { error: createError } = await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  role: 'admin',
                  is_confirmed: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              
              if (createError) {
                console.error("Erro ao criar perfil de admin:", createError);
                throw createError;
              }
            }
          }

          // Definir usuário base
          const userWithProfile: UserWithProfile = {
            id: session.user.id,
            email: session.user.email || '',
            is_confirmed: true,
            profile: profile || null
          };
          setUser(userWithProfile);

          // Buscar escola se necessário
          if (!profile?.escola) {
            try {
              const { data: schools } = await supabase
                .from('escolas')
                .select('*')
                .limit(1)
                .single();
              
              if (schools && isMounted) {
                setCurrentSchool(schools);
                
                // Atualizar perfil com escola
                await supabase
                  .from('profiles')
                  .update({ escola_id: schools.id })
                  .eq('id', session.user.id);
              }
            } catch (error) {
              console.error("Erro ao buscar/associar escola:", error);
            }
          } else if (isMounted) {
            setCurrentSchool(profile.escola);
          }
          
        } catch (error) {
          console.error("Erro ao processar autenticação:", error);
          toast.error("Erro ao processar autenticação. Por favor, tente novamente.");
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        console.log("Usuário desconectado");
        if (isMounted) {
          setUser(null);
          setIsAdmin(false);
          setCurrentSchool(null);
          setLoading(false);
        }
      }
    });
    
    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [setUser, setIsAdmin, setCurrentSchool, setLoading]);
}
