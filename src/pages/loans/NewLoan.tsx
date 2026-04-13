import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoanForm, { LoanFormSubmitPayload } from '@/components/loans/LoanForm';
import { Loan } from '@/types';
import { createLoan, createProfessorLoansBatch, createStudentLoansBatch } from '@/services/loanService';
import { toast } from 'sonner';

export default function NewLoan() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async ({ loan, selectedBooks, selectedStudentLoans }: LoanFormSubmitPayload) => {
    try {
      setIsSubmitting(true);
      
      // Validate required fields
      if (!selectedStudentLoans?.length && !loan.livro_id) {
        toast.error('Selecione um livro');
        return;
      }
      
      if (!selectedStudentLoans?.length && !loan.aluno_id && !loan.professor_id) {
        toast.error('Selecione um aluno ou professor');
        return;
      }
      
      if (!loan.data_retirada) {
        toast.error('Data de retirada é obrigatória');
        return;
      }
      
      if (!loan.quantidade_retirada || loan.quantidade_retirada < 1) {
        toast.error('Quantidade deve ser maior que zero');
        return;
      }
      
      // Ensure status is set
      const loanData: Loan = {
        ...loan,
        status: 'Emprestado' as const
      };

      if (selectedStudentLoans && selectedStudentLoans.length > 0) {
        await createStudentLoansBatch(loanData, selectedStudentLoans);
        toast.success(`${selectedStudentLoans.length} empréstimos de alunos registrados com sucesso!`);
      } else if (loanData.professor_id && selectedBooks && selectedBooks.length > 0) {
        await createProfessorLoansBatch(loanData, selectedBooks);
        toast.success(`${selectedBooks.length} empréstimos registrados com sucesso!`);
      } else {
        await createLoan(loanData);
        toast.success('Empréstimo registrado com sucesso!');
      }
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
