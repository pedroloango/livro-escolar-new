import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getStudents, deleteStudent, getStudentYears, getStudentsCount, getStudentTurmas, getStudentTurnos } from '@/services/studentService';
import { Student } from '@/types';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import AnoLetivoFilter from '@/components/common/AnoLetivoFilter';
import { Input } from '@/components/ui/input';
import StudentsImport from '@/components/students/StudentsImport';
import { useAuth } from '@/contexts/AuthContext';

const STUDENTS_PAGE_SIZE = 50;

export default function Students() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [serieFilter, setSerieFilter] = useState<string>('all');
  const [turmaFilter, setTurmaFilter] = useState<string>('all');
  const [turnoFilter, setTurnoFilter] = useState<string>('all');
  const [anoFilter, setAnoFilter] = useState<string>('all');
  const [nameFilter, setNameFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [anos, setAnos] = useState<string[]>([]);
  const [turmas, setTurmas] = useState<string[]>([]);
  const [turnos, setTurnos] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      Promise.all([getStudentYears(), getStudentTurmas(), getStudentTurnos()])
        .then(([years, tmas, tnos]) => {
          setAnos(years);
          setTurmas(tmas);
          setTurnos(tnos);
        })
        .catch(err => console.error('Erro ao carregar opções de filtro:', err));
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchStudents();
    }
  }, [authLoading, isAuthenticated, anoFilter, serieFilter, turmaFilter, turnoFilter, nameFilter, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [anoFilter, serieFilter, turmaFilter, turnoFilter, nameFilter]);

  const buildFilters = () => {
    const f: { ano_letivo?: string; serie?: number; turma?: string; turno?: string; nome?: string } = {};
    if (anoFilter && anoFilter !== 'all') f.ano_letivo = anoFilter;
    if (serieFilter && serieFilter !== 'all') f.serie = parseInt(serieFilter, 10);
    if (turmaFilter && turmaFilter !== 'all') f.turma = turmaFilter;
    if (turnoFilter && turnoFilter !== 'all') f.turno = turnoFilter;
    if (nameFilter.trim()) f.nome = nameFilter.trim();
    return Object.keys(f).length ? f : undefined;
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const filters = buildFilters();
      const offset = (currentPage - 1) * STUDENTS_PAGE_SIZE;
      const [data, count] = await Promise.all([
        getStudents(filters, STUDENTS_PAGE_SIZE, offset),
        getStudentsCount(filters),
      ]);
      setStudents(data);
      setTotalCount(count);
      setTotalPages(Math.max(1, Math.ceil(count / STUDENTS_PAGE_SIZE)));
    } catch (error) {
      console.error('Failed to fetch students:', error);
      toast.error('Erro ao carregar alunos');
    } finally {
      setLoading(false);
    }
  };
  

  const handleDelete = async (id: string) => {
    try {
      await deleteStudent(id);
      setStudents(students.filter(student => student.id !== id));
      setTotalCount(c => Math.max(0, c - 1));
      toast.success('Aluno excluído com sucesso');
    } catch (error) {
      console.error('Failed to delete student:', error);
      toast.error('Erro ao excluir aluno');
    }
  };

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: 'nome',
      header: 'Nome',
    },
    {
      accessorKey: 'serie',
      header: 'Série',
      cell: ({ row }) => {
        return `${row.getValue('serie')}º`;
      },
    },
    {
      accessorKey: 'turma',
      header: 'Turma',
    },
    {
      accessorKey: 'turno',
      header: 'Turno',
    },
    {
      accessorKey: 'ano_letivo',
      header: 'Ano Letivo',
      cell: ({ row }) => {
        const v = row.getValue('ano_letivo') as string | number | null | undefined;
        return v ? String(v) : '—';
      },
    },
    {
      accessorKey: 'sexo',
      header: 'Sexo',
    },
    {
      accessorKey: 'data_nascimento',
      header: 'Data de Nascimento',
      cell: ({ row }) => {
        const date = row.getValue('data_nascimento') as string | null | undefined;
        if (!date) return '—';
        const parts = String(date).split('-');
        if (parts.length < 3) return String(date);
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/students/edit/${student.id}`)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir o aluno "{student.nome}"? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(student.id!)}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  // Obter séries únicas para o filtro
  const series = Array.from(new Set(students.map(student => student.serie)))
    .sort((a, b) => a - b)
    .map(serie => serie.toString());

  
  // 'anos' agora vem do estado carregado diretamente do banco (getStudentYears)

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Alunos</h1>
          <div className="flex gap-2">
            <StudentsImport onSuccess={fetchStudents} />
            <Button onClick={() => navigate('/students/new')}>
              <Plus className="mr-2 h-4 w-4" /> Novo Aluno
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <Label htmlFor="name-filter">Nome</Label>
                <Input
                  id="name-filter"
                  placeholder="Filtrar por nome..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                />
              </div>
              <div className="w-full md:w-32">
                <Label htmlFor="serie-filter">Série</Label>
                <Select
                  value={serieFilter}
                  onValueChange={setSerieFilter}
                >
                  <SelectTrigger id="serie-filter">
                    <SelectValue placeholder="Série" />
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
              <div className="w-full md:w-32">
                <Label htmlFor="turma-filter">Turma</Label>
                <Select
                  value={turmaFilter}
                  onValueChange={setTurmaFilter}
                >
                  <SelectTrigger id="turma-filter">
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
              <div className="w-full md:w-40">
                <Label htmlFor="turno-filter">Turno</Label>
                <Select
                  value={turnoFilter}
                  onValueChange={setTurnoFilter}
                >
                  <SelectTrigger id="turno-filter">
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
              
              <div className="w-full md:w-32">
                <AnoLetivoFilter
                  value={anoFilter}
                  onValueChange={setAnoFilter}
                  years={anos}
                  id="ano-filter"
                  placeholder="Ano Letivo"
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground mb-2">
              Total: <span className="font-semibold">{totalCount}</span> alunos · Página {currentPage} de {totalPages}
            </div>
            <DataTable
              columns={columns}
              data={students}
            />
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground px-2">Página {currentPage} de {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
