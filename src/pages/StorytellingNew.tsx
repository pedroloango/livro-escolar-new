import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getTeachers } from '@/services/teacherService';
import { getBooks, findBookByBarcode } from '@/services/bookService';
import { addStorytelling, Storytelling } from '@/services/storytellingService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import { Barcode } from 'lucide-react';
import { useForm } from 'react-hook-form';

export default function StorytellingNew() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Partial<Storytelling>>({
    defaultValues: {
      qtd_alunos: 1,
    }
  });

  useEffect(() => {
    async function fetchData() {
      const teachersData = await getTeachers();
      setTeachers(teachersData);
      const booksData = await getBooks();
      setBooks(booksData);
    }
    fetchData();
  }, []);

  // Professores que NÃO fazem contação de histórias
  const professores = teachers.filter(t => !t.contacao_historias);
  // Profissionais que fazem contação
  const profissionais = teachers.filter(t => t.contacao_historias);

  // Séries, turmas e turnos de exemplo (ajuste conforme necessário)
  const series = ['G4', 'G5', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const turmas = ['A', 'B', 'C', 'D', 'E'];
  const turnos = ['Matutino', 'Vespertino'];

  async function handleBarcodeScan(barcode: string) {
    try {
      const book = await findBookByBarcode(barcode);
      if (book && book.id) {
        setValue('livro_id', String(book.id), { shouldValidate: true });
        toast.success(`Livro selecionado: ${book.titulo}`);
      } else {
        toast.error('Livro não encontrado com este código de barras');
      }
    } catch (error) {
      toast.error('Erro ao buscar livro por código de barras');
    }
  }

  const onSubmit = async (data: Partial<Storytelling>) => {
    setLoading(true);
    try {
      await addStorytelling({
        professor_id: data.professor_id!,
        serie: data.serie!,
        turma: data.turma!,
        turno: data.turno!,
        livro_id: data.livro_id!,
        data_contacao: data.data_contacao!,
        profissional_id: data.profissional_id!,
        qtd_alunos: Number(data.qtd_alunos) || 0,
      });
      toast.success('Registro salvo com sucesso!');
      navigate('/storytelling');
    } catch (e) {
      toast.error('Erro ao salvar registro');
    } finally {
      setLoading(false);
    }
  };

  const watchLivroId = watch('livro_id');

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto p-4">
        <h2 className="text-xl font-bold mb-4">Registrar Contação de Histórias</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Nome do Professor</label>
            <select {...register('professor_id', { required: true })} className="border rounded px-2 py-1 w-full">
              <option value="">Selecione o professor</option>
              {professores.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
            {errors.professor_id && <span className="text-red-500 text-sm">Campo obrigatório</span>}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block mb-1 font-medium">Série</label>
              <select {...register('serie', { required: true })} className="border rounded px-2 py-1 w-full">
                <option value="">Selecione a série</option>
                {series.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.serie && <span className="text-red-500 text-sm">Campo obrigatório</span>}
            </div>
            <div className="flex-1">
              <label className="block mb-1 font-medium">Turma</label>
              <select {...register('turma', { required: true })} className="border rounded px-2 py-1 w-full">
                <option value="">Selecione a turma</option>
                {turmas.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.turma && <span className="text-red-500 text-sm">Campo obrigatório</span>}
            </div>
            <div className="flex-1">
              <label className="block mb-1 font-medium">Turno</label>
              <select {...register('turno', { required: true })} className="border rounded px-2 py-1 w-full">
                <option value="">Selecione o turno</option>
                {turnos.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.turno && <span className="text-red-500 text-sm">Campo obrigatório</span>}
            </div>
          </div>
          <div>
            <label className="block mb-1 font-medium">Título do Livro</label>
            <div className="flex gap-2 items-center">
              <select {...register('livro_id', { required: true })} value={watchLivroId || ''} onChange={e => setValue('livro_id', e.target.value, { shouldValidate: true })} className="border rounded px-2 py-1 w-full">
                <option value="">Selecione o livro</option>
                {books.map(b => (
                  <option key={b.id} value={String(b.id)}>{b.titulo}</option>
                ))}
              </select>
              <Button type="button" variant="outline" size="icon" onClick={() => setIsScannerOpen(true)}>
                <Barcode className="h-5 w-5" />
              </Button>
            </div>
            <BarcodeScanner 
              isOpen={isScannerOpen}
              onClose={() => setIsScannerOpen(false)}
              onScan={handleBarcodeScan}
            />
            {errors.livro_id && <span className="text-red-500 text-sm">Campo obrigatório</span>}
          </div>
          <div>
            <label className="block mb-1 font-medium">Data da Contação</label>
            <Input type="date" {...register('data_contacao', { required: true })} />
            {errors.data_contacao && <span className="text-red-500 text-sm">Campo obrigatório</span>}
          </div>
          <div>
            <label className="block mb-1 font-medium">Profissional da Contação</label>
            <select {...register('profissional_id', { required: true })} className="border rounded px-2 py-1 w-full">
              <option value="">Selecione o profissional</option>
              {profissionais.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
            {errors.profissional_id && <span className="text-red-500 text-sm">Campo obrigatório</span>}
          </div>
          <div>
            <label className="block mb-1 font-medium">Qtd de Alunos</label>
            <Input type="number" {...register('qtd_alunos', { required: true, min: 1 })} min={1} />
            {errors.qtd_alunos && <span className="text-red-500 text-sm">Campo obrigatório</span>}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>Salvar</Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/storytelling')}>Cancelar</Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
} 