
import { Student } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserWithSchool } from '@/services/userService';

export type StudentFilters = { ano_letivo?: string; serie?: number; turma?: string; turno?: string; nome?: string };

export const getStudents = async (
  filters?: StudentFilters,
  limit?: number,
  offset?: number
): Promise<Student[]> => {
  try {
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;

    let query = supabase.from('alunos').select('*').order('nome', { ascending: true });

    if (escolaId) query = query.eq('escola_id', escolaId);
    if (filters?.ano_letivo) query = query.ilike('ano_letivo', `%${filters.ano_letivo}%`);
    if (typeof filters?.serie !== 'undefined') query = query.eq('serie', filters.serie);
    if (filters?.turma) query = query.eq('turma', filters.turma);
    if (filters?.turno) query = query.eq('turno', filters.turno);
    if (filters?.nome?.trim()) query = query.ilike('nome', `%${filters.nome.trim()}%`);

    if (limit != null && offset != null) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar alunos:', error);
    throw error;
  }
};

export const getStudentsCount = async (filters?: StudentFilters): Promise<number> => {
  try {
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;

    let query = supabase.from('alunos').select('*', { count: 'exact', head: true });
    if (escolaId) query = query.eq('escola_id', escolaId);
    if (filters?.ano_letivo) query = query.ilike('ano_letivo', `%${filters.ano_letivo}%`);
    if (typeof filters?.serie !== 'undefined') query = query.eq('serie', filters.serie);
    if (filters?.turma) query = query.eq('turma', filters.turma);
    if (filters?.turno) query = query.eq('turno', filters.turno);
    if (filters?.nome?.trim()) query = query.ilike('nome', `%${filters.nome.trim()}%`);

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error('Erro ao contar alunos:', error);
    throw error;
  }
};

export const getStudentById = async (id: string): Promise<Student | undefined> => {
  const { data, error } = await supabase
    .from('alunos')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Erro ao buscar aluno:', error);
    throw error;
  }
  
  return data;
};

export const createStudent = async (student: Student): Promise<Student> => {
  try {
    // Obter o usuário atual para adicionar escola_id
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    
    // Garantir valores padrão para colunas que são NOT NULL no banco
    const studentData = {
      nome: student.nome,
      serie: student.serie,
      turma: student.turma,
      turno: student.turno,
      sexo: student.sexo ?? 'Não informado',
      data_nascimento: student.data_nascimento ?? null,
      ano_letivo: student.ano_letivo ?? '2025',
      escola_id: escolaId
    };
    
    const { data, error } = await supabase
      .from('alunos')
      .insert(studentData)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar aluno:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao criar aluno:', error);
    throw error;
  }
};

export const updateStudent = async (id: string, data: Partial<Student>): Promise<Student> => {
  const { data: updatedData, error } = await supabase
    .from('alunos')
    .update({
      nome: data.nome,
      serie: data.serie,
      turma: data.turma,
      turno: data.turno,
      sexo: data.sexo,
      data_nascimento: data.data_nascimento
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Erro ao atualizar aluno:', error);
    throw error;
  }
  
  return updatedData;
};

export const deleteStudent = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('alunos')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao deletar aluno:', error);
    throw error;
  }
};

export const getStudentTurmas = async (): Promise<string[]> => {
  try {
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    let query = supabase.from('alunos').select('turma').not('turma', 'is', null).limit(500);
    if (escolaId) query = query.eq('escola_id', escolaId);
    const { data, error } = await query;
    if (error) throw error;
    return Array.from(new Set((data || []).map((r: { turma: string }) => r.turma).filter(Boolean))).sort();
  } catch (error) {
    console.error('Erro ao buscar turmas:', error);
    return [];
  }
};

export const getStudentTurnos = async (): Promise<string[]> => {
  try {
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    let query = supabase.from('alunos').select('turno').not('turno', 'is', null).limit(500);
    if (escolaId) query = query.eq('escola_id', escolaId);
    const { data, error } = await query;
    if (error) throw error;
    return Array.from(new Set((data || []).map((r: { turno: string }) => r.turno).filter(Boolean))).sort();
  } catch (error) {
    console.error('Erro ao buscar turnos:', error);
    return [];
  }
};

// Buscar anos letivos distintos dos alunos diretamente do banco
export const getStudentYears = async (): Promise<string[]> => {
  try {
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;

    // Buscar em lotes para evitar limite padrão do Supabase
    let all: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase.from('alunos').select('ano_letivo').range(from, from + batchSize - 1);
      if (escolaId) {
        query = query.eq('escola_id', escolaId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Erro ao buscar anos letivos:', error);
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
    console.error('Erro em getStudentYears:', error);
    throw error;
  }
};
