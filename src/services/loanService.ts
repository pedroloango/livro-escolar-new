import { Loan, Student, Book } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserWithSchool } from '@/services/userService';

// Helper function to populate loan with student and book data
async function populateLoan(loan: Loan): Promise<Loan> {
  // Buscar aluno
  const { data: studentData } = await supabase
    .from('alunos')
    .select('*')
    .eq('id', loan.aluno_id)
    .single();
  
  // Buscar livro
  const { data: bookData } = await supabase
    .from('livros')
    .select('*')
    .eq('id', loan.livro_id)
    .single();
  
  return {
    ...loan,
    aluno: studentData || undefined,
    livro: bookData || undefined
  };
}

export const getLoans = async (): Promise<Loan[]> => {
  try {
    // Obter o usuário atual para filtrar por escola_id
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    
    // Create a query
    let query = supabase.from('emprestimos').select('*');
    
    // Se o usuário tem uma escola associada, filtrar por essa escola
    if (escolaId) {
      query = query.eq('escola_id', escolaId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar empréstimos:', error);
      throw error;
    }
    
    // Return all loans with populated student and book data
    const populatedLoans = await Promise.all(
      (data || []).map(loan => populateLoan(loan as Loan))
    );
    
    return populatedLoans;
  } catch (error) {
    console.error('Erro ao obter empréstimos:', error);
    throw error;
  }
};

export const getActiveLoans = async (): Promise<Loan[]> => {
  try {
    // Obter o usuário atual para filtrar por escola_id
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    
    let query = supabase.from('emprestimos')
      .select('*')
      .in('status', ['Emprestado', 'Pendente']);
    
    // Se o usuário tem uma escola associada, filtrar por essa escola
    if (escolaId) {
      query = query.eq('escola_id', escolaId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar empréstimos ativos:', error);
      throw error;
    }
    
    // Return active loans with populated student and book data
    const populatedLoans = await Promise.all(
      (data || []).map(loan => populateLoan(loan as Loan))
    );
    
    return populatedLoans;
  } catch (error) {
    console.error('Erro ao buscar empréstimos ativos:', error);
    throw error;
  }
};

export const getLoanById = async (id: string): Promise<Loan | undefined> => {
  const { data, error } = await supabase
    .from('emprestimos')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Erro ao buscar empréstimo:', error);
    throw error;
  }
  
  return data ? populateLoan(data as Loan) : undefined;
};

export const createLoan = async (loan: Loan): Promise<Loan> => {
  try {
    // Obter o usuário atual para adicionar escola_id
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    
    // Use correct date format to avoid timezone issues
    const dateRetirada = new Date(loan.data_retirada);
    
    // Preparar os dados do empréstimo
    const loanData: any = {
      livro_id: loan.livro_id,
      data_retirada: dateRetirada.toISOString(),
      quantidade_retirada: loan.quantidade_retirada || 1,
      status: 'Emprestado',
      escola_id: escolaId
    };

    // Se for empréstimo para aluno
    if (loan.aluno_id) {
      loanData.aluno_id = loan.aluno_id;
      loanData.professor_id = null;
    }
    // Se for empréstimo para professor
    else if (loan.professor_id) {
      // Buscar dados do professor
      const { data: professor, error: professorError } = await supabase
        .from('professores')
        .select('*')
        .eq('id', loan.professor_id)
        .single();

      if (professorError) {
        console.error('Erro ao buscar dados do professor:', professorError);
        throw professorError;
      }

      // Criar registro na tabela de alunos com os dados do professor
      const { data: professorAluno, error: professorAlunoError } = await supabase
        .from('alunos')
        .insert({
          nome: professor.nome,
          serie: parseInt(loan.serie || '0'),
          turma: loan.turma || 'PROF',
          turno: loan.turno || 'PROF',
          sexo: 'N/A',
          data_nascimento: new Date().toISOString(),
          escola_id: escolaId
        })
        .select()
        .single();

      if (professorAlunoError) {
        console.error('Erro ao criar registro de professor:', professorAlunoError);
        throw professorAlunoError;
      }

      loanData.professor_id = loan.professor_id;
      loanData.aluno_id = professorAluno.id;
      // Adicionar campos do professor
      if (loan.serie) loanData.serie = loan.serie;
      if (loan.turma) loanData.turma = loan.turma;
      if (loan.turno) loanData.turno = loan.turno;
    }
    
    const { data, error } = await supabase
      .from('emprestimos')
      .insert(loanData)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar empréstimo:', error);
      throw error;
    }
    
    return populateLoan(data as Loan);
  } catch (error) {
    console.error('Erro ao criar empréstimo:', error);
    throw error;
  }
};

export const updateLoan = async (id: string, data: Partial<Loan>): Promise<Loan> => {
  // Prepare data object with correct date formats
  const updateData: any = {};
  
  if (data.data_retirada) {
    const dataRetirada = new Date(data.data_retirada);
    updateData.data_retirada = dataRetirada.toISOString();
  }
  
  if (data.data_devolucao) {
    const dataDevolucao = new Date(data.data_devolucao);
    updateData.data_devolucao = dataDevolucao.toISOString();
  }
  
  if (data.quantidade_retirada !== undefined) {
    updateData.quantidade_retirada = data.quantidade_retirada;
  }
  
  if (data.quantidade_devolvida !== undefined) {
    updateData.quantidade_devolvida = data.quantidade_devolvida;
  }
  
  if (data.status) {
    updateData.status = data.status;
  }
  
  const { data: updatedData, error } = await supabase
    .from('emprestimos')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Erro ao atualizar empréstimo:', error);
    throw error;
  }
  
  return populateLoan(updatedData as Loan);
};

export const returnLoan = async (id: string, returnData: { data_devolucao: string, quantidade_devolvida: number }): Promise<Loan> => {
  // Primeiro, obtenha o empréstimo atual
  const { data: currentLoan, error: fetchError } = await supabase
    .from('emprestimos')
    .select('*')
    .eq('id', id)
    .single();
  
  if (fetchError) {
    console.error('Erro ao buscar empréstimo atual:', fetchError);
    throw fetchError;
  }
  
  // Use the new returned quantity directly (not adding to previous)
  const novaQuantidadeDevolvida = returnData.quantidade_devolvida;
  
  // Determine o status baseado na quantidade devolvida
  const status = novaQuantidadeDevolvida >= (currentLoan?.quantidade_retirada || 0) 
    ? 'Devolvido' 
    : 'Pendente';
  
  // Convert date to ISO format to fix timezone issues
  const dataDevolucao = new Date(returnData.data_devolucao);
  
  // Atualizar o empréstimo
  const { data: updatedData, error } = await supabase
    .from('emprestimos')
    .update({
      data_devolucao: dataDevolucao.toISOString(),
      quantidade_devolvida: novaQuantidadeDevolvida,
      status: status
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Erro ao devolver empréstimo:', error);
    throw error;
  }
  
  return populateLoan(updatedData as Loan);
};

export const deleteLoan = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('emprestimos')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao deletar empréstimo:', error);
    throw error;
  }
};

export const getLoansByStudent = async (studentId: string): Promise<Loan[]> => {
  const { data, error } = await supabase
    .from('emprestimos')
    .select('*')
    .eq('aluno_id', studentId);
  
  if (error) {
    console.error('Erro ao buscar empréstimos por aluno:', error);
    throw error;
  }
  
  const populatedLoans = await Promise.all(
    (data || []).map(loan => populateLoan(loan as Loan))
  );
  
  return populatedLoans;
};

export const getLoansByBook = async (bookId: string): Promise<Loan[]> => {
  const { data, error } = await supabase
    .from('emprestimos')
    .select('*')
    .eq('livro_id', bookId);
  
  if (error) {
    console.error('Erro ao buscar empréstimos por livro:', error);
    throw error;
  }
  
  const populatedLoans = await Promise.all(
    (data || []).map(loan => populateLoan(loan as Loan))
  );
  
  return populatedLoans;
};
