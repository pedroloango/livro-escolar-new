import { useState } from 'react';
import { ALLOWED_USERS, ADMIN_CREDENTIALS } from '@/hooks/auth/constants';
import { supabase } from '@/integrations/supabase/client';
import { createSchool, getSchools } from '@/services/userService';
import { toast } from 'sonner';
import { AuthState } from '@/types/auth';

export function useLogin(authState: AuthState) {
  const { setLoading } = authState;
  const [loginInProgress, setLoginInProgress] = useState(false);

  const login = async (email: string, password: string) => {
    if (loginInProgress) {
      toast.warning('Já existe um processo de login em andamento');
      return;
    }
    
    try {
      setLoginInProgress(true);
      setLoading(true);
      console.log(`Tentando login com: ${email}`);
      
      // Verificar se são as credenciais de admin
      const isAdminLogin = email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();
      
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
        toast.error("Erro ao inicializar sistema. Por favor, tente novamente mais tarde.");
        throw new Error("Erro ao inicializar sistema");
      }
      
      // Tratamento especial para o admin
      if (isAdminLogin) {
        console.log("Detectado login como admin");
        
        // Tentar com a senha específica do admin
        const adminPassword = ADMIN_CREDENTIALS.password;
        
        const { data: adminLoginData, error: adminLoginError } = await supabase.auth.signInWithPassword({
          email: ADMIN_CREDENTIALS.email,
          password: adminPassword
        });
        
        if (!adminLoginError && adminLoginData.user) {
          console.log("Login como admin bem-sucedido");
          toast.success('Login como administrador realizado com sucesso!');
          return;
        }
        
        console.log("Login como admin falhou, tentando criar conta admin");
        
        // Tentar criar o usuário admin
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: ADMIN_CREDENTIALS.email,
          password: adminPassword,
          options: {
            data: { 
              role: 'admin',
              is_confirmed: true
            }
          }
        });
        
        if (signUpError) {
          if (signUpError.message.includes('email already') || signUpError.message.includes('User already')) {
            console.log("Admin já existe, tentando recuperação de conta");
            
            // Força o login novamente com credenciais fixas
            const { data: retryAdminData, error: retryAdminError } = await supabase.auth.signInWithPassword({
              email: ADMIN_CREDENTIALS.email, 
              password: adminPassword
            });
            
            if (!retryAdminError && retryAdminData.user) {
              console.log("Login admin após segunda tentativa bem-sucedido");
              toast.success('Login como administrador realizado com sucesso!');
              return;
            }
            
            // Se ainda falhar, tenta resetar senha
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(ADMIN_CREDENTIALS.email);
            
            if (resetError) {
              console.error("Erro ao tentar redefinir senha:", resetError);
              toast.error("Não foi possível recuperar a conta de administrador. Entre em contato com o suporte.");
              throw new Error("Não foi possível recuperar a conta de administrador");
            }
            
            toast.info("Link para redefinição de senha enviado. Por favor, verifique seu email.");
            throw new Error("Link para redefinição de senha enviado");
          } else {
            console.error("Erro ao criar conta admin:", signUpError);
            toast.error("Erro ao criar conta de administrador. Entre em contato com o suporte.");
            throw new Error(`Erro ao criar conta admin: ${signUpError.message}`);
          }
        }
        
        if (signUpData.user) {
          console.log("Conta admin criada, tentando login");
          
          // Login após criar conta
          const { data: newAdminLoginData, error: newAdminLoginError } = await supabase.auth.signInWithPassword({
            email: ADMIN_CREDENTIALS.email,
            password: adminPassword
          });
          
          if (!newAdminLoginError && newAdminLoginData.user) {
            console.log("Login após criar conta admin bem-sucedido");
            toast.success('Conta de administrador criada e login realizado com sucesso!');
            return;
          } else {
            console.error("Erro ao fazer login após criar conta admin:", newAdminLoginError);
            toast.error("Conta criada, mas não foi possível fazer login. Tente novamente.");
            throw new Error("Conta criada, mas não foi possível fazer login");
          }
        }
      }
      
      // Fluxo normal para outros usuários
      console.log("Tentando login direto com as credenciais fornecidas");
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (!loginError && loginData.user) {
        console.log("Login direto bem-sucedido");
        toast.success('Login realizado com sucesso!');
        return;
      }
      
      console.log("Login direto falhou, verificando usuários específicos");
      
      // Tratamento para outros usuários da lista
      const allowedUser = ALLOWED_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (allowedUser) {
        console.log(`Usuário ${email} está na lista permitida`);
        
        // Tentar login com senha padrão
        const { data: standardLoginData, error: standardLoginError } = await supabase.auth.signInWithPassword({
          email,
          password: allowedUser.password
        });
        
        if (!standardLoginError && standardLoginData.user) {
          console.log("Login com senha encontrada bem-sucedido");
          toast.success('Login realizado com sucesso!');
          return;
        }
        
        console.log("Login com senha padrão falhou, tentando criar conta");
        
        // Tentar criar a conta do usuário
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
          if (signUpError.message.includes('email already') || signUpError.message.includes('User already')) {
            console.log("Usuário já existe, tentando recuperação de conta");
            
            // Se o usuário existe mas não conseguimos fazer login, algo está errado com a conta
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
            
            if (resetError) {
              console.error("Erro ao tentar redefinir senha:", resetError);
              toast.error("Não foi possível recuperar a conta. Entre em contato com o suporte.");
              throw new Error("Não foi possível recuperar a conta");
            }
            
            toast.info("Link para redefinição de senha enviado. Por favor, verifique seu email.");
            throw new Error("Link para redefinição de senha enviado");
          } else {
            console.error("Erro ao criar conta de usuário:", signUpError);
            toast.error("Erro ao criar conta. Entre em contato com o suporte.");
            throw new Error(`Erro ao criar conta: ${signUpError.message}`);
          }
        }
        
        if (signUpData.user) {
          console.log("Conta criada, tentando login");
          
          // Login após criar conta
          const { data: newLoginData, error: newLoginError } = await supabase.auth.signInWithPassword({
            email,
            password: allowedUser.password
          });
          
          if (!newLoginError && newLoginData.user) {
            console.log("Login após criar conta bem-sucedido");
            toast.success('Conta criada e login realizado com sucesso!');
            return;
          } else {
            console.error("Erro ao fazer login após criar conta:", newLoginError);
            toast.error("Conta criada, mas não foi possível fazer login. Tente novamente.");
            throw new Error("Conta criada, mas não foi possível fazer login");
          }
        }
      } else {
        // Se chegamos aqui, o login inicial falhou e o usuário não está na lista permitida
        console.error("Credenciais inválidas e usuário não está na lista permitida");
        toast.error("Credenciais inválidas. Verifique seu email e senha.");
        throw new Error("Credenciais inválidas");
      }
    } catch (error) {
      console.error("Erro no processo de login:", error);
      toast.error(error instanceof Error ? error.message : 'Falha no login. Tente novamente mais tarde.');
      throw error;
    } finally {
      setLoginInProgress(false);
      setLoading(false);
    }
  };

  return { login, loginInProgress };
} 