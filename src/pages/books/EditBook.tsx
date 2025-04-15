
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BookForm from '@/components/books/BookForm';
import { Book } from '@/types';
import { getBookById, updateBook } from '@/services/bookService';
import { toast } from 'sonner';

export default function EditBook() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        if (!id) return;
        const data = await getBookById(id);
        if (data) {
          setBook(data);
        } else {
          toast.error('Livro não encontrado');
          navigate('/books');
        }
      } catch (error) {
        console.error('Failed to fetch book:', error);
        toast.error('Erro ao carregar dados do livro');
        navigate('/books');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBook();
  }, [id, navigate]);

  const handleSubmit = async (data: Book) => {
    try {
      setIsSubmitting(true);
      if (!id) return;
      await updateBook(id, data);
      toast.success('Livro atualizado com sucesso!');
      navigate('/books');
    } catch (error) {
      console.error('Failed to update book:', error);
      toast.error('Erro ao atualizar livro');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Editar Livro</h1>
        <p className="text-muted-foreground">
          Atualize os dados do livro conforme necessário.
        </p>

        {book && (
          <BookForm
            initialData={book}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/books')}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
