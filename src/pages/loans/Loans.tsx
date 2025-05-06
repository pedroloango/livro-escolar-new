import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, ArrowDownToLine } from 'lucide-react';
import { getLoans, deleteLoan } from '@/services/loanService';
import { Loan } from '@/types';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';

interface LoansProps {
  returnMode?: boolean;
  onSelectLoanForReturn?: (loan: Loan) => void;
  standalone?: boolean;
}

export default function Loans({ 
  returnMode = false, 
  onSelectLoanForReturn,
  standalone = true 
}: LoansProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredLoans, setFilteredLoans] = useState<Loan[]>([]);
  const [studentFilter, setStudentFilter] = useState('');
  const [bookFilter, setBookFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);

  useEffect(() => {
    fetchLoans();
  }, []);

  useEffect(() => {
    let result = [...loans];
    
    if (studentFilter) {
      result = result.filter(loan => 
        loan.aluno?.nome.toLowerCase().includes(studentFilter.toLowerCase())
      );
    }
    
    if (bookFilter) {
      result = result.filter(loan => 
        loan.livro?.titulo.toLowerCase().includes(bookFilter.toLowerCase())
      );
    }
    
    if (statusFilter && statusFilter !== 'all') {
      result = result.filter(loan => loan.status === statusFilter);
    }
    
    setFilteredLoans(result);
  }, [loans, studentFilter, bookFilter, statusFilter]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const data = await getLoans();
      setLoans(data);
      setFilteredLoans(data);
    } catch (error) {
      console.error('Failed to fetch loans:', error);
      toast.error('Erro ao carregar empréstimos');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnClick = (loan: Loan) => {
    if (returnMode && onSelectLoanForReturn) {
      onSelectLoanForReturn(loan);
    } else {
      navigate('/returns', { state: { loanId: loan.id } });
    }
  };

  const handleDeleteClick = (loan: Loan) => {
    setLoanToDelete(loan);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!loanToDelete) return;
    console.log('Tentando excluir empréstimo:', loanToDelete.id);
    try {
      await deleteLoan(loanToDelete.id!);
      toast.success('Empréstimo excluído com sucesso!');
      setDeleteDialogOpen(false);
      setLoanToDelete(null);
      fetchLoans();
    } catch (error) {
      toast.error('Erro ao excluir empréstimo');
    }
  };

  const columns: ColumnDef<Loan>[] = [
    {
      accessorKey: 'aluno.nome',
      header: 'Aluno',
      cell: ({ row }) => row.original.aluno?.nome || 'N/A',
    },
    {
      accessorKey: 'livro.titulo',
      header: 'Livro',
      cell: ({ row }) => row.original.livro?.titulo || 'N/A',
    },
    {
      accessorKey: 'data_retirada',
      header: 'Data de Retirada',
      cell: ({ row }) => {
        const date = row.getValue('data_retirada') as string;
        // Use parseISO to correctly parse the ISO date string before formatting
        return format(parseISO(date), 'dd/MM/yyyy');
      },
    },
    {
      accessorKey: 'quantidade_retirada',
      header: 'Quantidade',
      cell: ({ row }) => {
        const loan = row.original;
        if (loan.status === 'Pendente' && loan.quantidade_devolvida) {
          return (
            <div>
              <span>{loan.quantidade_retirada}</span>
              <span className="text-xs text-muted-foreground ml-1">
                ({loan.quantidade_devolvida} devolvidos, {loan.quantidade_retirada - loan.quantidade_devolvida} pendentes)
              </span>
            </div>
          );
        }
        return loan.quantidade_retirada;
      }
    },
    {
      accessorKey: 'data_devolucao',
      header: 'Data de Devolução',
      cell: ({ row }) => {
        const date = row.getValue('data_devolucao') as string;
        return date ? format(parseISO(date), 'dd/MM/yyyy') : 'Pendente';
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge
            variant={
              status === 'Emprestado' ? 'default' : 
              status === 'Pendente' ? 'warning' : 
              'secondary'
            }
          >
            {status}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const loan = row.original;
        return (
          <div className="flex gap-2">
            {(loan.status === 'Emprestado' || loan.status === 'Pendente') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReturnClick(loan)}
                className="flex items-center gap-1"
              >
                <ArrowDownToLine className="h-4 w-4" />
                Devolver
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteClick(loan)}
            >
              Excluir
            </Button>
          </div>
        );
      },
    },
  ];

  // Rendering with proper layout structure
  if (standalone) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight">Empréstimos</h1>
            <Button onClick={() => navigate('/loans/new')}>
              <Plus className="mr-2 h-4 w-4" /> Novo Empréstimo
            </Button>
          </div>

          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="student-filter">Aluno</Label>
                  <Input
                    id="student-filter"
                    placeholder="Buscar por aluno..."
                    value={studentFilter}
                    onChange={(e) => setStudentFilter(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="book-filter">Livro</Label>
                  <Input
                    id="book-filter"
                    placeholder="Buscar por livro..."
                    value={bookFilter}
                    onChange={(e) => setBookFilter(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger id="status-filter">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Emprestado">Emprestado</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Devolvido">Devolvido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DataTable
                columns={columns}
                data={filteredLoans}
              />
            </>
          )}
        </div>
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
            </DialogHeader>
            <p>Tem certeza que deseja excluir este empréstimo? Esta ação não poderá ser desfeita.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    );
  }

  // Non-standalone mode for embedding in other components
  return (
    <div className="space-y-4">
      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="student-filter">Aluno</Label>
              <Input
                id="student-filter"
                placeholder="Buscar por aluno..."
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="book-filter">Livro</Label>
              <Input
                id="book-filter"
                placeholder="Buscar por livro..."
                value={bookFilter}
                onChange={(e) => setBookFilter(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Emprestado">Emprestado</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Devolvido">Devolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredLoans}
          />
        </>
      )}
    </div>
  );
}
