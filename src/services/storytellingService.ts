import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserWithSchool } from '@/services/userService';

export type Storytelling = {
  id?: string;
  professor_id: string;
  serie: string;
  turma: string;
  turno: string;
  livro_id: string;
  data_contacao: string;
  profissional_id: string;
  qtd_alunos: number;
  escola_id?: string;
};

export async function getStorytellings(): Promise<Storytelling[]> {
  try {
    console.log('getStorytellings - Buscando todos os registros...');
    
    // Buscar todos os registros em lotes para evitar limite de 1000 do Supabase
    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('contacao_historias')
        .select('*')
        .order('data_contacao', { ascending: false })
        .range(from, from + batchSize - 1);
      
      if (error) {
        console.error('getStorytellings - Erro na busca:', error);
        throw error;
      }

      if (data && data.length > 0) {
        allData = allData.concat(data);
        from += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`getStorytellings - Registros encontrados: ${allData.length}`);
    return allData as Storytelling[];
  } catch (error) {
    console.error('Erro ao buscar contações de histórias:', error);
    throw error;
  }
}

export async function addStorytelling(story: Omit<Storytelling, 'id'>): Promise<Storytelling> {
  const { data, error } = await supabase
    .from('contacao_historias')
    .insert([story])
    .select()
    .single();
  if (error) throw error;
  return data as Storytelling;
}

export async function updateStorytelling(id: string, updates: Partial<Omit<Storytelling, 'id'>>): Promise<Storytelling> {
  const { data, error } = await supabase
    .from('contacao_historias')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Storytelling;
}

export async function deleteStorytelling(id: string): Promise<void> {
  const { error } = await supabase
    .from('contacao_historias')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Função para buscar dados de storytelling por profissional
export async function getStorytellingsByProfessional(anoFilter?: string): Promise<Record<string, number>> {
  try {
    console.log('getStorytellingsByProfessional - Buscando dados...');
    
    // Buscar dados de storytelling com JOIN para obter nomes dos professores em lotes
    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('contacao_historias')
        .select(`
          profissional_id,
          professor:professores!profissional_id(nome),
          ano_letivo
        `)
        .range(from, from + batchSize - 1);
      
      if (anoFilter) {
        query = query.ilike('ano_letivo', `%${anoFilter}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        allData = allData.concat(data);
        from += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }
    
    // Contar por profissional (usando nome do professor)
    const profissionalCount: Record<string, number> = {};
    allData.forEach((story: any) => {
      const nomeProfissional = story.professor?.nome || story.profissional_id || 'N/A';
      profissionalCount[nomeProfissional] = (profissionalCount[nomeProfissional] || 0) + 1;
    });
    
    console.log(`getStorytellingsByProfessional - ${Object.keys(profissionalCount).length} profissionais encontrados`);
    console.log('getStorytellingsByProfessional - Profissionais:', Object.keys(profissionalCount));
    return profissionalCount;
  } catch (error) {
    console.error('Erro ao buscar contações por profissional:', error);
    throw error;
  }
}

// Função para buscar dados de storytelling por série e turma
export async function getStorytellingsBySerieTurma(anoFilter?: string): Promise<Record<string, number>> {
  try {
    console.log('getStorytellingsBySerieTurma - Buscando dados...');
    
    // Buscar dados em lotes para evitar limite de 1000 do Supabase
    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('contacao_historias')
        .select('serie, turma, ano_letivo')
        .range(from, from + batchSize - 1);
      if (anoFilter) {
        query = query.ilike('ano_letivo', `%${anoFilter}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        allData = allData.concat(data);
        from += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }
    
    // Contar por série-turma concatenado
    const serieTurmaCount: Record<string, number> = {};
    allData.forEach((story: any) => {
      const serieTurma = `${story.serie} - ${story.turma}`;
      serieTurmaCount[serieTurma] = (serieTurmaCount[serieTurma] || 0) + 1;
    });
    
    console.log(`getStorytellingsBySerieTurma - ${Object.keys(serieTurmaCount).length} combinações encontradas`);
    return serieTurmaCount;
  } catch (error) {
    console.error('Erro ao buscar contações por série/turma:', error);
    throw error;
  }
}

// Função para buscar contagem total de storytelling
export async function getStorytellingCount(anoFilter?: string): Promise<number> {
  try {
    console.log('getStorytellingCount - Contando registros...');
    
    let query = supabase
      .from('contacao_historias')
      .select('*', { count: 'exact', head: true });
    if (anoFilter) {
      query = query.ilike('ano_letivo', `%${anoFilter}%`);
    }
    const { count, error } = await query;
    
    if (error) throw error;
    
    console.log(`getStorytellingCount - Total encontrado: ${count}`);
    return count || 0;
  } catch (error) {
    console.error('Erro ao contar contações de histórias:', error);
    throw error;
  }
}

// Função de teste para verificar todos os registros
export async function getAllStorytellingsCount(anoFilter?: string): Promise<number> {
  try {
    let query = supabase
      .from('contacao_historias')
      .select('*', { count: 'exact', head: true });
    if (anoFilter) query = query.ilike('ano_letivo', `%${anoFilter}%`);
    const { count, error } = await query;
    
    if (error) throw error;
    
    console.log(`Total de registros na tabela contacao_historias: ${count}`);
    return count || 0;
  } catch (error) {
    console.error('Erro ao contar todos os registros:', error);
    throw error;
  }
}

// Função de teste para buscar todos os registros sem filtros
export async function getAllStorytellings(): Promise<Storytelling[]> {
  try {
    const { data, error } = await supabase
      .from('contacao_historias')
      .select('*')
      .order('data_contacao', { ascending: false });
    
    if (error) throw error;
    
    console.log(`Todos os registros carregados: ${data?.length || 0}`);
    return (data || []) as Storytelling[];
  } catch (error) {
    console.error('Erro ao buscar todos os registros:', error);
    throw error;
  }
} 

// Buscar anos letivos distintos das contações
export async function getStorytellingYears(): Promise<string[]> {
  try {
    let all: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('contacao_historias')
        .select('ano_letivo')
        .range(from, from + batchSize - 1);

      if (error) {
        console.error('Erro ao buscar anos de contação:', error);
        throw error;
      }

      if (data && data.length > 0) {
        all = all.concat(data);
        from += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    const years = Array.from(
      new Set(
        all
          .map((r: any) => r.ano_letivo)
          .filter(Boolean)
          .map((v: any) => String(v).trim())
      )
    ).sort((a, b) => Number(a) - Number(b));

    return years;
  } catch (error) {
    console.error('Erro em getStorytellingYears:', error);
    throw error;
  }
}