
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BookForm from '@/components/books/BookForm';
import { Book } from '@/types';
import { createBook } from '@/services/bookService';
import { toast } from 'sonner';

export default function NewBook() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: Book) => {
    try {
      setIsSubmitting(true);
      await createBook(data);
      toast.success('Livro cadastrado com sucesso!');
      navigate('/books');
    } catch (error) {
      console.error('Failed to create book:', error);
      toast.error('Erro ao cadastrar livro');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Cadastrar Novo Livro</h1>
        <p className="text-muted-foreground">
          Preencha os dados do livro para cadastrá-lo no sistema.
        </p>

        <BookForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/books')}
          isSubmitting={isSubmitting}
        />
      </div>
    </DashboardLayout>
  );
}
