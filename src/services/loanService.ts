import { Loan, Student, Book } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserWithSchool } from '@/services/userService';
import { updateBookStock } from '@/services/bookService';
import { getStorytellingCount } from '@/services/storytellingService';

// Helper function to populate loan with student and book data using JOIN
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

// Optimized function to get loans with JOINs to avoid N+1 queries
async function getLoansWithJoins(escolaId?: string, limit?: number, offset?: number): Promise<Loan[]> {
  let query = supabase
    .from('emprestimos')
    .select(`
      *,
      aluno:alunos(*),
      livro:livros(*)
    `)
    .order('data_retirada', { ascending: false });
  
  if (escolaId) {
    query = query.eq('escola_id', escolaId);
  }
  
  if (limit) {
    query = query.limit(limit);
  }
  
  if (offset) {
    query = query.range(offset, offset + (limit || 50) - 1);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Erro ao buscar empréstimos com JOINs:', error);
    throw error;
  }
  
  return data || [];
}

export const getLoans = async (limit?: number, offset?: number): Promise<Loan[]> => {
  try {
    // Obter o usuário atual para filtrar por escola_id
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    
    // Use optimized function with JOINs
    return await getLoansWithJoins(escolaId, limit, offset);
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
    
    let query = supabase
      .from('emprestimos')
      .select(`
        *,
        aluno:alunos(*),
        livro:livros(*)
      `)
      .in('status', ['Emprestado', 'Pendente'])
      .order('data_retirada', { ascending: false });
    
    // Se o usuário tem uma escola associada, filtrar por essa escola
    if (escolaId) {
      query = query.eq('escola_id', escolaId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar empréstimos ativos:', error);
      throw error;
    }
    
    return data || [];
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
  
  return data ? (data as Loan) : undefined;
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
      // Buscar dados do aluno para preencher serie, turma e turno
      const { data: aluno, error: alunoError } = await supabase
        .from('alunos')
        .select('*')
        .eq('id', loan.aluno_id)
        .single();
      if (alunoError) {
        console.error('Erro ao buscar dados do aluno:', alunoError);
        throw alunoError;
      }
      loanData.serie = aluno.serie;
      loanData.turma = aluno.turma;
      loanData.turno = aluno.turno;
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
    
    // Nota: Não atualizamos o estoque na tabela livros pois os campos não existem
    // O estoque é calculado em tempo real baseado nos empréstimos
    console.log('Empréstimo criado com sucesso. Estoque será recalculado automaticamente.');
    
    return data as Loan;
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
  
  return updatedData as Loan;
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
  
  // Nota: Não atualizamos o estoque na tabela livros pois os campos não existem
  // O estoque é calculado em tempo real baseado nos empréstimos
  console.log('Devolução registrada com sucesso. Estoque será recalculado automaticamente.');
  
  return updatedData as Loan;
};

export const deleteLoan = async (id: string): Promise<void> => {
  // Primeiro, buscar o empréstimo para obter informações do livro
  const { data: loan, error: fetchError } = await supabase
    .from('emprestimos')
    .select('*')
    .eq('id', id)
    .single();
  
  if (fetchError) {
    console.error('Erro ao buscar empréstimo para exclusão:', fetchError);
    throw fetchError;
  }
  
  // Deletar o empréstimo
  const { error } = await supabase
    .from('emprestimos')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao deletar empréstimo:', error);
    throw error;
  }
  
  // Nota: Não atualizamos o estoque na tabela livros pois os campos não existem
  // O estoque é calculado em tempo real baseado nos empréstimos
  console.log('Empréstimo excluído com sucesso. Estoque será recalculado automaticamente.');
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
  
  return (data || []) as Loan[];
};

export const getLoansByBook = async (bookId: string): Promise<Loan[]> => {
  const { data, error } = await supabase
    .from('emprestimos')
    .select(`
      *,
      aluno:alunos(*),
      livro:livros(*)
    `)
    .eq('livro_id', bookId);
  
  if (error) {
    console.error('Erro ao buscar empréstimos por livro:', error);
    throw error;
  }
  
  return data || [];
};

// Optimized function to get dashboard statistics
export const getDashboardStats = async (): Promise<{
  totalStudents: number;
  totalBooks: number;
  activeLoans: number;
  totalLoans: number;
  totalStorytellings: number;
  emprestimosPorSerie: Record<string, number>;
  emprestimosPorSerieTurma: Record<string, number>;
  emprestimosPorStatus: Record<string, number>;
  topAlunos: Array<{ nome: string; count: number }>;
}> => {
  try {
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    
    // Get all loans with student and book data in one query
    let loansQuery = supabase
      .from('emprestimos')
      .select(`
        *,
        aluno:alunos(*),
        livro:livros(*)
      `);
    
    if (escolaId) {
      loansQuery = loansQuery.eq('escola_id', escolaId);
    }
    
    const { data: loans, error: loansError } = await loansQuery;
    
    if (loansError) {
      console.error('Erro ao buscar empréstimos para estatísticas:', loansError);
      throw loansError;
    }
    
    // Get students count
    let studentsQuery = supabase.from('alunos').select('*', { count: 'exact', head: true });
    if (escolaId) {
      studentsQuery = studentsQuery.eq('escola_id', escolaId);
    }
    const { count: totalStudents, error: studentsError } = await studentsQuery;
    
    if (studentsError) {
      console.error('Erro ao contar alunos:', studentsError);
      throw studentsError;
    }
    
    // Get books count
    let booksQuery = supabase.from('livros').select('*', { count: 'exact', head: true });
    if (escolaId) {
      booksQuery = booksQuery.eq('escola_id', escolaId);
    }
    const { count: totalBooks, error: booksError } = await booksQuery;
    
    if (booksError) {
      console.error('Erro ao contar livros:', booksError);
      throw booksError;
    }
    
    // Get storytelling count using dedicated service
    let totalStorytellings = 0;
    try {
      totalStorytellings = await getStorytellingCount();
    } catch (storytellingError) {
      console.error('Erro ao contar contações de histórias:', storytellingError);
      console.log('Continuando sem dados de storytelling...');
    }
    
    const loansData = loans || [];
    
    // Calculate statistics
    const activeLoans = loansData.filter(loan => 
      loan.status === 'Emprestado' || loan.status === 'Pendente'
    ).length;
    
    const totalLoans = loansData.length;
    
    // Empréstimos por série/turma concatenada
    const emprestimosPorSerieTurma: Record<string, number> = {};
    loansData.forEach((loan: any) => {
      const serie = loan.serie || 'N/A';
      const turma = loan.turma || 'N/A';
      const serieTurma = `${serie} - ${turma}`;
      emprestimosPorSerieTurma[serieTurma] = (emprestimosPorSerieTurma[serieTurma] || 0) + 1;
    });
    
    // Empréstimos por série (mantido para compatibilidade)
    const emprestimosPorSerie: Record<string, number> = {};
    loansData.forEach((loan: any) => {
      const serie = loan.serie || 'N/A';
      emprestimosPorSerie[serie] = (emprestimosPorSerie[serie] || 0) + 1;
    });
    
    // Empréstimos por status
    const emprestimosPorStatus: Record<string, number> = {};
    loansData.forEach((loan: any) => {
      const status = loan.status || 'N/A';
      emprestimosPorStatus[status] = (emprestimosPorStatus[status] || 0) + 1;
    });
    
    // Top alunos
    const alunoCount: Record<string, number> = {};
    loansData.forEach((loan: any) => {
      const nome = loan.aluno?.nome || 'N/A';
      alunoCount[nome] = (alunoCount[nome] || 0) + 1;
    });
    
    const topAlunos = Object.entries(alunoCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([nome, count]) => ({ nome, count }));
    
    return {
      totalStudents: totalStudents || 0,
      totalBooks: totalBooks || 0,
      activeLoans,
      totalLoans,
      totalStorytellings: totalStorytellings || 0,
      emprestimosPorSerie,
      emprestimosPorSerieTurma,
      emprestimosPorStatus,
      topAlunos
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas do dashboard:', error);
    throw error;
  }
};
