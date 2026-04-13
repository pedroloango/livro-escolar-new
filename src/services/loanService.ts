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

export type LoanFilters = { ano_letivo?: string; serie?: string; turma?: string; status?: string };

// Optimized function to get loans with JOINs and optional filters
async function getLoansWithJoins(
  escolaId?: string,
  limit?: number,
  offset?: number,
  filters?: LoanFilters
): Promise<Loan[]> {
  let query = supabase
    .from('emprestimos')
    .select(`
      *,
      aluno:alunos(*),
      livro:livros(*)
    `)
    .order('data_retirada', { ascending: false });

  if (escolaId) query = query.eq('escola_id', escolaId);
  if (filters?.ano_letivo) query = query.eq('ano_letivo', filters.ano_letivo);
  if (filters?.serie) query = query.eq('serie', filters.serie);
  if (filters?.turma) query = query.eq('turma', filters.turma);
  if (filters?.status) query = query.eq('status', filters.status);

  if (limit != null && offset != null) {
    query = query.range(offset, offset + limit - 1);
  } else if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Erro ao buscar empréstimos com JOINs:', error);
    throw error;
  }
  return data || [];
}

export const getLoans = async (limit?: number, offset?: number, filters?: LoanFilters): Promise<Loan[]> => {
  try {
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    return await getLoansWithJoins(escolaId, limit, offset, filters);
  } catch (error) {
    console.error('Erro ao obter empréstimos:', error);
    throw error;
  }
};

/** Opções para filtros (anos, séries, turmas) sem carregar todos os empréstimos */
export const getLoanFilterOptions = async (): Promise<{ years: string[]; series: string[]; turmas: string[] }> => {
  try {
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    let q = supabase.from('emprestimos').select('ano_letivo, serie, turma').limit(2000);
    if (escolaId) q = q.eq('escola_id', escolaId);
    const { data, error } = await q;
    if (error) throw error;
    const rows = data || [];
    const years = Array.from(new Set(rows.map((r: { ano_letivo?: string }) => r.ano_letivo).filter(Boolean).map(String))).sort((a, b) => Number(a) - Number(b));
    const series = Array.from(new Set(rows.map((r: { serie?: string }) => r.serie).filter(Boolean).map(String))).sort();
    const turmas = Array.from(new Set(rows.map((r: { turma?: string }) => r.turma).filter(Boolean).map(String))).sort();
    return { years, series, turmas };
  } catch (error) {
    console.error('Erro ao buscar opções de filtro de empréstimos:', error);
    return { years: [], series: [], turmas: [] };
  }
};

// Get total count of loans (for pagination)
export const getLoansCount = async (filters?: LoanFilters): Promise<number> => {
  try {
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;

    let query = supabase.from('emprestimos').select('*', { count: 'exact', head: true });
    if (escolaId) query = query.eq('escola_id', escolaId);
    if (filters?.ano_letivo) query = query.eq('ano_letivo', filters.ano_letivo);
    if (filters?.serie) query = query.eq('serie', filters.serie);
    if (filters?.turma) query = query.eq('turma', filters.turma);
    if (filters?.status) query = query.eq('status', filters.status);

    const { count, error } = await query;
    if (error) {
      console.error('Erro ao contar empréstimos:', error);
      throw error;
    }
    return count || 0;
  } catch (error) {
    console.error('Erro ao obter contagem de empréstimos:', error);
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
      // Registrar o ano_letivo do aluno no empréstimo (preserva histórico)
      if (aluno.ano_letivo) {
        loanData.ano_letivo = aluno.ano_letivo;
      } else {
        loanData.ano_letivo = null;
      }
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

      const serieNum = parseInt(String(loan.serie || '0'), 10);
      const serie = Number.isNaN(serieNum) ? 0 : Math.max(0, serieNum);
      const turma = (loan.turma && String(loan.turma).trim()) || 'PROF';
      const turno = (loan.turno && String(loan.turno).trim()) || 'PROF';
      const dataNascimento = new Date().toISOString().split('T')[0]; // date-only para coluna date
      const anoLetivo = String(new Date().getFullYear()); // evita NOT NULL em ano_letivo

      // Criar registro na tabela de alunos com os dados do professor (synthetic aluno para FK)
      const { data: professorAluno, error: professorAlunoError } = await supabase
        .from('alunos')
        .insert({
          nome: professor.nome,
          serie,
          turma,
          turno,
          sexo: 'N/A',
          data_nascimento: dataNascimento,
          escola_id: escolaId ?? undefined,
          ano_letivo: anoLetivo,
        })
        .select()
        .single();

      if (professorAlunoError) {
        console.error('Erro ao criar registro de professor (alunos):', professorAlunoError);
        throw professorAlunoError;
      }

      loanData.aluno_id = professorAluno.id;
      loanData.professor_id = loan.professor_id;
      loanData.serie = String(serie);
      loanData.turma = turma;
      loanData.turno = turno;
      loanData.ano_letivo = anoLetivo;
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

export const createProfessorLoansBatch = async (
  loan: Loan,
  books: Array<{ bookId: string; quantity: number }>
): Promise<Loan[]> => {
  try {
    if (!loan.professor_id) {
      throw new Error('Professor é obrigatório para empréstimo em lote');
    }
    if (!books.length) {
      throw new Error('Nenhum livro informado para empréstimo em lote');
    }

    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    const dateRetirada = new Date(loan.data_retirada);

    const { data: professor, error: professorError } = await supabase
      .from('professores')
      .select('*')
      .eq('id', loan.professor_id)
      .single();

    if (professorError) {
      console.error('Erro ao buscar dados do professor:', professorError);
      throw professorError;
    }

    const serieNum = parseInt(String(loan.serie || '0'), 10);
    const serie = Number.isNaN(serieNum) ? 0 : Math.max(0, serieNum);
    const turma = (loan.turma && String(loan.turma).trim()) || 'PROF';
    const turno = (loan.turno && String(loan.turno).trim()) || 'PROF';
    const dataNascimento = new Date().toISOString().split('T')[0];
    const anoLetivo = String(new Date().getFullYear());

    const { data: professorAluno, error: professorAlunoError } = await supabase
      .from('alunos')
      .insert({
        nome: professor.nome,
        serie,
        turma,
        turno,
        sexo: 'N/A',
        data_nascimento: dataNascimento,
        escola_id: escolaId ?? undefined,
        ano_letivo: anoLetivo,
      })
      .select()
      .single();

    if (professorAlunoError) {
      console.error('Erro ao criar registro de professor (alunos):', professorAlunoError);
      throw professorAlunoError;
    }

    const uniqueBooksMap = new Map<string, number>();
    books.forEach((entry) => {
      if (!entry.bookId) return;
      const safeQty = Math.max(1, Number(entry.quantity) || 1);
      uniqueBooksMap.set(entry.bookId, safeQty);
    });
    const uniqueBooks = Array.from(uniqueBooksMap.entries()).map(([bookId, quantity]) => ({ bookId, quantity }));

    const loansData = uniqueBooks.map(({ bookId, quantity }) => ({
      livro_id: bookId,
      data_retirada: dateRetirada.toISOString(),
      quantidade_retirada: quantity,
      status: 'Emprestado',
      escola_id: escolaId,
      aluno_id: professorAluno.id,
      professor_id: loan.professor_id,
      serie: String(serie),
      turma,
      turno,
      ano_letivo: anoLetivo
    }));

    const { data, error } = await supabase
      .from('emprestimos')
      .insert(loansData)
      .select();

    if (error) {
      console.error('Erro ao criar empréstimos em lote para professor:', error);
      throw error;
    }

    console.log(`Empréstimos em lote criados com sucesso: ${uniqueBooks.length}`);
    return (data || []) as Loan[];
  } catch (error) {
    console.error('Erro ao criar empréstimos em lote para professor:', error);
    throw error;
  }
};

export const createStudentLoansBatch = async (
  loan: Loan,
  studentLoans: Array<{ studentId: string; bookId: string; quantity: number }>
): Promise<Loan[]> => {
  try {
    if (!studentLoans.length) {
      throw new Error('Nenhum empréstimo de aluno informado para lote');
    }

    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    const dateRetirada = new Date(loan.data_retirada);

    const uniqueMap = new Map<string, { studentId: string; bookId: string; quantity: number }>();
    studentLoans.forEach((entry) => {
      if (!entry.studentId || !entry.bookId) return;
      const key = `${entry.studentId}-${entry.bookId}`;
      const safeQty = Math.max(1, Number(entry.quantity) || 1);
      if (uniqueMap.has(key)) {
        const current = uniqueMap.get(key)!;
        uniqueMap.set(key, { ...current, quantity: current.quantity + safeQty });
      } else {
        uniqueMap.set(key, { studentId: entry.studentId, bookId: entry.bookId, quantity: safeQty });
      }
    });

    const uniqueStudentLoans = Array.from(uniqueMap.values());
    const studentIds = Array.from(new Set(uniqueStudentLoans.map((entry) => entry.studentId)));

    const { data: studentsData, error: studentsError } = await supabase
      .from('alunos')
      .select('id, serie, turma, turno, ano_letivo')
      .in('id', studentIds);

    if (studentsError) {
      console.error('Erro ao buscar alunos para lote:', studentsError);
      throw studentsError;
    }

    const studentMap = new Map(
      (studentsData || []).map((student: any) => [student.id, student])
    );

    const loansData = uniqueStudentLoans.map((entry) => {
      const student = studentMap.get(entry.studentId);
      return {
        livro_id: entry.bookId,
        data_retirada: dateRetirada.toISOString(),
        quantidade_retirada: entry.quantity,
        status: 'Emprestado',
        escola_id: escolaId,
        aluno_id: entry.studentId,
        professor_id: null,
        serie: student?.serie ? String(student.serie) : null,
        turma: student?.turma ?? null,
        turno: student?.turno ?? null,
        ano_letivo: student?.ano_letivo ?? null
      };
    });

    const { data, error } = await supabase
      .from('emprestimos')
      .insert(loansData)
      .select();

    if (error) {
      console.error('Erro ao criar empréstimos em lote para alunos:', error);
      throw error;
    }

    console.log(`Empréstimos de alunos em lote criados com sucesso: ${loansData.length}`);
    return (data || []) as Loan[];
  } catch (error) {
    console.error('Erro ao criar empréstimos em lote para alunos:', error);
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
export const getDashboardStats = async (anoFilter?: string): Promise<{
  totalStudents: number;
  totalBooks: number;
  activeLoans: number;
  totalLoans: number;
  totalStorytellings: number;
  emprestimosPorSerie: Record<string, number>;
  emprestimosPorSerieTurma: Record<string, number>;
  emprestimosPorStatus: Record<string, number>;
  topAlunos: Array<{ nome: string; count: number }>;
  emprestimosPorMes: Record<string, number>;
}> => {
  try {
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    
    // Get all loans with student and book data in batches to avoid Supabase 1000 limit
    let allLoans: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let loansQuery = supabase
        .from('emprestimos')
        .select(`
          *,
          aluno:alunos(*),
          livro:livros(*)
        `)
        .range(from, from + batchSize - 1);
      
      if (escolaId) {
        loansQuery = loansQuery.eq('escola_id', escolaId);
      }
      
      // Apply ano filter on the emprestimos.ano_letivo column if provided
      if (anoFilter) {
        loansQuery = loansQuery.ilike('ano_letivo', `%${anoFilter}%`);
      }
      
      const { data: loans, error: loansError } = await loansQuery;
      
      if (loansError) {
        console.error('Erro ao buscar empréstimos para estatísticas:', loansError);
        throw loansError;
      }

      if (loans && loans.length > 0) {
        allLoans = allLoans.concat(loans);
        from += batchSize;
        hasMore = loans.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    const loans = allLoans;
    
    // Get students count (optionally filtered by ano_letivo)
    let studentsQuery = supabase.from('alunos').select('*', { count: 'exact', head: true });
    if (escolaId) studentsQuery = studentsQuery.eq('escola_id', escolaId);
    if (anoFilter) studentsQuery = studentsQuery.ilike('ano_letivo', `%${anoFilter}%`);
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
    
    // Get storytelling count using dedicated service (apply anoFilter)
    let totalStorytellings = 0;
    try {
      totalStorytellings = await getStorytellingCount(anoFilter);
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

    // Empréstimos por mês (últimos 6 meses)
    const emprestimosPorMes: Record<string, number> = {};
    const mesesAbreviados = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const hoje = new Date();
    
    // Inicializar os últimos 6 meses com zero
    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesKey = `${mesesAbreviados[data.getMonth()]}/${data.getFullYear().toString().slice(-2)}`;
      emprestimosPorMes[mesKey] = 0;
    }
    
    // Contar empréstimos por mês
    loansData.forEach((loan: any) => {
      if (loan.data_retirada) {
        const dataRetirada = new Date(loan.data_retirada);
        const mesKey = `${mesesAbreviados[dataRetirada.getMonth()]}/${dataRetirada.getFullYear().toString().slice(-2)}`;
        
        // Só contar se estiver nos últimos 6 meses
        const mesesAtras = (hoje.getFullYear() - dataRetirada.getFullYear()) * 12 + (hoje.getMonth() - dataRetirada.getMonth());
        if (mesesAtras >= 0 && mesesAtras < 6) {
          emprestimosPorMes[mesKey] = (emprestimosPorMes[mesKey] || 0) + 1;
        }
      }
    });
    
    return {
      totalStudents: totalStudents || 0,
      totalBooks: totalBooks || 0,
      activeLoans,
      totalLoans,
      totalStorytellings: totalStorytellings || 0,
      emprestimosPorSerie,
      emprestimosPorSerieTurma,
      emprestimosPorStatus,
      topAlunos,
      emprestimosPorMes
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas do dashboard:', error);
    throw error;
  }
};
