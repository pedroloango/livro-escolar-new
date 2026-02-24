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
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [bookSearch, setBookSearch] = useState('');
  const [serieFilter, setSerieFilter] = useState<string>('all');
  const [turmaFilter, setTurmaFilter] = useState<string>('all');
  const [turnoFilter, setTurnoFilter] = useState<string>('all');
  const [anoFilter, setAnoFilter] = useState<string>('2026');
  const [showFilters, setShowFilters] = useState(false);
  const [personType, setPersonType] = useState<'aluno' | 'professor'>('aluno');

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<Loan>({
    defaultValues: initialData || {
      aluno_id: '',
      professor_id: '',
      livro_id: '',
      data_retirada: formatDateForInput(new Date()),
      quantidade_retirada: 1,
      status: 'Emprestado',
      serie: '',
      turma: '',
      turno: ''
    },
    mode: 'onChange'
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
        setFilteredBooks(booksData);
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
    if (anoFilter && anoFilter !== 'all') {
      result = result.filter(student => String(student.ano_letivo || '').toLowerCase().includes(anoFilter.toLowerCase().trim()));
    }
    setFilteredStudents(result);
  }, [students, serieFilter, turmaFilter, turnoFilter]);

  // Filtro para professores (pode ser expandido futuramente)
  useEffect(() => {
    setFilteredTeachers(teachers);
  }, [teachers]);

  // Add validation rules
  useEffect(() => {
    if (personType === 'aluno') {
      setValue('aluno_id', watchStudentId, { shouldValidate: true });
      setValue('professor_id', '', { shouldValidate: true });
      setValue('serie', '', { shouldValidate: true });
      setValue('turma', '', { shouldValidate: true });
      setValue('turno', '', { shouldValidate: true });
    } else {
      setValue('professor_id', watchTeacherId, { shouldValidate: true });
      setValue('aluno_id', '', { shouldValidate: true });
    }
  }, [personType, watchStudentId, watchTeacherId, setValue]);

  useEffect(() => {
    setValue('livro_id', watchBookId, { shouldValidate: true });
  }, [watchBookId, setValue]);

  // Adicionar efeito para filtrar livros
  useEffect(() => {
    if (bookSearch.trim() === '') {
      setFilteredBooks(books);
    } else {
      const searchTerm = bookSearch.toLowerCase();
      const filtered = books.filter(book => 
        book.titulo.toLowerCase().includes(searchTerm) ||
        (book.autor && book.autor.toLowerCase().includes(searchTerm)) ||
        (book.editora && book.editora.toLowerCase().includes(searchTerm))
      );
      setFilteredBooks(filtered);
    }
  }, [bookSearch, books]);

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const book = await findBookByBarcode(barcode);
      if (book && book.id) {
        setValue('livro_id', book.id, { shouldValidate: true });
        setBookSearch('');
        setFilteredBooks((prev) => {
          if (!prev.find(b => b.id === book.id)) {
            return [book, ...prev];
          }
          return prev;
        });
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

  // Adicionar manualmente G4 e G5 às séries
  const allSeries = Array.from(new Set([...students.map(student => student.serie.toString()), 'G4', 'G5']))
    .sort((a, b) => {
      // Ordenação: G4, G5, depois números
      if (a === 'G4') return -1;
      if (b === 'G4') return 1;
      if (a === 'G5') return -1;
      if (b === 'G5') return 1;
      return a.localeCompare(b, undefined, { numeric: true });
    });

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
      const selectedId = e.target.value;
      setValue('aluno_id', selectedId);
      setValue('professor_id', '');
      const sel = students.find(s => s.id === selectedId);
      if (sel) {
        // Pre-fill series/turma/turno and show ano letivo
        setValue('serie', String(sel.serie), { shouldValidate: true });
        setValue('turma', sel.turma, { shouldValidate: true });
        setValue('turno', sel.turno, { shouldValidate: true });
        setValue('ano_letivo', sel.ano_letivo ?? '', { shouldValidate: true });
      }
    } else {
      setValue('professor_id', e.target.value);
      setValue('aluno_id', '');
    }
  }

  const validateForm = (data: Loan) => {
    if (!data.livro_id) {
      toast.error('Selecione um livro');
      return false;
    }

    if (personType === 'aluno') {
      if (!data.aluno_id) {
        toast.error('Selecione um aluno');
        return false;
      }
      // Limpar campos do professor quando for aluno
      setValue('professor_id', '');
      setValue('serie', '');
      setValue('turma', '');
      setValue('turno', '');
    } else {
      if (!data.professor_id) {
        toast.error('Selecione um professor');
        return false;
      }
      // Limpar campo do aluno quando for professor
      setValue('aluno_id', '');
    }

    if (!data.data_retirada) {
      toast.error('Data de retirada é obrigatória');
      return false;
    }

    if (!data.quantidade_retirada || data.quantidade_retirada < 1) {
      toast.error('Quantidade deve ser maior que zero');
      return false;
    }

    return true;
  };

  const handleFormSubmit = (data: Loan) => {
    // Garantir que os campos estejam limpos antes de validar
    if (personType === 'aluno') {
      data.professor_id = '';
      data.serie = '';
      data.turma = '';
      data.turno = '';
    } else {
      data.aluno_id = '';
    }

    if (validateForm(data)) {
      onSubmit(data);
    }
  };

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
      <form onSubmit={handleSubmit(handleFormSubmit)}>
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
              {/* Mostrar ano letivo do aluno selecionado */}
              {watchStudentId && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <strong>Ano Letivo:</strong>{' '}
                  {students.find(s => s.id === watchStudentId)?.ano_letivo ?? '—'}
                </div>
              )}
            </div>
          ) : (
            <>
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
                      {teacher.nome}
                    </option>
                  ))}
                </select>
              </div>
              {/* Campos de Série, Turma e Turno para Professor */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serie">Série</Label>
                  <Select
                    value={watch('serie') || undefined}
                    onValueChange={value => setValue('serie', value, { shouldValidate: true })}
                  >
                    <SelectTrigger id="serie">
                      <SelectValue placeholder="Selecione a série" />
                    </SelectTrigger>
                    <SelectContent>
                      {allSeries.map((serie) => (
                        <SelectItem key={serie} value={serie}>{serie}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.serie && <p className="text-red-500 text-sm">Série é obrigatória</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="turma">Turma</Label>
                  <Input
                    id="turma"
                    {...register('turma', { required: personType === 'professor' })}
                    value={watch('turma') || ''}
                    onChange={e => setValue('turma', e.target.value)}
                  />
                  {errors.turma && <p className="text-red-500 text-sm">Turma é obrigatória</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="turno">Turno</Label>
                  <Select
                    value={watch('turno') || undefined}
                    onValueChange={value => setValue('turno', value, { shouldValidate: true })}
                  >
                    <SelectTrigger id="turno">
                      <SelectValue placeholder="Selecione o turno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Matutino">Matutino</SelectItem>
                      <SelectItem value="Vespertino">Vespertino</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.turno && <p className="text-red-500 text-sm">Turno é obrigatório</p>}
                </div>
              </div>
            </>
          )}

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 mb-2 bg-muted/30 rounded-md">
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
                    {allSeries.map((serie) => (
                      <SelectItem key={serie} value={serie}>
                        {serie}
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
              
              <div className="space-y-2">
                <Label htmlFor="ano-filter">Ano Letivo</Label>
                <Select
                  value={anoFilter}
                  onValueChange={setAnoFilter}
                >
                  <SelectTrigger id="ano-filter">
                    <SelectValue placeholder="Filtrar por ano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Array.from(new Set(students.map(s => s.ano_letivo ? String(s.ano_letivo).trim() : null).filter(Boolean)))
                      .sort((a,b) => Number(a) - Number(b))
                      .map((ano) => (
                        <SelectItem key={ano} value={ano}>
                          {ano}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="livro_id">Livro</Label>
            <div className="flex flex-col space-y-2">
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Pesquisar livro por título, autor ou editora..."
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    className="mb-2"
                  />
                  <Select
                    value={watchBookId}
                    onValueChange={(value) => setValue('livro_id', value, { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um livro" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredBooks.map((book) => (
                        <SelectItem key={book.id} value={book.id || undefined}>
                          <div className="flex flex-col">
                            <span className="font-medium">{book.titulo}</span>
                            {book.autor && <span className="text-sm text-muted-foreground">Autor: {book.autor}</span>}
                            {book.editora && <span className="text-sm text-muted-foreground">Editora: {book.editora}</span>}
                          </div>
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
              {errors.livro_id && <p className="text-red-500 text-sm">Livro é obrigatório</p>}
            </div>
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
