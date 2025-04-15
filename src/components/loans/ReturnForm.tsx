import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loan } from '@/types';
import { getActiveLoans, getLoanById } from '@/services/loanService';
import { findBookByBarcode } from '@/services/bookService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { Barcode } from 'lucide-react';
import { toast } from 'sonner';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import { formatDateForInput } from '@/utils/download';

interface ReturnFormProps {
  onSubmit: (loanId: string, returnData: { data_devolucao: string, quantidade_devolvida: number }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  initialLoanId?: string | null;
}

export default function ReturnForm({ onSubmit, onCancel, isSubmitting, initialLoanId = null }: ReturnFormProps) {
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [maxDevolvida, setMaxDevolvida] = useState<number>(1);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm({
    defaultValues: {
      loanId: initialLoanId || '',
      data_devolucao: formatDateForInput(new Date()),
      quantidade_devolvida: 1
    }
  });

  const watchLoanId = watch('loanId');
  const watchQuantidadeDevolvida = watch('quantidade_devolvida');

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const loans = await getActiveLoans();
        setActiveLoans(loans);
        
        if (initialLoanId) {
          setValue('loanId', initialLoanId);
          const loan = await getLoanById(initialLoanId);
          if (loan) {
            setSelectedLoan(loan);
            const remaining = loan.quantidade_retirada - (loan.quantidade_devolvida || 0);
            setMaxDevolvida(Math.max(loan.quantidade_retirada, loan.quantidade_devolvida || 0));
            setValue('quantidade_devolvida', loan.quantidade_retirada);
          }
        }
      } catch (error) {
        console.error('Failed to load active loans:', error);
        toast.error('Erro ao carregar empréstimos ativos');
      } finally {
        setLoading(false);
      }
    };

    fetchLoans();
  }, [initialLoanId, setValue]);

  useEffect(() => {
    if (watchLoanId) {
      const loan = activeLoans.find(loan => loan.id === watchLoanId);
      setSelectedLoan(loan || null);
      
      if (loan) {
        const remaining = loan.quantidade_retirada - (loan.quantidade_devolvida || 0);
        setMaxDevolvida(Math.max(loan.quantidade_retirada, loan.quantidade_devolvida || 0));
        setValue('quantidade_devolvida', loan.quantidade_retirada);
      }
    } else {
      setSelectedLoan(null);
      setMaxDevolvida(1);
    }
  }, [watchLoanId, activeLoans, setValue]);

  const onFormSubmit = (data: { loanId: string, data_devolucao: string, quantidade_devolvida: number }) => {
    if (!selectedLoan) return;
    
    onSubmit(data.loanId, {
      data_devolucao: data.data_devolucao,
      quantidade_devolvida: data.quantidade_devolvida
    });
  };

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const book = await findBookByBarcode(barcode);
      
      if (book && book.id) {
        const loansOfThisBook = activeLoans.filter(loan => loan.livro_id === book.id);
        
        if (loansOfThisBook.length === 0) {
          toast.error('Nenhum empréstimo ativo encontrado para este livro');
          return;
        }
        
        if (loansOfThisBook.length === 1) {
          setValue('loanId', loansOfThisBook[0].id || '');
          toast.success(`Empréstimo encontrado: ${loansOfThisBook[0].aluno?.nome} - ${book.titulo}`);
        } 
        else {
          toast.info(`Encontrados ${loansOfThisBook.length} empréstimos para este livro. Selecione um.`);
        }
      } else {
        toast.error('Livro não encontrado com este código de barras');
      }
    } catch (error) {
      console.error('Error finding loan by book barcode:', error);
      toast.error('Erro ao buscar empréstimo por código de barras');
    }
  };

  const calcularPendentes = () => {
    if (!selectedLoan) return 0;
    
    const quantidadeTotal = selectedLoan.quantidade_retirada;
    const quantidadeJaDevolvida = selectedLoan.quantidade_devolvida || 0;
    const quantidadeAtualDevolvida = Number(watchQuantidadeDevolvida) || 0;
    
    const pendentes = quantidadeTotal - quantidadeJaDevolvida - quantidadeAtualDevolvida;
    return Math.max(0, pendentes);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Registrar Devolução</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loanId">Empréstimo</Label>
            <div className="flex space-x-2">
              <div className="flex-1">
                <Select
                  value={watchLoanId}
                  onValueChange={(value) => setValue('loanId', value)}
                >
                  <SelectTrigger id="loanId">
                    <SelectValue placeholder="Selecione um empréstimo ativo" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLoans.map((loan) => (
                      <SelectItem key={loan.id} value={loan.id || ''}>
                        {loan.aluno?.nome} - {loan.livro?.titulo} ({format(parseISO(loan.data_retirada), 'dd/MM/yyyy')})
                        {loan.status === 'Pendente' ? ` ⚠️ Pendente (${loan.quantidade_retirada - (loan.quantidade_devolvida || 0)} restantes)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                onClick={() => setIsScannerOpen(true)}
              >
                <Barcode className="h-5 w-5" />
              </Button>
            </div>
            {errors.loanId && <p className="text-red-500 text-sm">{errors.loanId.message}</p>}
          </div>

          {selectedLoan && (
            <div className="bg-muted p-4 rounded-md">
              <h3 className="font-medium mb-2">Detalhes do Empréstimo</h3>
              <p><span className="font-medium">Aluno:</span> {selectedLoan.aluno?.nome}</p>
              <p><span className="font-medium">Livro:</span> {selectedLoan.livro?.titulo}</p>
              <p><span className="font-medium">Data de Retirada:</span> {format(parseISO(selectedLoan.data_retirada), 'dd/MM/yyyy')}</p>
              <p><span className="font-medium">Quantidade Total:</span> {selectedLoan.quantidade_retirada}</p>
              
              {selectedLoan.status === 'Pendente' && selectedLoan.quantidade_devolvida && (
                <p><span className="font-medium">Já Devolvidos:</span> {selectedLoan.quantidade_devolvida}</p>
              )}
              
              {selectedLoan.status === 'Pendente' && (
                <p>
                  <span className="font-medium">Restantes para devolução:</span>{" "}
                  <span className="text-amber-500 font-medium">
                    {selectedLoan.quantidade_retirada - (selectedLoan.quantidade_devolvida || 0)}
                  </span>
                </p>
              )}
              
              {selectedLoan.status === 'Pendente' && (
                <p><span className="font-medium">Status:</span> <span className="text-amber-500 font-medium">Pendente</span></p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_devolucao">Data de Devolução</Label>
              <Input
                id="data_devolucao"
                type="date"
                {...register('data_devolucao', { required: 'Data de devolução é obrigatória' })}
                className={errors.data_devolucao ? 'border-red-500' : ''}
              />
              {errors.data_devolucao && (
                <p className="text-red-500 text-sm">{errors.data_devolucao.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade_devolvida">Quantidade Devolvida</Label>
              <Input
                id="quantidade_devolvida"
                type="number"
                min="1"
                max={selectedLoan ? selectedLoan.quantidade_retirada : 1}
                {...register('quantidade_devolvida', { 
                  required: 'Quantidade é obrigatória',
                  min: { value: 1, message: 'Mínimo de 1 livro' },
                  max: { 
                    value: selectedLoan ? selectedLoan.quantidade_retirada : 1, 
                    message: `Excede a quantidade total emprestada` 
                  },
                  valueAsNumber: true
                })}
                className={errors.quantidade_devolvida ? 'border-red-500' : ''}
              />
              {errors.quantidade_devolvida && (
                <p className="text-red-500 text-sm">{errors.quantidade_devolvida.message}</p>
              )}
            </div>
          </div>
          
          {selectedLoan && selectedLoan.status === 'Pendente' && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
              <p className="text-amber-700">
                <span className="font-medium">Para concluir a devolução:</span> Selecione {selectedLoan.quantidade_retirada} na quantidade devolvida para registrar devolução total.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel} type="button">
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedLoan}>
            {isSubmitting ? 'Processando...' : 'Registrar Devolução'}
          </Button>
        </CardFooter>
      </form>

      <BarcodeScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
      />
    </Card>
  );
}
