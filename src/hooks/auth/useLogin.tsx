import { useState } from 'react';
import { ALLOWED_USERS, ADMIN_CREDENTIALS } from './constants';
import { supabase } from '@/integrations/supabase/client';
import { createSchool, getSchools } from '@/services/userService';
import { toast } from 'sonner';
import { AuthState } from '@/types/auth';

export function useLogin(authState: AuthState) {
  const { setUser, setLoading, setIsAdmin } = authState;
  const [loginInProgress, setLoginInProgress] = useState(false);

  const login = async (email: string, password: string) => {
    if (loginInProgress) return;
    
    try {
      setLoginInProgress(true);
      setLoading(true);
      console.log(`Tentando login com: ${email}`);
      
      // Verificar se são as credenciais de admin
      const isAdminLogin = email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() &&
                          password === ADMIN_CREDENTIALS.password;
      
      if (isAdminLogin) {
        console.log("Detectado login como admin");
        
        // Primeiro, tentar login com as credenciais fornecidas
        const { data: adminLoginData, error: adminLoginError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (!adminLoginError && adminLoginData.user) {
          console.log("Login como admin bem-sucedido");
          setUser({
            id: adminLoginData.user.id,
            email: adminLoginData.user.email || '',
            is_confirmed: true
          });
          setIsAdmin(true);
          toast.success('Login como administrador realizado com sucesso!');
          return;
        }

        // Se o login falhou, criar a conta de admin
        console.log("Login falhou, criando conta do admin");
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: { 
              role: 'admin',
              is_confirmed: true
            }
          }
        });
        
        if (signUpError) {
          if (signUpError.message.includes('email already') || signUpError.message.includes('User already')) {
            // Se a conta já existe, tentar login novamente
            const { data: retryLoginData, error: retryLoginError } = await supabase.auth.signInWithPassword({
              email: email,
              password: password
            });

            if (!retryLoginError && retryLoginData.user) {
              console.log("Login como admin bem-sucedido após retry");
              setUser({
                id: retryLoginData.user.id,
                email: retryLoginData.user.email || '',
                is_confirmed: true
              });
              setIsAdmin(true);
              toast.success('Login como administrador realizado com sucesso!');
              return;
            }
          }
          throw new Error(`Erro ao criar/acessar conta admin: ${signUpError.message}`);
        }

        if (signUpData?.user) {
          console.log("Conta do admin criada com sucesso");
          setUser({
            id: signUpData.user.id,
            email: signUpData.user.email || '',
            is_confirmed: true
          });
          setIsAdmin(true);
          toast.success('Conta de administrador criada e login realizado com sucesso!');
          return;
        }
      }
      
      // Garantir que existe uma escola modelo
      try {
        const schools = await getSchools();
        if (schools.length === 0) {
          console.log("Nenhuma escola encontrada, criando escola modelo");
          await createSchool({
            nome: "Escola Modelo",
            endereco: "Rua Principal, 123",
            telefone: "(11) 9999-8888"
          });
        }
      } catch (error) {
        console.error("Erro ao verificar ou criar escola:", error);
      }
      
      // Fluxo normal para outros usuários
      console.log("Processando login normal");
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (loginError) {
        console.error("Erro no login normal:", loginError);
      }
      
      if (!loginError && loginData?.user) {
        console.log("Login normal bem-sucedido");
        setUser({
          id: loginData.user.id,
          email: loginData.user.email || '',
          is_confirmed: true
        });
        toast.success('Login realizado com sucesso!');
        return;
      }
      
      // Verificar se o usuário está na lista permitida
      const allowedUser = ALLOWED_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (allowedUser) {
        console.log("Usuário encontrado na lista permitida");
        // Tentar login com senha padrão
        const { data: standardLoginData, error: standardLoginError } = await supabase.auth.signInWithPassword({
          email,
          password: allowedUser.password
        });
        
        if (standardLoginError) {
          console.error("Erro no login com senha padrão:", standardLoginError);
        }
        
        if (!standardLoginError && standardLoginData?.user) {
          console.log("Login com senha padrão bem-sucedido");
          setUser({
            id: standardLoginData.user.id,
            email: standardLoginData.user.email || '',
            is_confirmed: true
          });
          setIsAdmin(!!allowedUser.isAdmin);
          toast.success('Login realizado com sucesso!');
          return;
        }
        
        // Se o login falhou, tentar criar a conta
        console.log("Tentando criar conta para usuário permitido");
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: allowedUser.password,
          options: {
            data: {
              is_confirmed: true,
              role: allowedUser.isAdmin ? 'admin' : 'user'
            }
          }
        });
        
        if (signUpError) {
          console.error("Erro ao criar conta:", signUpError);
          
          if (signUpError.message.includes('email already') || signUpError.message.includes('User already')) {
            console.log("Conta já existe, tentando resetar senha");
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
            
            if (resetError) {
              console.error("Erro ao resetar senha:", resetError);
              throw new Error("Não foi possível recuperar a conta. Entre em contato com o suporte.");
            }
            
            throw new Error("Link para redefinição de senha enviado. Por favor, verifique seu email.");
          }
          
          throw new Error(`Erro ao criar conta: ${signUpError.message}`);
        }
        
        if (signUpData?.user) {
          console.log("Conta criada, tentando login");
          // Se a conta foi criada, fazer login
          const { data: newLoginData, error: newLoginError } = await supabase.auth.signInWithPassword({
            email,
            password: allowedUser.password
          });
          
          if (newLoginError) {
            console.error("Erro no login após criar conta:", newLoginError);
          }
          
          if (!newLoginError && newLoginData?.user) {
            console.log("Login após criar conta bem-sucedido");
            setUser({
              id: newLoginData.user.id,
              email: newLoginData.user.email || '',
              is_confirmed: true
            });
            setIsAdmin(!!allowedUser.isAdmin);
            toast.success('Conta criada e login realizado com sucesso!');
            return;
          }
          
          throw new Error("Conta criada, mas não foi possível fazer login. Tente novamente.");
        }
      }
      
      throw new Error("Credenciais inválidas. Verifique seu email e senha.");
    } catch (error: any) {
      console.error("Erro no processo de login:", error);
      toast.error(error.message || 'Erro ao processar autenticação');
      throw error;
    } finally {
      setLoginInProgress(false);
      setLoading(false);
    }
  };

  return { login, loginInProgress };
}
