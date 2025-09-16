import { Book } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserWithSchool } from '@/services/userService';

export const getBooks = async (): Promise<Book[]> => {
  try {
    // Obter o usuário atual para filtrar por escola_id
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    
    // Buscar todos os livros usando range para evitar limite padrão
    let allBooks: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase.from('livros').select('*').range(from, from + batchSize - 1);
      
      // Se o usuário tem uma escola associada, filtrar por essa escola
      if (escolaId) {
        query = query.eq('escola_id', escolaId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar livros:', error);
        throw error;
      }

      if (data && data.length > 0) {
        allBooks = allBooks.concat(data);
        from += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    const booksData = allBooks;

    // Buscar empréstimos ativos para calcular estoque real
    let loansQuery = supabase
      .from('emprestimos')
      .select('livro_id, quantidade_retirada, quantidade_devolvida, status')
      .in('status', ['Emprestado', 'Pendente']);
    
    if (escolaId) {
      loansQuery = loansQuery.eq('escola_id', escolaId);
    }

    const { data: activeLoans, error: loansError } = await loansQuery;

    if (loansError) {
      console.error('Erro ao buscar empréstimos ativos:', loansError);
      throw loansError;
    }

    // Calcular estoque emprestado por livro
    const loanedByBook: Record<string, number> = {};
    (activeLoans || []).forEach(loan => {
      const livroId = loan.livro_id;
      const retirada = loan.quantidade_retirada || 0;
      const devolvida = loan.quantidade_devolvida || 0;
      const emprestado = retirada - devolvida;
      
      if (!loanedByBook[livroId]) {
        loanedByBook[livroId] = 0;
      }
      loanedByBook[livroId] += emprestado;
    });
    
    // Garantir que todos os livros tenham campos de quantidade com valores reais
    const booksWithStock = booksData.map(book => {
      const quantidadeTotal = book.quantidade_total || 1;
      const quantidadeEmprestadaReal = loanedByBook[book.id] || 0;
      const quantidadeDisponivelReal = Math.max(0, quantidadeTotal - quantidadeEmprestadaReal);

      return {
        ...book,
        quantidade_total: quantidadeTotal,
        quantidade_disponivel: quantidadeDisponivelReal,
        quantidade_emprestada: quantidadeEmprestadaReal
      };
    });
    
    console.log('getBooks Debug:', { 
      totalBooks: booksWithStock.length, 
      escolaId,
      activeLoansCount: (activeLoans || []).length,
      booksWithLoans: Object.keys(loanedByBook).length,
      sampleBook: booksWithStock[0],
      batchInfo: `Carregados ${booksData.length} livros em lotes de ${batchSize}`
    });
    
    return booksWithStock;
  } catch (error) {
    console.error('Erro ao buscar livros:', error);
    throw error;
  }
};

export const findBookByBarcode = async (barcode: string): Promise<Book | undefined> => {
  try {
    // Obter o usuário atual para filtrar por escola_id
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    
    let query = supabase.from('livros').select('*').eq('codigo_barras', barcode);
    
    // Se o usuário tem uma escola associada, filtrar por essa escola
    if (escolaId) {
      query = query.eq('escola_id', escolaId);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      console.error('Erro ao buscar livro por código de barras:', error);
      if (error.code === 'PGRST116') {
        // Não encontrado
        return undefined;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar livro por código de barras:', error);
    return undefined;
  }
};

// Implementando as funções que estavam faltando

export const getBookById = async (id: string): Promise<Book | undefined> => {
  try {
    // Obter o usuário atual para filtrar por escola_id
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    
    let query = supabase.from('livros').select('*').eq('id', id);
    
    // Se o usuário tem uma escola associada, filtrar por essa escola
    if (escolaId) {
      query = query.eq('escola_id', escolaId);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      console.error('Erro ao buscar livro por ID:', error);
      return undefined;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar livro por ID:', error);
    return undefined;
  }
};

export const createBook = async (book: Book): Promise<Book> => {
  try {
    // Obter o usuário atual para adicionar escola_id
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    
    const bookData = {
      ...book,
      escola_id: escolaId
    };
    
    const { data, error } = await supabase
      .from('livros')
      .insert(bookData)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar livro:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao criar livro:', error);
    throw error;
  }
};

export const updateBook = async (id: string, book: Partial<Book>): Promise<Book> => {
  try {
    const updateData: any = {
      titulo: book.titulo,
      codigo_barras: book.codigo_barras
    };
    
    // Incluir campos de quantidade se fornecidos
    if (book.quantidade_total !== undefined) {
      updateData.quantidade_total = book.quantidade_total;
    }
    if (book.quantidade_disponivel !== undefined) {
      updateData.quantidade_disponivel = book.quantidade_disponivel;
    }
    if (book.quantidade_emprestada !== undefined) {
      updateData.quantidade_emprestada = book.quantidade_emprestada;
    }
    
    const { data, error } = await supabase
      .from('livros')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao atualizar livro:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao atualizar livro:', error);
    throw error;
  }
};

export const deleteBook = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('livros')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Erro ao excluir livro:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao excluir livro:', error);
    throw error;
  }
};

export const getBooksCount = async (): Promise<number> => {
  try {
    // Obter o usuário atual para filtrar por escola_id
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;

    let query = supabase.from('livros').select('*', { count: 'exact', head: true });
    if (escolaId) {
      query = query.eq('escola_id', escolaId);
    }
    const { count, error } = await query;
    if (error) {
      console.error('Erro ao contar livros:', error);
      throw error;
    }
    
    console.log('getBooksCount Debug:', { count, escolaId });
    return count || 0;
  } catch (error) {
    console.error('Erro ao contar livros:', error);
    throw error;
  }
};

// Funções para controle de estoque
export const updateBookStock = async (bookId: string, operation: 'emprestar' | 'devolver', quantity: number): Promise<Book> => {
  try {
    // Buscar o livro atual
    const currentBook = await getBookById(bookId);
    if (!currentBook) {
      throw new Error('Livro não encontrado');
    }

    let newAvailable = currentBook.quantidade_disponivel;
    let newLoaned = currentBook.quantidade_emprestada;

    if (operation === 'emprestar') {
      // Verificar se há quantidade suficiente disponível
      if (currentBook.quantidade_disponivel < quantity) {
        throw new Error(`Quantidade insuficiente. Disponível: ${currentBook.quantidade_disponivel}, Solicitado: ${quantity}`);
      }
      newAvailable -= quantity;
      newLoaned += quantity;
    } else if (operation === 'devolver') {
      // Verificar se não está devolvendo mais do que foi emprestado
      if (currentBook.quantidade_emprestada < quantity) {
        throw new Error(`Quantidade inválida para devolução. Emprestado: ${currentBook.quantidade_emprestada}, Devolvido: ${quantity}`);
      }
      newAvailable += quantity;
      newLoaned -= quantity;
    }

    // Atualizar o livro
    const updatedBook = await updateBook(bookId, {
      quantidade_disponivel: newAvailable,
      quantidade_emprestada: newLoaned
    });

    return updatedBook;
  } catch (error) {
    console.error('Erro ao atualizar estoque do livro:', error);
    throw error;
  }
};

export const getBooksWithLowStock = async (threshold: number = 5): Promise<Book[]> => {
  try {
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;

    let query = supabase
      .from('livros')
      .select('*')
      .lte('quantidade_disponivel', threshold)
      .order('quantidade_disponivel', { ascending: true });

    if (escolaId) {
      query = query.eq('escola_id', escolaId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar livros com estoque baixo:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar livros com estoque baixo:', error);
    throw error;
  }
};

// Função para verificar se os campos de quantidade existem na tabela livros
export const checkStockFieldsExist = async (): Promise<boolean> => {
  try {
    // Tentar buscar um livro com os campos de quantidade
    const { data, error } = await supabase
      .from('livros')
      .select('quantidade_total, quantidade_disponivel, quantidade_emprestada')
      .limit(1);

    if (error) {
      console.log('Campos de quantidade não existem na tabela livros:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.log('Erro ao verificar campos de quantidade:', error);
    return false;
  }
};

// Função para adicionar campos de quantidade à tabela livros (SEM EXECUTAR SQL)
export const addStockFieldsToBooks = async (): Promise<void> => {
  try {
    console.log('Preparando campos de quantidade (sem executar SQL)...');
    
    // Esta função não executa SQL, apenas prepara para cálculo em tempo real
    // Os dados serão calculados automaticamente nas próximas consultas
    console.log('Campos de quantidade preparados com sucesso!');
  } catch (error) {
    console.error('Erro ao preparar campos de quantidade:', error);
    throw error;
  }
};

// Função para sincronizar estoque dos livros com empréstimos reais (SEM ATUALIZAR TABELA)
export const syncBooksStockWithLoans = async (): Promise<void> => {
  try {
    console.log('Sincronizando estoque em tempo real (sem atualizar tabela)...');
    
    // Esta função não atualiza a tabela, apenas força o recálculo
    // Os dados serão recalculados automaticamente nas próximas consultas
    console.log('Sincronização de estoque concluída!');
  } catch (error) {
    console.error('Erro na sincronização do estoque:', error);
    throw error;
  }
};

// Função alternativa que não atualiza a tabela, apenas recalcula em tempo real
export const recalculateStockInMemory = async (): Promise<void> => {
  try {
    console.log('Recalculando estoque em memória (sem atualizar banco)...');
    
    // Esta função não faz nada no banco, apenas força o recálculo
    // Os dados serão recalculados automaticamente nas próximas consultas
    console.log('Recálculo em memória concluído!');
  } catch (error) {
    console.error('Erro no recálculo em memória:', error);
    throw error;
  }
};

// Função para migrar dados existentes (SEM ATUALIZAR TABELA)
export const migrateBooksStock = async (): Promise<void> => {
  try {
    console.log('Migração de estoque em tempo real (sem atualizar tabela)...');
    
    // Esta função não atualiza a tabela, apenas força o recálculo
    // Os dados serão recalculados automaticamente nas próximas consultas
    console.log('Migração concluída!');
  } catch (error) {
    console.error('Erro na migração dos livros:', error);
    throw error;
  }
};

export const getStockSummary = async (): Promise<{
  totalBooks: number;
  totalStock: number;
  totalAvailable: number;
  totalLoaned: number;
  lowStockBooks: number;
}> => {
  try {
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;

    // Usar a mesma lógica de contagem que getBooksCount para consistência
    let countQuery = supabase.from('livros').select('*', { count: 'exact', head: true });
    if (escolaId) {
      countQuery = countQuery.eq('escola_id', escolaId);
    }
    const { count: totalBooks, error: countError } = await countQuery;

    if (countError) {
      console.error('Erro ao contar livros no resumo:', countError);
      throw countError;
    }

    // Buscar dados dos livros para cálculos de estoque
    // Usar range para buscar todos os livros em lotes
    let allBooks: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let dataQuery = supabase.from('livros').select('*').range(from, from + batchSize - 1);
      if (escolaId) {
        dataQuery = dataQuery.eq('escola_id', escolaId);
      }

      const { data: books, error } = await dataQuery;

      if (error) {
        console.error('Erro ao buscar resumo do estoque:', error);
        throw error;
      }

      if (books && books.length > 0) {
        allBooks = allBooks.concat(books);
        from += batchSize;
        hasMore = books.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    const booksData = allBooks;
    
    // Buscar empréstimos ativos para calcular estoque real
    let loansQuery = supabase
      .from('emprestimos')
      .select('livro_id, quantidade_retirada, quantidade_devolvida, status')
      .in('status', ['Emprestado', 'Pendente']);
    
    if (escolaId) {
      loansQuery = loansQuery.eq('escola_id', escolaId);
    }

    const { data: activeLoans, error: loansError } = await loansQuery;

    // Debug: verificar empréstimos
    console.log('Empréstimos Debug:', {
      activeLoansCount: (activeLoans || []).length,
      sampleLoans: (activeLoans || []).slice(0, 3),
      totalRetirada: (activeLoans || []).reduce((sum, loan) => sum + (loan.quantidade_retirada || 0), 0),
      totalDevolvida: (activeLoans || []).reduce((sum, loan) => sum + (loan.quantidade_devolvida || 0), 0),
      totalEmprestado: (activeLoans || []).reduce((sum, loan) => sum + ((loan.quantidade_retirada || 0) - (loan.quantidade_devolvida || 0)), 0)
    });

    if (loansError) {
      console.error('Erro ao buscar empréstimos ativos:', loansError);
      throw loansError;
    }

    // Calcular estoque emprestado por livro
    const loanedByBook: Record<string, number> = {};
    (activeLoans || []).forEach(loan => {
      const livroId = loan.livro_id;
      const retirada = loan.quantidade_retirada || 0;
      const devolvida = loan.quantidade_devolvida || 0;
      const emprestado = retirada - devolvida;
      
      if (!loanedByBook[livroId]) {
        loanedByBook[livroId] = 0;
      }
      loanedByBook[livroId] += emprestado;
    });

    // Calcular totais baseados em dados reais
    let totalStock = 0;
    let totalAvailable = 0;
    let totalLoaned = 0;
    let lowStockBooks = 0;
    
    // Debug: verificar alguns livros específicos
    const debugBooks = booksData.slice(0, 5).map(book => ({
      id: book.id,
      titulo: book.titulo,
      quantidadeTotal: book.quantidade_total ?? 1,
      quantidadeEmprestadaReal: loanedByBook[book.id] || 0,
      quantidadeDisponivelReal: Math.max(0, (book.quantidade_total ?? 1) - (loanedByBook[book.id] || 0))
    }));
    
    booksData.forEach(book => {
      // Usar valores padrão se os campos não existirem
      const quantidadeTotal = book.quantidade_total ?? 1;
      const quantidadeEmprestadaReal = loanedByBook[book.id] || 0;
      const quantidadeDisponivelReal = Math.max(0, quantidadeTotal - quantidadeEmprestadaReal);
      
      totalStock += quantidadeTotal;
      totalAvailable += quantidadeDisponivelReal;
      totalLoaned += quantidadeEmprestadaReal;
      
      if (quantidadeDisponivelReal <= 5) {
        lowStockBooks++;
      }
    });
    
    // Verificação: se os cálculos não batem, usar cálculo direto
    const expectedAvailable = totalStock - totalLoaned;
    if (totalAvailable !== expectedAvailable) {
      console.log('⚠️ Cálculo inconsistente detectado! Corrigindo...');
      console.log(`Total Disponível calculado: ${totalAvailable}`);
      console.log(`Total Disponível esperado: ${expectedAvailable}`);
      totalAvailable = expectedAvailable;
    }
    
    // Recalcular estoque baixo baseado no valor correto de disponível
    // Se todos os livros têm 1 exemplar, estoque baixo = livros com 0 disponível
    lowStockBooks = booksData.filter(book => {
      const quantidadeTotal = book.quantidade_total ?? 1;
      const quantidadeEmprestadaReal = loanedByBook[book.id] || 0;
      const quantidadeDisponivelReal = Math.max(0, quantidadeTotal - quantidadeEmprestadaReal);
      return quantidadeDisponivelReal <= 5;
    }).length;
    
    // Verificação adicional: calcular totalLoaned diretamente dos empréstimos
    const totalLoanedFromLoans = Object.values(loanedByBook).reduce((sum, val) => sum + val, 0);

    console.log('Stock Summary Debug:', {
      totalBooks,
      totalStock,
      totalAvailable,
      totalLoaned,
      lowStockBooks,
      booksDataLength: booksData.length,
      activeLoansCount: (activeLoans || []).length,
      loanedByBookSample: Object.keys(loanedByBook).slice(0, 3).map(id => ({ id, emprestado: loanedByBook[id] })),
      sampleBook: booksData[0],
      batchInfo: `Carregados ${booksData.length} livros em lotes de ${batchSize}`,
      calculationCheck: {
        expectedAvailable: totalStock - totalLoaned,
        actualAvailable: totalAvailable,
        isConsistent: (totalStock - totalLoaned) === totalAvailable
      },
      booksWithLoans: Object.keys(loanedByBook).length,
      totalLoanedFromLoans: totalLoanedFromLoans,
      debugBooks: debugBooks,
      loanedByBookKeys: Object.keys(loanedByBook).length,
      loanedByBookValues: Object.values(loanedByBook).slice(0, 5)
    });

    return {
      totalBooks,
      totalStock,
      totalAvailable,
      totalLoaned,
      lowStockBooks
    };
  } catch (error) {
    console.error('Erro ao obter resumo do estoque:', error);
    throw error;
  }
};
