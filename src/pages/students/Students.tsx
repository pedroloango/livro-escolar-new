
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getStudents, deleteStudent } from '@/services/studentService';
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
import { Input } from '@/components/ui/input';
import StudentsImport from '@/components/students/StudentsImport';

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [serieFilter, setSerieFilter] = useState<string>('all');
  const [turmaFilter, setTurmaFilter] = useState<string>('all');
  const [turnoFilter, setTurnoFilter] = useState<string>('all');
  const [nameFilter, setNameFilter] = useState<string>('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    // Apply filters when students, name filter, serie filter, or turno filter changes
    let result = [...students];
    
    // Apply name filter
    if (nameFilter) {
      result = result.filter(student => 
        student.nome.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }
    
    // Apply serie filter
    if (serieFilter && serieFilter !== 'all') {
      result = result.filter(student => 
        student.serie.toString() === serieFilter
      );
    }
    
    // Apply turma filter
    if (turmaFilter && turmaFilter !== 'all') {
      result = result.filter(student => 
        student.turma === turmaFilter
      );
    }
    
    // Apply turno filter
    if (turnoFilter && turnoFilter !== 'all') {
      result = result.filter(student => 
        student.turno === turnoFilter
      );
    }
    
    setFilteredStudents(result);
  }, [students, nameFilter, serieFilter, turmaFilter, turnoFilter]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await getStudents();
      setStudents(data);
      setFilteredStudents(data);
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
      accessorKey: 'sexo',
      header: 'Sexo',
    },
    {
      accessorKey: 'data_nascimento',
      header: 'Data de Nascimento',
      cell: ({ row }) => {
        const date = row.getValue('data_nascimento') as string;
        const [year, month, day] = date.split('-');
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

  // Obter turmas únicas para o filtro
  const turmas = Array.from(new Set(students.map(student => student.turma))).sort();

  // Obter turnos únicos para o filtro
  const turnos = Array.from(new Set(students.map(student => student.turno)));

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
            </div>

            <DataTable
              columns={columns}
              data={filteredStudents}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
