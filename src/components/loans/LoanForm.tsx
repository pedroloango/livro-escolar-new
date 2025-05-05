import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loan, Student, Book } from '@/types';
import { getStudents } from '@/services/studentService';
import { getBooks, findBookByBarcode } from '@/services/bookService';
import { getTeachers, Teacher } from '@/services/teacherService';
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
import { Barcode, Filter } from 'lucide-react';
import { toast } from 'sonner';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import { formatDateForInput } from '@/utils/download';

interface LoanFormProps {
  initialData?: Loan;
  onSubmit: (data: Loan) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function LoanForm({ initialData, onSubmit, onCancel, isSubmitting }: LoanFormProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [serieFilter, setSerieFilter] = useState<string>('all');
  const [turmaFilter, setTurmaFilter] = useState<string>('all');
  const [turnoFilter, setTurnoFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [personType, setPersonType] = useState<'aluno' | 'professor'>('aluno');

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<Loan>({
    defaultValues: initialData || {
      aluno_id: '',
      professor_id: '',
      livro_id: '',
      data_retirada: formatDateForInput(new Date()),
      quantidade_retirada: 1,
      status: 'Emprestado'
    }
  });

  const watchStudentId = watch('aluno_id');
  const watchTeacherId = watch('professor_id');
  const watchBookId = watch('livro_id');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsData, teachersData, booksData] = await Promise.all([
          getStudents(),
          getTeachers(),
          getBooks()
        ]);
        setStudents(studentsData);
        setFilteredStudents(studentsData);
        setTeachers(teachersData);
        setFilteredTeachers(teachersData);
        setBooks(booksData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let result = [...students];
    if (serieFilter && serieFilter !== 'all') {
      result = result.filter(student => student.serie.toString() === serieFilter);
    }
    if (turmaFilter && turmaFilter !== 'all') {
      result = result.filter(student => student.turma === turmaFilter);
    }
    if (turnoFilter && turnoFilter !== 'all') {
      result = result.filter(student => student.turno === turnoFilter);
    }
    setFilteredStudents(result);
  }, [students, serieFilter, turmaFilter, turnoFilter]);

  // Filtro para professores (pode ser expandido futuramente)
  useEffect(() => {
    setFilteredTeachers(teachers);
  }, [teachers]);

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const book = await findBookByBarcode(barcode);
      if (book && book.id) {
        setValue('livro_id', book.id);
        toast.success(`Livro selecionado: ${book.titulo}`);
      } else {
        toast.error('Livro não encontrado com este código de barras');
      }
    } catch (error) {
      console.error('Error finding book by barcode:', error);
      toast.error('Erro ao buscar livro por código de barras');
    }
  };

  const series = Array.from(new Set(students.map(student => student.serie)))
    .sort((a, b) => a - b)
    .map(serie => serie.toString());
  const turmas = Array.from(new Set(students.map(student => student.turma)));
  const turnos = Array.from(new Set(students.map(student => student.turno)));

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

  function handlePersonTypeChange(value: 'aluno' | 'professor') {
    setPersonType(value);
    // Limpa seleção ao trocar
    reset({ ...watch(), aluno_id: '', professor_id: '' });
  }

  function handlePersonSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    if (personType === 'aluno') {
      setValue('aluno_id', e.target.value);
      setValue('professor_id', '');
    } else {
      setValue('professor_id', e.target.value);
      setValue('aluno_id', '');
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{initialData ? 'Editar Empréstimo' : 'Novo Empréstimo'}</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Seletor Aluno/Professor */}
          <div className="flex gap-4 items-center">
            <Label>Tipo de pessoa:</Label>
            <Select value={personType} onValueChange={handlePersonTypeChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aluno">Aluno</SelectItem>
                <SelectItem value="professor">Professor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de Aluno ou Professor */}
          {personType === 'aluno' ? (
            <div className="space-y-2">
              <Label htmlFor="aluno_id">Aluno</Label>
              <select
                id="aluno_id"
                {...register('aluno_id', { required: personType === 'aluno' })}
                value={watchStudentId}
                onChange={handlePersonSelect}
                className="w-full border rounded p-2"
              >
                <option value="">Selecione um aluno</option>
                {filteredStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.nome} - {student.serie}º {student.turma} ({student.turno})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="professor_id">Professor</Label>
              <select
                id="professor_id"
                {...register('professor_id', { required: personType === 'professor' })}
                value={watchTeacherId}
                onChange={handlePersonSelect}
                className="w-full border rounded p-2"
              >
                <option value="">Selecione um professor</option>
                {filteredTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.nome} {teacher.email ? `- ${teacher.email}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 mb-2 bg-muted/30 rounded-md">
              <div className="space-y-2">
                <Label htmlFor="serie-filter">Série</Label>
                <Select
                  value={serieFilter}
                  onValueChange={setSerieFilter}
                >
                  <SelectTrigger id="serie-filter">
                    <SelectValue placeholder="Filtrar por série" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {series.map((serie) => (
                      <SelectItem key={serie} value={serie}>
                        {`${serie}º`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="turma-filter">Turma</Label>
                <Select
                  value={turmaFilter}
                  onValueChange={setTurmaFilter}
                >
                  <SelectTrigger id="turma-filter">
                    <SelectValue placeholder="Filtrar por turma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {turmas.map((turma) => (
                      <SelectItem key={turma} value={turma}>
                        {turma}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="turno-filter">Turno</Label>
                <Select
                  value={turnoFilter}
                  onValueChange={setTurnoFilter}
                >
                  <SelectTrigger id="turno-filter">
                    <SelectValue placeholder="Filtrar por turno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {turnos.map((turno) => (
                      <SelectItem key={turno} value={turno}>
                        {turno}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="livro_id">Livro</Label>
            <div className="flex space-x-2">
              <div className="flex-1">
                <Select
                  value={watchBookId}
                  onValueChange={(value) => setValue('livro_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um livro" />
                  </SelectTrigger>
                  <SelectContent>
                    {books.map((book) => (
                      <SelectItem key={book.id} value={book.id || ''}>
                        {book.titulo}
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
            {errors.livro_id && <p className="text-red-500 text-sm">{errors.livro_id.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_retirada">Data de Retirada</Label>
              <Input
                id="data_retirada"
                type="date"
                {...register('data_retirada', { required: 'Data de retirada é obrigatória' })}
                className={errors.data_retirada ? 'border-red-500' : ''}
              />
              {errors.data_retirada && (
                <p className="text-red-500 text-sm">{errors.data_retirada.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade_retirada">Quantidade</Label>
              <Input
                id="quantidade_retirada"
                type="number"
                min="1"
                {...register('quantidade_retirada', { 
                  required: 'Quantidade é obrigatória',
                  min: { value: 1, message: 'Mínimo de 1 livro' }
                })}
                className={errors.quantidade_retirada ? 'border-red-500' : ''}
              />
              {errors.quantidade_retirada && (
                <p className="text-red-500 text-sm">{errors.quantidade_retirada.message}</p>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel} type="button">
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Registrar Empréstimo'}
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
