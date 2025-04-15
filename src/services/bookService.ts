
import { Book } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserWithSchool } from '@/services/userService';

export const getBooks = async (): Promise<Book[]> => {
  try {
    // Obter o usuário atual para filtrar por escola_id
    const currentUser = await getCurrentUserWithSchool();
    const escolaId = currentUser?.profile?.escola_id;
    
    // Create a query
    let query = supabase.from('livros').select('*');
    
    // Se o usuário tem uma escola associada, filtrar por essa escola
    if (escolaId) {
      query = query.eq('escola_id', escolaId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar livros:', error);
      throw error;
    }
    
    return data || [];
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
    const { data, error } = await supabase
      .from('livros')
      .update({
        titulo: book.titulo,
        codigo_barras: book.codigo_barras
      })
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
