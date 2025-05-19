import { User, Profile, School, UserWithProfile, SchoolRecord } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { ADMIN_CREDENTIALS } from '@/hooks/auth/constants';

// Função para obter o usuário atual
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Error fetching current user:', error);
      return null;
    }

    if (!data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email || '',
      is_confirmed: !data.user.email_confirmed_at ? false : true,
    };
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
};

// Função para obter o usuário atual com seu perfil e escola associada
export async function getCurrentUserWithSchool(): Promise<UserWithProfile | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // Não lance erro, apenas retorne null
      return null;
    }

    // Obter o perfil sem JOIN para evitar recursão em políticas
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Erro ao buscar perfil:', profileError);
      
      // Se o perfil não existe, crie um novo
      if (profileError.code === 'PGRST116') {
        const newProfile = {
          id: user.id,
          email: user.email,
          role: user.email?.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() ? 'admin' : 'user',
          is_confirmed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select('*')
          .single();

        if (createError) {
          console.error('Erro ao criar perfil:', createError);
          return null;
        }

        // Buscar escola associada após criar perfil
        let escola = null;
        if (createdProfile.escola_id) {
          const { data: escolaData, error: escolaError } = await supabase
            .from('escolas')
            .select('*')
            .eq('id', createdProfile.escola_id)
            .single();
          if (!escolaError) escola = escolaData;
        }
        return {
          id: createdProfile.id,
          email: createdProfile.email,
          profile: { ...createdProfile, escola }
        };
      }
      
      return null;
    }

    // Se o perfil existe, buscar a escola associada posteriormente
    let escola = null;
    if (profile && profile.escola_id) {
      const { data: escolaData, error: escolaError } = await supabase
        .from('escolas')
        .select('*')
        .eq('id', profile.escola_id)
        .single();
      if (!escolaError) escola = escolaData;
    }

    // Retornar usuário com perfil e escola
    return {
      id: profile.id,
      email: profile.email,
      profile: { ...profile, escola }
    };
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    return null;
  }
}

// Função para obter todas as escolas
export const getSchools = async (): Promise<School[]> => {
  try {
    const { data, error } = await supabase
      .from('escolas')
      .select('*');

    if (error) {
      console.error('Error fetching schools:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getSchools:', error);
    throw error;
  }
};

// Função para obter uma escola por ID
export const getSchoolById = async (id: string): Promise<School | null> => {
  try {
    const { data, error } = await supabase
      .from('escolas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching school by ID:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Error in getSchoolById:', error);
    return null;
  }
};

// Função para criar uma nova escola
export const createSchool = async (school: Omit<School, 'id' | 'created_at'>): Promise<School> => {
  try {
    // Verificar se o usuário está autenticado
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      throw new Error('Usuário não autenticado');
    }

    // Criar a escola com o usuário autenticado
    const { data, error } = await supabase
      .from('escolas')
      .insert({
        nome: school.nome,
        endereco: school.endereco,
        telefone: school.telefone,
        created_by: session.session.user.id, // Adicionar o ID do usuário que criou
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating school:', error);
      if (error.code === '42501') {
        throw new Error('Sem permissão para criar escola. Verifique se você está logado como administrador.');
      }
      throw error;
    }

    if (!data) {
      throw new Error('Erro ao criar escola: nenhum dado retornado');
    }

    return data;
  } catch (error) {
    console.error('Error in createSchool:', error);
    throw error;
  }
};

// Função para atualizar uma escola
export const updateSchool = async (id: string, school: Partial<School>): Promise<School> => {
  try {
    const updateData: any = {};
    
    if (school.nome !== undefined) updateData.nome = school.nome;
    if (school.endereco !== undefined) updateData.endereco = school.endereco;
    if (school.telefone !== undefined) updateData.telefone = school.telefone;
    
    const { data, error } = await supabase
      .from('escolas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating school:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateSchool:', error);
    throw error;
  }
};

// Função para obter todos os perfis (usuários) com suas escolas
export const getUsersWithSchools = async (): Promise<UserWithProfile[]> => {
  try {
    console.log('Iniciando busca de perfis de usuários');
    // Obter todos os perfis sem a relação com escolas primeiro
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    if (!profiles) {
      console.log('Nenhum perfil encontrado');
      return [];
    }

    console.log(`Perfis encontrados: ${profiles.length}`);

    // Obter todas as escolas
    const { data: escolas, error: escolasError } = await supabase
      .from('escolas')
      .select('*');

    if (escolasError) {
      console.error('Error fetching schools:', escolasError);
      throw escolasError;
    }

    console.log(`Escolas encontradas: ${escolas.length}`);

    // Criar um mapa de escolas para acesso rápido
    const escolaMap = new Map(escolas?.map(escola => [escola.id, escola]) || []);

    // Montar os usuários com seus perfis e escolas
    return profiles.map(profile => ({
      id: profile.id,
      email: profile.email || '',
      profile: {
        ...profile,
        escola: profile.escola_id ? escolaMap.get(profile.escola_id) || null : null
      }
    }));
  } catch (error) {
    console.error('Error in getUsersWithSchools:', error);
    throw error;
  }
};

// Função para obter os detalhes de um único usuário com sua escola
export const getUserWithSchoolById = async (userId: string): Promise<UserWithProfile | null> => {
  try {
    // Obter o perfil do usuário sem a relação com escola
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile by ID:', profileError);
      return null;
    }

    if (!profile) {
      return null;
    }

    // Se o perfil tem uma escola associada, obter os detalhes da escola
    let escolaData = null;
    if (profile.escola_id) {
      const { data, error } = await supabase
        .from('escolas')
        .select('*')
        .eq('id', profile.escola_id)
        .single();

      if (!error && data) {
        escolaData = data;
      }
    }

    return {
      id: profile.id,
      email: profile.email || '',
      profile: {
        ...profile,
        escola: escolaData
      }
    };
  } catch (error) {
    console.error('Error in getUserWithSchoolById:', error);
    return null;
  }
};

// Obter todos os usuários
export const getUsers = async (): Promise<UserWithProfile[]> => {
  try {
    return await getUsersWithSchools();
  } catch (error) {
    console.error('Error in getUsers:', error);
    throw error;
  }
};

// Habilitar um usuário (alterar status para 'Ativo')
export const enableUser = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'Ativo' })
      .eq('id', userId);
    
    if (error) {
      console.error('Error enabling user:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in enableUser:', error);
    throw error;
  }
};

// Desabilitar um usuário (alterar status para 'Inativo')
export const disableUser = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'Inativo' })
      .eq('id', userId);
    
    if (error) {
      console.error('Error disabling user:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in disableUser:', error);
    throw error;
  }
};

// Função para criar um novo usuário
export const createUser = async (
  email: string, 
  password: string, 
  role: string = 'user',
  escolaId?: string
): Promise<User> => {
  try {
    // Validate role
    if (!role || (role !== 'user' && role !== 'admin')) {
      throw new Error('Invalid role. Must be either "user" or "admin"');
    }

    // Criar o usuário na autenticação
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          is_confirmed: true
        }
      }
    });

    if (authError) {
      console.error('Error creating user in auth:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    // Criar o perfil do usuário
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        role: role,
        escola_id: escolaId || null,
        status: 'Ativo',
        created_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      throw profileError;
    }

    return {
      id: authData.user.id,
      email: authData.user.email || '',
      is_confirmed: true
    };
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
};
