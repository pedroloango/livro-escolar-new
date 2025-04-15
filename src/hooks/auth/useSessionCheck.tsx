import { useEffect } from 'react';
import { ALLOWED_USERS } from './constants';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserWithSchool, getSchools } from '@/services/userService';

export function useSessionCheck(authState: any, navigate: any) {
  const { setUser, setIsAdmin, setCurrentSchool, setLoading } = authState;
  
  useEffect(() => {
    let isMounted = true;
    
    const checkUser = async () => {
      try {
        setLoading(true);
        
        // Verificar se há uma sessão ativa
        const { data } = await supabase.auth.getSession();
        
        if (data.session) {
          console.log("Sessão ativa encontrada, buscando detalhes do usuário");
          
          // Buscar usuário completo com perfil e escola
          const currentUser = await getCurrentUserWithSchool();
          
          if (currentUser && isMounted) {
            console.log("Usuário encontrado com detalhes:", currentUser);
            setUser(currentUser);
            setIsAdmin(currentUser.profile?.role === 'admin');
            setCurrentSchool(currentUser.profile?.escola || null);
          } else {
            console.log("Nenhum perfil encontrado, verificando por email");
            
            // Verificar se é o usuário admin por email
            if (data.session.user.email === 'pedro.loango@hotmail.com') {
              console.log("Usuário admin reconhecido pelo email");
              setUser({
                id: data.session.user.id,
                email: data.session.user.email || '',
                is_confirmed: true
              });
              setIsAdmin(true);
              
              // Buscar a primeira escola disponível
              try {
                const schools = await getSchools();
                if (schools.length > 0) {
                  setCurrentSchool(schools[0]);
                }
              } catch (error) {
                console.error("Erro ao buscar escolas para admin:", error);
              }
            } else {
              console.log("Verificando na lista de usuários permitidos");
              // Verificar a lista de usuários permitidos como fallback
              const email = data.session.user.email;
              const allowedUser = ALLOWED_USERS.find(u => u.email.toLowerCase() === email?.toLowerCase());
              
              if (allowedUser) {
                console.log("Usuário encontrado na lista de permitidos:", allowedUser);
                setUser({
                  id: data.session.user.id,
                  email: email || '',
                  is_confirmed: true
                });
                setIsAdmin(!!allowedUser.isAdmin);
                
                // Buscar a primeira escola disponível
                try {
                  const schools = await getSchools();
                  if (schools.length > 0) {
                    setCurrentSchool(schools[0]);
                  }
                } catch (error) {
                  console.error("Erro ao buscar escolas para usuário permitido:", error);
                }
              } else {
                console.log("Usuário não reconhecido, fazendo logout");
                // Need to reference the logout function from the main provider
                // This will be handled by the auth listener in useAuthListener
              }
            }
          }
        } else {
          console.log("Nenhuma sessão ativa encontrada");
          if (isMounted) {
            setUser(null);
            setIsAdmin(false);
            setCurrentSchool(null);
          }
        }
      } catch (error) {
        console.error("Erro ao verificar sessão:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    checkUser();
    
    return () => {
      isMounted = false;
    };
  }, [navigate, setUser, setIsAdmin, setCurrentSchool, setLoading]);
}
