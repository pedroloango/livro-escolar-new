
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoanForm from '@/components/loans/LoanForm';
import { Loan } from '@/types';
import { createLoan } from '@/services/loanService';
import { toast } from 'sonner';

export default function NewLoan() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: Loan) => {
    try {
      setIsSubmitting(true);
      await createLoan(data);
      toast.success('Empréstimo registrado com sucesso!');
      navigate('/loans');
    } catch (error) {
      console.error('Failed to create loan:', error);
      toast.error('Erro ao registrar empréstimo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Registrar Novo Empréstimo</h1>
        <p className="text-muted-foreground">
          Selecione o aluno, o livro e preencha os dados do empréstimo.
        </p>

        <LoanForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/loans')}
          isSubmitting={isSubmitting}
        />
      </div>
    </DashboardLayout>
  );
}
