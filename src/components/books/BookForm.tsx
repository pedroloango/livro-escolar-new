
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Book } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Barcode, AlertTriangle } from 'lucide-react';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import { getPendingLoansForBook, checkStockFieldsExist } from '@/services/bookService';

interface BookFormProps {
  initialData?: Book;
  onSubmit: (data: Book) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function BookForm({ initialData, onSubmit, onCancel, isSubmitting }: BookFormProps) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<Book>({
    defaultValues: initialData || {
      titulo: '',
      codigo_barras: '',
      quantidade_total: 1,
      quantidade_disponivel: 1,
      quantidade_emprestada: 0
    }
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [quantidadePendente, setQuantidadePendente] = useState(0);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [showQuantityFields, setShowQuantityFields] = useState(false);

  const quantidadeTotal = watch('quantidade_total');

  // Verificar se os campos de quantidade existem no banco
  useEffect(() => {
    const checkFields = async () => {
      const fieldsExist = await checkStockFieldsExist();
      setShowQuantityFields(fieldsExist);
      console.log('BookForm Debug - Campos de quantidade existem:', fieldsExist);
    };
    
    checkFields();
  }, []);

  // Buscar quantidade pendente quando o componente carrega ou quando é edição
  useEffect(() => {
    const fetchPendingLoans = async () => {
      if (initialData?.id) {
        setIsLoadingPending(true);
        try {
          const { quantidadePendente } = await getPendingLoansForBook(initialData.id);
          setQuantidadePendente(quantidadePendente);
        } catch (error) {
          console.error('Erro ao buscar empréstimos pendentes:', error);
        } finally {
          setIsLoadingPending(false);
        }
      }
    };

    fetchPendingLoans();
  }, [initialData?.id]);

  const handleBarcodeScan = (barcode: string) => {
    setValue('codigo_barras', barcode);
  };

  const handleFormSubmit = (data: Book) => {
    console.log('BookForm Debug - handleFormSubmit:', { 
      data, 
      quantidadePendente, 
      showQuantityFields,
      validation: showQuantityFields && data.quantidade_total < quantidadePendente 
    });
    
    // Validação: quantidade total não pode ser menor que quantidade pendente (apenas se os campos existirem)
    if (showQuantityFields && data.quantidade_total < quantidadePendente) {
      console.log('BookForm Debug - Validação falhou:', {
        quantidadeTotal: data.quantidade_total,
        quantidadePendente,
        message: `A quantidade total não pode ser menor que ${quantidadePendente} (quantidade de livros pendentes).`
      });
      alert(`A quantidade total não pode ser menor que ${quantidadePendente} (quantidade de livros pendentes).`);
      return;
    }
    
    console.log('BookForm Debug - Validação passou, chamando onSubmit');
    onSubmit(data);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{initialData ? 'Editar Livro' : 'Novo Livro'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título do Livro</Label>
            <Input
              id="titulo"
              placeholder="Digite o título do livro"
              {...register('titulo', { required: 'Título é obrigatório' })}
              className={errors.titulo ? 'border-red-500' : ''}
            />
            {errors.titulo && <p className="text-red-500 text-sm">{errors.titulo.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="codigo_barras">Código de Barras</Label>
            <div className="flex space-x-2">
              <Input
                id="codigo_barras"
                placeholder="Digite ou escaneie o código de barras"
                {...register('codigo_barras', { required: 'Código de barras é obrigatório' })}
                className={errors.codigo_barras ? 'border-red-500' : ''}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                onClick={() => setIsScannerOpen(true)}
              >
                <Barcode className="h-5 w-5" />
              </Button>
            </div>
            {errors.codigo_barras && (
              <p className="text-red-500 text-sm">{errors.codigo_barras.message}</p>
            )}
          </div>

          {/* Exibir quantidade pendente se for edição */}
          {initialData?.id && (
            <div className="space-y-2">
              {isLoadingPending ? (
                <div className="text-sm text-gray-500">Carregando informações de empréstimos...</div>
              ) : quantidadePendente > 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Atenção:</strong> Este livro possui <strong>{quantidadePendente}</strong> exemplar(es) com status "Pendente" (emprestados mas não devolvidos).
                    A quantidade total não pode ser menor que {quantidadePendente}.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="text-sm text-green-600">
                  ✓ Nenhum exemplar pendente encontrado para este livro.
                </div>
              )}
            </div>
          )}

          {/* Campos de quantidade - apenas se existirem no banco */}
          {showQuantityFields ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantidade_total">Quantidade Total</Label>
                <Input
                  id="quantidade_total"
                  type="number"
                  min={Math.max(1, quantidadePendente)}
                  placeholder="Ex: 5"
                  {...register('quantidade_total', { 
                    required: 'Quantidade total é obrigatória',
                    min: { 
                      value: Math.max(1, quantidadePendente), 
                      message: `Quantidade deve ser pelo menos ${Math.max(1, quantidadePendente)} (considerando livros pendentes)` 
                    }
                  })}
                  className={errors.quantidade_total ? 'border-red-500' : ''}
                />
                {errors.quantidade_total && (
                  <p className="text-red-500 text-sm">{errors.quantidade_total.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantidade_disponivel">Quantidade Disponível</Label>
                <Input
                  id="quantidade_disponivel"
                  type="number"
                  min="0"
                  placeholder="Ex: 5"
                  {...register('quantidade_disponivel', { 
                    required: 'Quantidade disponível é obrigatória',
                    min: { value: 0, message: 'Quantidade não pode ser negativa' }
                  })}
                  className={errors.quantidade_disponivel ? 'border-red-500' : ''}
                />
                {errors.quantidade_disponivel && (
                  <p className="text-red-500 text-sm">{errors.quantidade_disponivel.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantidade_emprestada">Quantidade Emprestada</Label>
                <Input
                  id="quantidade_emprestada"
                  type="number"
                  min="0"
                  placeholder="Ex: 0"
                  {...register('quantidade_emprestada', { 
                    required: 'Quantidade emprestada é obrigatória',
                    min: { value: 0, message: 'Quantidade não pode ser negativa' }
                  })}
                  className={errors.quantidade_emprestada ? 'border-red-500' : ''}
                />
                {errors.quantidade_emprestada && (
                  <p className="text-red-500 text-sm">{errors.quantidade_emprestada.message}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Informação:</strong> Os campos de quantidade não estão disponíveis no banco de dados. 
                O sistema está calculando o estoque em tempo real baseado nos empréstimos ativos.
              </p>
            </div>
          )}

          {showQuantityFields && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Dica:</strong> A quantidade disponível deve ser igual à quantidade total menos a quantidade emprestada.
                O sistema ajustará automaticamente quando você fizer empréstimos e devoluções.
                {quantidadePendente > 0 && (
                  <><br /><strong>Atenção:</strong> Este livro possui {quantidadePendente} exemplar(es) pendente(s) que devem ser considerados na quantidade total.</>
                )}
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel} type="button">
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
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
