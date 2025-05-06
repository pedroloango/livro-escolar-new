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
      
      // Validate required fields
      if (!data.livro_id) {
        toast.error('Selecione um livro');
        return;
      }
      
      if (!data.aluno_id && !data.professor_id) {
        toast.error('Selecione um aluno ou professor');
        return;
      }
      
      if (!data.data_retirada) {
        toast.error('Data de retirada é obrigatória');
        return;
      }
      
      if (!data.quantidade_retirada || data.quantidade_retirada < 1) {
        toast.error('Quantidade deve ser maior que zero');
        return;
      }
      
      // Ensure status is set
      const loanData: Loan = {
        ...data,
        status: 'Emprestado' as const
      };
      
      await createLoan(loanData);
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
