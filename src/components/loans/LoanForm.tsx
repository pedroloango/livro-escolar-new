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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import AnoLetivoFilter from '@/components/common/AnoLetivoFilter';
import { Barcode } from 'lucide-react';
import { toast } from 'sonner';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import { formatDateForInput } from '@/utils/download';

interface LoanFormProps {
  initialData?: Loan;
  onSubmit: (payload: LoanFormSubmitPayload) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export interface LoanFormSubmitPayload {
  loan: Loan;
  selectedBooks?: Array<{ bookId: string; quantity: number }>;
  selectedStudentLoans?: Array<{ studentId: string; bookId: string; quantity: number }>;
}

interface ProfessorSelectedBook {
  book: Book;
  quantity: number;
}

interface StudentLoanListItem {
  student: Student;
  book: Book;
  quantity: number;
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
  const [barcodeInput, setBarcodeInput] = useState('');
  const [serieFilter, setSerieFilter] = useState<string>('all');
  const [turmaFilter, setTurmaFilter] = useState<string>('all');
  const [turnoFilter, setTurnoFilter] = useState<string>('all');
  const [anoFilter, setAnoFilter] = useState<string>('2026');
  const [personType, setPersonType] = useState<'aluno' | 'professor'>('aluno');
  const [selectedProfessorBooks, setSelectedProfessorBooks] = useState<ProfessorSelectedBook[]>([]);
  const [selectedStudentLoans, setSelectedStudentLoans] = useState<StudentLoanListItem[]>([]);
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [pendingScannedBook, setPendingScannedBook] = useState<Book | null>(null);
  const [selectedModalStudentId, setSelectedModalStudentId] = useState<string>('');

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset, setError, clearErrors } = useForm<Loan>({
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

  const fetchAllStudents = async (): Promise<Student[]> => {
    const allStudents: Student[] = [];
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await getStudents(undefined, batchSize, offset);
      allStudents.push(...batch);
      hasMore = batch.length === batchSize;
      offset += batchSize;
    }

    return allStudents;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const limit = 150;
        const [studentsData, teachersData, booksData] = await Promise.all([
          fetchAllStudents(),
          getTeachers(),
          getBooks(limit, 0)
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
    const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();
    let result = [...students];
    if (serieFilter && serieFilter !== 'all') {
      result = result.filter(student => normalize(student.serie) === normalize(serieFilter));
    }
    if (turmaFilter && turmaFilter !== 'all') {
      result = result.filter(student => normalize(student.turma) === normalize(turmaFilter));
    }
    if (turnoFilter && turnoFilter !== 'all') {
      result = result.filter(student => normalize(student.turno) === normalize(turnoFilter));
    }
    if (anoFilter && anoFilter !== 'all') {
      result = result.filter(student => normalize(student.ano_letivo) === normalize(anoFilter));
    }
    setFilteredStudents(result);
  }, [students, serieFilter, turmaFilter, turnoFilter, anoFilter]);

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
        if (personType === 'professor') {
          setSelectedProfessorBooks((prev) => {
            const existing = prev.find((entry) => entry.book.id === book.id);
            if (existing) {
              toast.success(`Quantidade aumentada: ${book.titulo}`);
              return prev.map((entry) =>
                entry.book.id === book.id ? { ...entry, quantity: entry.quantity + 1 } : entry
              );
            }
            toast.success(`Livro adicionado: ${book.titulo}`);
            return [...prev, { book, quantity: 1 }];
          });
          setValue('livro_id', '');
        } else if (filteredStudents.length > 0) {
          setPendingScannedBook(book);
          setStudentSearch('');
          setSelectedModalStudentId(watchStudentId || filteredStudents[0]?.id || '');
          setIsStudentPickerOpen(true);
          setValue('livro_id', '');
          toast.success(`Livro reconhecido: ${book.titulo}`);
        } else {
          setValue('livro_id', book.id, { shouldValidate: true });
          toast.success(`Livro selecionado: ${book.titulo}`);
        }
        setBookSearch('');
        setFilteredBooks((prev) => {
          if (!prev.find(b => b.id === book.id)) {
            return [book, ...prev];
          }
          return prev;
        });
      } else {
        toast.error('Livro não encontrado com este código de barras');
      }
    } catch (error) {
      console.error('Error finding book by barcode:', error);
      toast.error('Erro ao buscar livro por código de barras');
    }
  };

  const handleBarcodeLookup = async () => {
    const code = barcodeInput?.trim();
    if (!code) {
      toast.error('Digite o código de barras');
      return;
    }
    try {
      const book = await findBookByBarcode(code);
      if (book && book.id) {
        if (personType === 'professor') {
          setSelectedProfessorBooks((prev) => {
            const existing = prev.find((entry) => entry.book.id === book.id);
            if (existing) {
              toast.success(`Quantidade aumentada: ${book.titulo}`);
              return prev.map((entry) =>
                entry.book.id === book.id ? { ...entry, quantity: entry.quantity + 1 } : entry
              );
            }
            toast.success(`Livro adicionado: ${book.titulo}`);
            return [...prev, { book, quantity: 1 }];
          });
          setValue('livro_id', '');
        } else if (filteredStudents.length > 0) {
          setPendingScannedBook(book);
          setStudentSearch('');
          setSelectedModalStudentId(watchStudentId || filteredStudents[0]?.id || '');
          setIsStudentPickerOpen(true);
          setValue('livro_id', '');
          toast.success(`Livro reconhecido: ${book.titulo}`);
        } else {
          setValue('livro_id', book.id, { shouldValidate: true });
          toast.success(`Livro selecionado: ${book.titulo}`);
        }
        setFilteredBooks((prev) => {
          if (!prev.find(b => b.id === book.id)) {
            return [book, ...prev];
          }
          return prev;
        });
      } else {
        toast.error('Livro não encontrado com este código de barras');
      }
    } catch (err) {
      console.error('Erro ao buscar livro por código de barras:', err);
      toast.error('Erro ao buscar livro por código de barras');
    }
  };

  // Detectar scanner USB que emite como teclado e buscar automaticamente
  useEffect(() => {
    let buffer = '';
    let lastTime = 0;
    const INTER_CHAR_THRESHOLD = 50; // ms between chars to consider scanner input
    const CLEAR_DELAY = 200; // ms to clear buffer if no Enter
    let clearTimer: number | undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const isTypingField = !!activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );

      if (isTypingField && activeElement?.id !== 'loan-barcode-input') {
        return;
      }

      const now = Date.now();
      const dt = now - lastTime;
      lastTime = now;

      // ignore modifier keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;

      if (e.key.length === 1) {
        // probably a character
        if (dt > INTER_CHAR_THRESHOLD && buffer.length > 0) {
          buffer = '';
        }
        buffer += e.key;
        if (clearTimer) window.clearTimeout(clearTimer);
        clearTimer = window.setTimeout(() => { buffer = ''; }, CLEAR_DELAY);
      } else if (e.key === 'Enter') {
        const code = buffer.trim();
        const scannerLikeEnter = code.length > 0 || dt <= INTER_CHAR_THRESHOLD * 2;
        buffer = '';
        if (clearTimer) window.clearTimeout(clearTimer);
        if (!scannerLikeEnter) return;
        e.preventDefault();
        e.stopPropagation();
        if (code.length > 0) {
          // perform lookup
          (async () => {
            try {
              const book = await findBookByBarcode(code);
              if (book && book.id) {
                if (personType === 'professor') {
                  setSelectedProfessorBooks((prev) => {
                    const existing = prev.find((entry) => entry.book.id === book.id);
                    if (existing) {
                      toast.success(`Quantidade aumentada: ${book.titulo}`);
                      return prev.map((entry) =>
                        entry.book.id === book.id ? { ...entry, quantity: entry.quantity + 1 } : entry
                      );
                    }
                    toast.success(`Livro adicionado: ${book.titulo}`);
                    return [...prev, { book, quantity: 1 }];
                  });
                  setValue('livro_id', '');
                } else if (filteredStudents.length > 0) {
                  setPendingScannedBook(book);
                  setStudentSearch('');
                  setSelectedModalStudentId(watchStudentId || filteredStudents[0]?.id || '');
                  setIsStudentPickerOpen(true);
                  setValue('livro_id', '');
                  toast.success(`Livro reconhecido: ${book.titulo}`);
                } else {
                  setValue('livro_id', book.id, { shouldValidate: true });
                  toast.success(`Livro selecionado: ${book.titulo}`);
                }
                setFilteredBooks((prev) => {
                  if (!prev.find(b => b.id === book.id)) return [book, ...prev];
                  return prev;
                });
                setBarcodeInput(code);
              } else {
                toast.error('Livro não encontrado com este código de barras');
              }
            } catch (err) {
              console.error('Erro ao buscar por código de barras (scanner):', err);
              toast.error('Erro ao buscar livro por código de barras');
            }
          })();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      if (clearTimer) window.clearTimeout(clearTimer);
    };
  }, [setValue, setFilteredBooks, setBarcodeInput, toast, personType, watchStudentId, filteredStudents]);

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

  const modalFilteredStudents = filteredStudents.filter((student) => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return true;
    const composed = `${student.nome} ${student.serie} ${student.turma} ${student.turno} ${student.ano_letivo ?? ''}`.toLowerCase();
    return composed.includes(q);
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
    if (value === 'aluno') {
      setSelectedProfessorBooks([]);
    } else {
      setSelectedStudentLoans([]);
    }
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
    const hasStudentBatch = personType === 'aluno' && selectedStudentLoans.length > 0;

    if (personType === 'aluno' && !hasStudentBatch && !data.livro_id) {
      toast.error('Selecione um livro');
      return false;
    }

    if (personType === 'aluno') {
      if (!hasStudentBatch && !data.aluno_id) {
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
      if (!data.turma?.trim()) {
        setError('turma', { type: 'required', message: 'Turma é obrigatória' });
        toast.error('Informe a turma');
        return false;
      }
      if (!data.serie) {
        setError('serie', { type: 'required', message: 'Série é obrigatória' });
        toast.error('Selecione a série');
        return false;
      }
      if (!data.turno?.trim()) {
        setError('turno', { type: 'required', message: 'Turno é obrigatório' });
        toast.error('Selecione o turno');
        return false;
      }
      clearErrors(['turma', 'serie', 'turno']);
      // Limpar campo do aluno quando for professor
      setValue('aluno_id', '');
      if (selectedProfessorBooks.length === 0) {
        toast.error('Adicione pelo menos um livro para o professor');
        return false;
      }
    }

    if (personType === 'aluno' && !hasStudentBatch && !data.data_retirada) {
      toast.error('Data de retirada é obrigatória');
      return false;
    }

    if (personType === 'aluno' && !hasStudentBatch && (!data.quantidade_retirada || data.quantidade_retirada < 1)) {
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
      if (selectedStudentLoans.length > 0) {
        data.aluno_id = selectedStudentLoans[0]?.student.id || '';
        data.livro_id = selectedStudentLoans[0]?.book.id || '';
        data.data_retirada = formatDateForInput(new Date());
        data.quantidade_retirada = 1;
      }
    } else {
      data.aluno_id = '';
      data.livro_id = selectedProfessorBooks[0]?.book?.id || '';
      data.data_retirada = formatDateForInput(new Date());
      data.quantidade_retirada = 1;
    }

    if (validateForm(data)) {
      onSubmit({
        loan: data,
        selectedBooks: personType === 'professor'
          ? selectedProfessorBooks
              .filter((entry): entry is ProfessorSelectedBook => Boolean(entry.book.id))
              .map((entry) => ({ bookId: entry.book.id as string, quantity: entry.quantity }))
          : undefined,
        selectedStudentLoans: personType === 'aluno'
          ? selectedStudentLoans
              .filter((entry) => Boolean(entry.student.id) && Boolean(entry.book.id))
              .map((entry) => ({
                studentId: entry.student.id as string,
                bookId: entry.book.id as string,
                quantity: entry.quantity
              }))
          : undefined
      });
    }
  };

  const addSelectedStudentAndBookToList = () => {
    const selectedStudent = students.find((student) => student.id === watchStudentId);
    const selectedBook = books.find((book) => book.id === watchBookId);
    if (!selectedStudent?.id) {
      toast.error('Selecione um aluno');
      return;
    }
    if (!selectedBook?.id) {
      toast.error('Selecione um livro');
      return;
    }

    const itemKey = `${selectedStudent.id}-${selectedBook.id}`;
    setSelectedStudentLoans((prev) => {
      const existing = prev.find((entry) => `${entry.student.id}-${entry.book.id}` === itemKey);
      if (existing) {
        toast.success(`Quantidade aumentada para ${selectedStudent.nome}`);
        return prev.map((entry) =>
          `${entry.student.id}-${entry.book.id}` === itemKey
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        );
      }
      return [...prev, { student: selectedStudent, book: selectedBook, quantity: 1 }];
    });

    setValue('livro_id', '');
    setBookSearch('');
  };

  const includeScannedBookForSelectedStudent = () => {
    if (!pendingScannedBook?.id) {
      toast.error('Nenhum livro reconhecido para incluir');
      return;
    }
    const selectedStudent = filteredStudents.find((student) => student.id === selectedModalStudentId);
    if (!selectedStudent?.id) {
      toast.error('Selecione um aluno para incluir');
      return;
    }

    const itemKey = `${selectedStudent.id}-${pendingScannedBook.id}`;
    setSelectedStudentLoans((prev) => {
      const existing = prev.find((entry) => `${entry.student.id}-${entry.book.id}` === itemKey);
      if (existing) {
        return prev.map((entry) =>
          `${entry.student.id}-${entry.book.id}` === itemKey
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        );
      }
      return [...prev, { student: selectedStudent, book: pendingScannedBook, quantity: 1 }];
    });

    toast.success(`Incluído: ${selectedStudent.nome} + ${pendingScannedBook.titulo}`);
    setIsStudentPickerOpen(false);
    setPendingScannedBook(null);
    setSelectedModalStudentId('');
    setStudentSearch('');
  };

  const addSelectedBookToProfessorList = () => {
    const selectedBook = books.find((book) => book.id === watchBookId);
    if (!selectedBook || !selectedBook.id) {
      toast.error('Selecione um livro para adicionar');
      return;
    }
    setSelectedProfessorBooks((prev) => {
      const existing = prev.find((entry) => entry.book.id === selectedBook.id);
      if (existing) {
        toast.success(`Quantidade aumentada: ${selectedBook.titulo}`);
        return prev.map((entry) =>
          entry.book.id === selectedBook.id ? { ...entry, quantity: entry.quantity + 1 } : entry
        );
      }
      return [...prev, { book: selectedBook, quantity: 1 }];
    });
    setValue('livro_id', '');
    setBookSearch('');
  };

  const removeProfessorBook = (bookId?: string) => {
    if (!bookId) return;
    setSelectedProfessorBooks((prev) => prev.filter((entry) => entry.book.id !== bookId));
  };

  const increaseProfessorBookQuantity = (bookId?: string) => {
    if (!bookId) return;
    setSelectedProfessorBooks((prev) =>
      prev.map((entry) =>
        entry.book.id === bookId ? { ...entry, quantity: entry.quantity + 1 } : entry
      )
    );
  };

  const decreaseProfessorBookQuantity = (bookId?: string) => {
    if (!bookId) return;
    setSelectedProfessorBooks((prev) =>
      prev.map((entry) =>
        entry.book.id === bookId
          ? { ...entry, quantity: Math.max(1, entry.quantity - 1) }
          : entry
      )
    );
  };

  const removeStudentLoanItem = (studentId?: string, bookId?: string) => {
    if (!studentId || !bookId) return;
    setSelectedStudentLoans((prev) =>
      prev.filter((entry) => !(entry.student.id === studentId && entry.book.id === bookId))
    );
  };

  const increaseStudentLoanQuantity = (studentId?: string, bookId?: string) => {
    if (!studentId || !bookId) return;
    setSelectedStudentLoans((prev) =>
      prev.map((entry) =>
        entry.student.id === studentId && entry.book.id === bookId
          ? { ...entry, quantity: entry.quantity + 1 }
          : entry
      )
    );
  };

  const decreaseStudentLoanQuantity = (studentId?: string, bookId?: string) => {
    if (!studentId || !bookId) return;
    setSelectedStudentLoans((prev) =>
      prev.map((entry) =>
        entry.student.id === studentId && entry.book.id === bookId
          ? { ...entry, quantity: Math.max(1, entry.quantity - 1) }
          : entry
      )
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{initialData ? 'Editar Empréstimo' : 'Novo Empréstimo'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <CardContent className="space-y-4">
          {/* Tipo de pessoa + filtros de aluno (mesma linha, compacto) */}
          <div className="flex flex-nowrap items-end gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
            <div className="flex flex-col gap-0.5 shrink-0">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Tipo de pessoa</Label>
              <Select value={personType} onValueChange={handlePersonTypeChange}>
                <SelectTrigger className="h-8 w-[6.75rem] text-xs px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aluno">Aluno</SelectItem>
                  <SelectItem value="professor">Professor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {personType === 'aluno' && (
              <>
                <div className="flex flex-col gap-0.5 w-[4.5rem] sm:w-[5rem] shrink-0 min-w-0">
                  <Label htmlFor="serie-filter" className="text-xs text-muted-foreground whitespace-nowrap">Série</Label>
                  <Select value={serieFilter} onValueChange={setSerieFilter}>
                    <SelectTrigger id="serie-filter" className="h-8 text-xs px-2">
                      <SelectValue placeholder="Série" />
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
                <div className="flex flex-col gap-0.5 w-[4.5rem] sm:w-[5rem] shrink-0 min-w-0">
                  <Label htmlFor="turma-filter" className="text-xs text-muted-foreground whitespace-nowrap">Turma</Label>
                  <Select value={turmaFilter} onValueChange={setTurmaFilter}>
                    <SelectTrigger id="turma-filter" className="h-8 text-xs px-2">
                      <SelectValue placeholder="Turma" />
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
                <div className="flex flex-col gap-0.5 w-[4.75rem] sm:w-[5.25rem] shrink-0 min-w-0">
                  <Label htmlFor="turno-filter" className="text-xs text-muted-foreground whitespace-nowrap">Turno</Label>
                  <Select value={turnoFilter} onValueChange={setTurnoFilter}>
                    <SelectTrigger id="turno-filter" className="h-8 text-xs px-2">
                      <SelectValue placeholder="Turno" />
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
                <div className="w-[5.25rem] sm:w-[5.75rem] shrink-0 min-w-0 [&_label]:text-xs [&_label]:text-muted-foreground [&_label]:whitespace-nowrap [&_button]:h-8 [&_button]:px-2 [&_button]:text-xs">
                  <AnoLetivoFilter
                    className="space-y-0.5"
                    value={anoFilter}
                    onValueChange={setAnoFilter}
                    years={Array.from(new Set(students.map(s => s.ano_letivo ? String(s.ano_letivo).trim() : null).filter(Boolean))).sort((a, b) => Number(a) - Number(b))}
                    id="ano-filter"
                    placeholder="Ano"
                  />
                </div>
              </>
            )}
          </div>

          {/* Seleção de Aluno ou Professor */}
          {personType === 'aluno' ? (
            <div className="space-y-2">
              <Label htmlFor="aluno_id">Aluno</Label>
              <select
                id="aluno_id"
                {...register('aluno_id', { required: personType === 'aluno' && selectedStudentLoans.length === 0 })}
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
                  <Label htmlFor="turma-professor">Turma</Label>
                  <Select
                    value={watch('turma') || undefined}
                    onValueChange={v => {
                      setValue('turma', v, { shouldValidate: true });
                      clearErrors('turma');
                    }}
                  >
                    <SelectTrigger id="turma-professor">
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {['A', 'B', 'C', 'D', 'E'].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

          <div className="space-y-2">
            <Label htmlFor="livro_id">{personType === 'professor' ? 'Livro (Adicionar à lista)' : 'Livro'}</Label>
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
                  {personType === 'professor' && (
                    <Button type="button" variant="secondary" className="mt-2" onClick={addSelectedBookToProfessorList}>
                      Adicionar livro à lista
                    </Button>
                  )}
                  {personType === 'aluno' && (
                    <Button type="button" variant="secondary" className="mt-2" onClick={addSelectedStudentAndBookToList}>
                      Adicionar aluno + livro à lista
                    </Button>
                  )}
                </div>
                    <div className="flex flex-col gap-2 w-56">
                      <div className="flex items-center gap-2">
                        <Input
                          id="loan-barcode-input"
                          type="text"
                          placeholder="Código de barras"
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                        />
                        <Button type="button" variant="outline" onClick={handleBarcodeLookup}>
                          Buscar
                        </Button>
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
              </div>
              {personType === 'aluno' && errors.livro_id && <p className="text-red-500 text-sm">Livro é obrigatório</p>}
            </div>
          </div>

          {personType === 'professor' && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label>Livros adicionados ({selectedProfessorBooks.length})</Label>
              </div>
              {selectedProfessorBooks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum livro adicionado. Use a busca, seleção ou leitor de código de barras para montar a lista.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedProfessorBooks.map((entry) => (
                    <div key={entry.book.id} className="flex items-center justify-between gap-2 rounded border p-2">
                      <div>
                        <p className="font-medium">{entry.book.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.book.autor || 'Sem autor'}{entry.book.editora ? ` - ${entry.book.editora}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded border">
                          <Button type="button" variant="ghost" size="sm" onClick={() => decreaseProfessorBookQuantity(entry.book.id)}>
                            -
                          </Button>
                          <span className="min-w-8 text-center text-sm font-medium">{entry.quantity}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => increaseProfessorBookQuantity(entry.book.id)}>
                            +
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeProfessorBook(entry.book.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {personType === 'aluno' && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label>Lista de empréstimos (Aluno + Livro) ({selectedStudentLoans.length})</Label>
              </div>
              {selectedStudentLoans.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Selecione um aluno filtrado, leia/seleciona o livro e adicione na lista. Depois registre tudo de uma vez.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedStudentLoans.map((entry) => (
                    <div key={`${entry.student.id}-${entry.book.id}`} className="flex items-center justify-between gap-2 rounded border p-2">
                      <div>
                        <p className="font-medium">{entry.student.nome} - {entry.book.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.student.serie}o {entry.student.turma} ({entry.student.turno})
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded border">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => decreaseStudentLoanQuantity(entry.student.id, entry.book.id)}
                          >
                            -
                          </Button>
                          <span className="min-w-8 text-center text-sm font-medium">{entry.quantity}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => increaseStudentLoanQuantity(entry.student.id, entry.book.id)}
                          >
                            +
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeStudentLoanItem(entry.student.id, entry.book.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {personType === 'aluno' && selectedStudentLoans.length === 0 && (
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
          )}
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

      <Dialog
        open={isStudentPickerOpen}
        onOpenChange={(open) => {
          setIsStudentPickerOpen(open);
          if (!open) {
            setPendingScannedBook(null);
            setSelectedModalStudentId('');
            setStudentSearch('');
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Selecionar aluno para incluir</DialogTitle>
            <DialogDescription>
              Livro reconhecido: <strong>{pendingScannedBook?.titulo ?? '-'}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Pesquisar aluno por nome, série, turma, turno..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />

            <div className="max-h-72 overflow-y-auto rounded-md border">
              {modalFilteredStudents.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Nenhum aluno encontrado com os filtros aplicados.</p>
              ) : (
                <div className="divide-y">
                  {modalFilteredStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      className={`w-full px-3 py-2 text-left text-sm border-l-4 transition-colors ${
                        selectedModalStudentId === student.id
                          ? 'bg-primary/15 border-l-primary ring-1 ring-primary/30'
                          : 'border-l-transparent hover:bg-muted'
                      }`}
                      onClick={() => setSelectedModalStudentId(student.id || '')}
                    >
                      <div className={`font-medium ${selectedModalStudentId === student.id ? 'text-primary' : ''}`}>
                        {student.nome}
                      </div>
                      <div className={`text-xs ${selectedModalStudentId === student.id ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                        {student.serie}o {student.turma} ({student.turno}) - Ano {student.ano_letivo ?? '-'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsStudentPickerOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={includeScannedBookForSelectedStudent}>
              Incluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
