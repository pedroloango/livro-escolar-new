
import { Student } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserWithSchool } from '@/services/userService';

export const getStudents = async (): Promise<Student[]> => {
  try {
    // Obter o usuário atual para filtrar por escola_id
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    
    // Create a query
    let query = supabase.from('alunos').select('*');
    
    // Se o usuário tem uma escola associada, filtrar por essa escola
    if (escolaId) {
      query = query.eq('escola_id', escolaId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar alunos:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar alunos:', error);
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
    
    const studentData = {
      ...student,
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
