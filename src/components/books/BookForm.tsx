
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Book } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Barcode } from 'lucide-react';
import BarcodeScanner from '@/components/common/BarcodeScanner';

interface BookFormProps {
  initialData?: Book;
  onSubmit: (data: Book) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function BookForm({ initialData, onSubmit, onCancel, isSubmitting }: BookFormProps) {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<Book>({
    defaultValues: initialData || {
      titulo: '',
      codigo_barras: '',
      quantidade_total: 1,
      quantidade_disponivel: 1,
      quantidade_emprestada: 0
    }
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleBarcodeScan = (barcode: string) => {
    setValue('codigo_barras', barcode);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{initialData ? 'Editar Livro' : 'Novo Livro'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantidade_total">Quantidade Total</Label>
              <Input
                id="quantidade_total"
                type="number"
                min="1"
                placeholder="Ex: 5"
                {...register('quantidade_total', { 
                  required: 'Quantidade total é obrigatória',
                  min: { value: 1, message: 'Quantidade deve ser pelo menos 1' }
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

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Dica:</strong> A quantidade disponível deve ser igual à quantidade total menos a quantidade emprestada.
              O sistema ajustará automaticamente quando você fizer empréstimos e devoluções.
            </p>
          </div>
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
