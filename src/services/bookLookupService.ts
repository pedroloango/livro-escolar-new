
import { toast } from 'sonner';

interface BookInfo {
  title?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
}

// Look up book information by ISBN using Google Books API
export const lookupBookByIsbn = async (isbn: string): Promise<BookInfo | null> => {
  try {
    // Clean ISBN - remove any non-numeric characters except X
    const cleanIsbn = isbn.replace(/[^\dX]/g, '');
    
    if (!cleanIsbn) {
      return null;
    }
    
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
    
    if (!response.ok) {
      throw new Error('Falha na busca do livro');
    }
    
    const data = await response.json();
    
    // Check if any books were found
    if (data.totalItems === 0 || !data.items || data.items.length === 0) {
      return null;
    }
    
    // Extract the relevant information from the first book found
    const book = data.items[0].volumeInfo;
    
    return {
      title: book.title,
      authors: book.authors,
      publisher: book.publisher,
      publishedDate: book.publishedDate,
      description: book.description
    };
  } catch (error) {
    console.error('Erro ao buscar informações do livro:', error);
    toast.error('Erro ao buscar informações do livro');
    return null;
  }
};
