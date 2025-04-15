
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ReturnForm from '@/components/loans/ReturnForm';
import { returnLoan, getLoanById } from '@/services/loanService';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Loans from '../loans/Loans';
import { Loan } from '@/types';

export default function Returns() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(
    location.state?.loanId || null
  );
  
  const [activeTab, setActiveTab] = useState<string>(
    location.state?.loanId ? 'return-form' : 'loans-list'
  );

  const handleSubmit = async (
    loanId: string,
    returnData: { data_devolucao: string; quantidade_devolvida: number }
  ) => {
    try {
      setIsSubmitting(true);
      
      // Get current loan to check if this is a partial return
      const currentLoan = await getLoanById(loanId);
      if (!currentLoan) {
        throw new Error('Empréstimo não encontrado');
      }
      
      // We need to use the total already returned (if any) plus the current return amount
      const quantidadeAtualmenteDevolvida = currentLoan.quantidade_devolvida || 0;
      const novaQuantidadeDevolvida = returnData.quantidade_devolvida;
      
      // Register the return
      const result = await returnLoan(loanId, {
        data_devolucao: returnData.data_devolucao,
        quantidade_devolvida: novaQuantidadeDevolvida
      });
      
      if (result.status === 'Pendente') {
        const pendingCount = result.quantidade_retirada - (result.quantidade_devolvida || 0);
        toast.success(`Devolução parcial registrada com sucesso! Ainda existem ${pendingCount} itens pendentes.`);
      } else {
        toast.success('Devolução total registrada com sucesso!');
      }
      
      navigate('/loans');
    } catch (error) {
      console.error('Failed to register return:', error);
      toast.error('Erro ao registrar devolução');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle when a loan is selected from the loans list for return
  const handleLoanSelect = (loan: Loan) => {
    setSelectedLoanId(loan.id);
    setActiveTab('return-form');
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Devoluções</h1>
        <p className="text-muted-foreground">
          Registre a devolução de um livro emprestado.
        </p>

        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
        >
          <TabsList>
            <TabsTrigger value="return-form">Formulário de Devolução</TabsTrigger>
            <TabsTrigger value="loans-list">Lista de Empréstimos</TabsTrigger>
          </TabsList>
          <TabsContent value="return-form" className="pt-4">
            <ReturnForm
              onSubmit={handleSubmit}
              onCancel={() => navigate('/loans')}
              isSubmitting={isSubmitting}
              initialLoanId={selectedLoanId}
            />
          </TabsContent>
          <TabsContent value="loans-list">
            <Loans 
              returnMode={true}
              onSelectLoanForReturn={handleLoanSelect}
              standalone={false}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
