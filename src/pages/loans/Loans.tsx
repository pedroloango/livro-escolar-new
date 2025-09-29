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
import { Pagination } from '@/components/ui/pagination';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

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
  const [allLoans, setAllLoans] = useState<Loan[]>([]); // Todos os empréstimos para filtros
  const [loadingAllLoans, setLoadingAllLoans] = useState(false); // Loading para busca completa
  const [studentFilter, setStudentFilter] = useState('');
  const [bookFilter, setBookFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serieFilter, setSerieFilter] = useState('');
  const [turmaFilter, setTurmaFilter] = useState('');
  const navigate = useNavigate();
  
  // Get unique series and turmas from loans
  const getUniqueSeries = () => {
    const series = [...new Set(allLoans.map(loan => loan.aluno?.serie).filter(Boolean))];
    return series.sort();
  };
  
  const getUniqueTurmas = () => {
    const turmas = [...new Set(allLoans.map(loan => loan.aluno?.turma).filter(Boolean))];
    return turmas.sort();
  };
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchLoans();
  }, [currentPage]);

  useEffect(() => {
    // Apply filters to existing data without refetching
    applyFilters();
  }, [studentFilter, bookFilter, statusFilter, serieFilter, turmaFilter, allLoans]);

  const applyFilters = () => {
    let filteredData = allLoans;
    
    if (studentFilter) {
      filteredData = filteredData.filter(loan => 
        loan.aluno?.nome?.toLowerCase().includes(studentFilter.toLowerCase())
      );
    }
    
    if (bookFilter) {
      filteredData = filteredData.filter(loan => 
        loan.livro?.titulo?.toLowerCase().includes(bookFilter.toLowerCase())
      );
    }
    
    if (statusFilter && statusFilter !== 'all') {
      filteredData = filteredData.filter(loan => loan.status === statusFilter);
    }
    
    if (serieFilter && serieFilter !== 'all') {
      filteredData = filteredData.filter(loan => 
        loan.aluno?.serie === serieFilter
      );
    }
    
    if (turmaFilter && turmaFilter !== 'all') {
      filteredData = filteredData.filter(loan => 
        loan.aluno?.turma === turmaFilter
      );
    }
    
    setFilteredLoans(filteredData);
  };

  const fetchAllLoans = async () => {
    try {
      setLoadingAllLoans(true);
      console.log('Iniciando busca de todos os empréstimos...');
      let allData: Loan[] = [];
      let page = 0;
      const pageSize = 1000; // Tamanho da página para buscar
      let hasMore = true;

      while (hasMore) {
        const offset = page * pageSize;
        console.log(`Buscando página ${page + 1}, offset: ${offset}`);
        
        const data = await getLoans(pageSize, offset);
        console.log(`Página ${page + 1}: ${data.length} empréstimos encontrados`);
        
        if (data.length === 0) {
          hasMore = false;
        } else {
          allData = [...allData, ...data];
          page++;
          
          // Se retornou menos que o pageSize, não há mais dados
          if (data.length < pageSize) {
            hasMore = false;
          }
        }
      }

      console.log(`Total de empréstimos carregados: ${allData.length}`);
      setAllLoans(allData);
    } catch (error) {
      console.error('Failed to fetch all loans:', error);
      toast.error('Erro ao carregar dados para filtros');
    } finally {
      setLoadingAllLoans(false);
    }
  };

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;
      const data = await getLoans(itemsPerPage, offset);
      
      setLoans(data);
      
      // Se é a primeira página, também buscar todos os empréstimos para filtros
      if (currentPage === 1) {
        await fetchAllLoans();
      }
      
      // For now, we'll estimate total pages based on current data
      // In a real app, you'd get this from the server
      setTotalPages(Math.ceil(data.length / itemsPerPage));
      setTotalCount(data.length);
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
      // Recarregar dados da página atual e todos os empréstimos
      await fetchLoans();
      await fetchAllLoans();
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
            <LoadingSkeleton type="table" />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                
                <div>
                  <Label htmlFor="serie-filter">Série</Label>
                  <Select
                    value={serieFilter}
                    onValueChange={setSerieFilter}
                  >
                    <SelectTrigger id="serie-filter">
                      <SelectValue placeholder="Todas as séries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {getUniqueSeries().map(serie => (
                        <SelectItem key={serie} value={serie}>{serie}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="turma-filter">Turma</Label>
                  <Select
                    value={turmaFilter}
                    onValueChange={setTurmaFilter}
                  >
                    <SelectTrigger id="turma-filter">
                      <SelectValue placeholder="Todas as turmas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {getUniqueTurmas().map(turma => (
                        <SelectItem key={turma} value={turma}>{turma}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Indicador de carregamento de todos os empréstimos */}
              {loadingAllLoans && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                    <div className="text-sm text-yellow-800">
                      <strong>Carregando todos os empréstimos...</strong> Isso pode levar alguns segundos para grandes volumes de dados.
                    </div>
                  </div>
                </div>
              )}

              {/* Botão para recarregar todos os empréstimos */}
              {!loadingAllLoans && allLoans.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-green-800">
                      <strong>Dados completos carregados:</strong> {allLoans.length} empréstimos disponíveis para filtros
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchAllLoans}
                      disabled={loadingAllLoans}
                    >
                      {loadingAllLoans ? 'Carregando...' : 'Recarregar Todos'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Indicador de filtros aplicados */}
              {(studentFilter || bookFilter || statusFilter !== '' || serieFilter !== '' || turmaFilter !== '') && !loadingAllLoans && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-blue-800">
                      <strong>Filtros aplicados:</strong> Mostrando {filteredLoans.length} de {allLoans.length} empréstimos
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setStudentFilter('');
                        setBookFilter('');
                        setStatusFilter('');
                        setSerieFilter('');
                        setTurmaFilter('');
                      }}
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              )}

              <DataTable
                columns={columns}
                data={filteredLoans.slice(0, itemsPerPage)}
              />
              
              {filteredLoans.length > itemsPerPage && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {Math.min(itemsPerPage, filteredLoans.length)} de {filteredLoans.length} empréstimos filtrados
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total de empréstimos: {allLoans.length}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Non-standalone mode for embedding in other components
  return (
    <div className="space-y-4">
      {loading ? (
        <LoadingSkeleton type="table" />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
            
            <div>
              <Label htmlFor="serie-filter">Série</Label>
              <Select
                value={serieFilter}
                onValueChange={setSerieFilter}
              >
                <SelectTrigger id="serie-filter">
                  <SelectValue placeholder="Todas as séries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {getUniqueSeries().map(serie => (
                    <SelectItem key={serie} value={serie}>{serie}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="turma-filter">Turma</Label>
              <Select
                value={turmaFilter}
                onValueChange={setTurmaFilter}
              >
                <SelectTrigger id="turma-filter">
                  <SelectValue placeholder="Todas as turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {getUniqueTurmas().map(turma => (
                    <SelectItem key={turma} value={turma}>{turma}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Indicador de carregamento de todos os empréstimos */}
          {loadingAllLoans && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                <div className="text-sm text-yellow-800">
                  <strong>Carregando todos os empréstimos...</strong> Isso pode levar alguns segundos para grandes volumes de dados.
                </div>
              </div>
            </div>
          )}

          {/* Botão para recarregar todos os empréstimos */}
          {!loadingAllLoans && allLoans.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-green-800">
                  <strong>Dados completos carregados:</strong> {allLoans.length} empréstimos disponíveis para filtros
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchAllLoans}
                  disabled={loadingAllLoans}
                >
                  {loadingAllLoans ? 'Carregando...' : 'Recarregar Todos'}
                </Button>
              </div>
            </div>
          )}

          {/* Indicador de filtros aplicados */}
          {(studentFilter || bookFilter || statusFilter !== '' || serieFilter !== '' || turmaFilter !== '') && !loadingAllLoans && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-800">
                  <strong>Filtros aplicados:</strong> Mostrando {filteredLoans.length} de {allLoans.length} empréstimos
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setStudentFilter('');
                    setBookFilter('');
                    setStatusFilter('');
                    setSerieFilter('');
                    setTurmaFilter('');
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          )}

          <DataTable
            columns={columns}
            data={filteredLoans.slice(0, itemsPerPage)}
          />
          
          {filteredLoans.length > itemsPerPage && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {Math.min(itemsPerPage, filteredLoans.length)} de {filteredLoans.length} empréstimos filtrados
              </div>
              <div className="text-sm text-muted-foreground">
                Total de empréstimos: {allLoans.length}
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Dialog de confirmação de exclusão - sempre renderizado */}
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
    </div>
  );
}
