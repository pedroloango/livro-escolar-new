import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, ArrowDownToLine, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getLoans, deleteLoan, getLoansCount, getLoanFilterOptions } from '@/services/loanService';
import { Loan } from '@/types';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import LoansFilterBar from '@/components/loans/LoansFilterBar';

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
  const [exporting, setExporting] = useState(false);
  const [studentFilter, setStudentFilter] = useState('');
  const [bookFilter, setBookFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [anoFilter, setAnoFilter] = useState('');
  const [serieFilter, setSerieFilter] = useState('');
  const [turmaFilter, setTurmaFilter] = useState('');
  const [filterOptions, setFilterOptions] = useState<{ years: string[]; series: string[]; turmas: string[] }>({ years: [], series: [], turmas: [] });
  const [loadingAllLoans, setLoadingAllLoans] = useState(false);
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;
  const navigate = useNavigate();

  const serverFilters = () => {
    const f: { ano_letivo?: string; serie?: string; turma?: string; status?: string } = {};
    if (anoFilter && anoFilter !== 'all') f.ano_letivo = anoFilter;
    if (serieFilter && serieFilter !== 'all') f.serie = serieFilter;
    if (turmaFilter && turmaFilter !== 'all') f.turma = turmaFilter;
    if (statusFilter && statusFilter !== 'all') f.status = statusFilter;
    return Object.keys(f).length ? f : undefined;
  };

  useEffect(() => {
    getLoanFilterOptions().then(setFilterOptions);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [anoFilter, serieFilter, turmaFilter, statusFilter]);

  useEffect(() => {
    fetchLoans();
  }, [currentPage, anoFilter, serieFilter, turmaFilter, statusFilter]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;
      const filters = serverFilters();
      const [data, count] = await Promise.all([
        getLoans(itemsPerPage, offset, filters),
        getLoansCount(filters),
      ]);
      setLoans(data);
      setTotalCount(count);
      setTotalPages(Math.max(1, Math.ceil(count / itemsPerPage)));
    } catch (error) {
      console.error('Failed to fetch loans:', error);
      toast.error('Erro ao carregar empréstimos');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLoans = async () => {
    try {
      setLoadingAllLoans(true);
      let allData: Loan[] = [];
      let page = 0;
      const pageSize = 1000;
      const filters = serverFilters();
      let hasMore = true;
      while (hasMore) {
        const data = await getLoans(pageSize, page * pageSize, filters);
        if (!data.length) break;
        allData = [...allData, ...data];
        page++;
        if (data.length < pageSize) break;
      }
      setAllLoans(allData);
    } catch (error) {
      console.error('Failed to fetch all loans:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoadingAllLoans(false);
    }
  };

  const applyFilters = () => {
    let data = allLoans;
    if (studentFilter) data = data.filter(l => l.aluno?.nome?.toLowerCase().includes(studentFilter.toLowerCase()));
    if (bookFilter) data = data.filter(l => l.livro?.titulo?.toLowerCase().includes(bookFilter.toLowerCase()));
    if (statusFilter && statusFilter !== 'all') data = data.filter(l => l.status === statusFilter);
    if (serieFilter && serieFilter !== 'all') data = data.filter(l => l.aluno?.serie === serieFilter);
    if (turmaFilter && turmaFilter !== 'all') data = data.filter(l => l.aluno?.turma === turmaFilter);
    if (anoFilter && anoFilter !== 'all') data = data.filter(l => String(l.aluno?.ano_letivo || '').toLowerCase().includes(String(anoFilter).toLowerCase().trim()));
    return data;
  };

  const getUniqueYears = () => filterOptions.years;
  const getUniqueSeries = () => filterOptions.series;
  const getUniqueTurmas = () => filterOptions.turmas;

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
    try {
      await deleteLoan(loanToDelete.id!);
      toast.success('Empréstimo excluído com sucesso!');
      setDeleteDialogOpen(false);
      setLoanToDelete(null);
      await fetchLoans();
      if (allLoans.length) fetchAllLoans();
    } catch (error) {
      toast.error('Erro ao excluir empréstimo');
    }
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      toast.info('Buscando todos os empréstimos filtrados...');
      
      const filters = serverFilters();
      let allFilteredData: Loan[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const data = await getLoans(pageSize, page * pageSize, filters);
        if (!data.length) break;
        let filteredPage = data;
        if (studentFilter) filteredPage = filteredPage.filter(l => l.aluno?.nome?.toLowerCase().includes(studentFilter.toLowerCase()));
        if (bookFilter) filteredPage = filteredPage.filter(l => l.livro?.titulo?.toLowerCase().includes(bookFilter.toLowerCase()));
        allFilteredData = [...allFilteredData, ...filteredPage];
        page++;
        if (data.length < pageSize) break;
      }

      if (allFilteredData.length === 0) {
        toast.error('Não há empréstimos para exportar com os filtros aplicados');
        return;
      }

      // Preparar os dados para exportação
      const excelData = allFilteredData.map(loan => ({
        'Aluno': loan.aluno?.nome || 'N/A',
        'Livro': loan.livro?.titulo || 'N/A',
        'Data de Retirada': loan.data_retirada ? format(parseISO(loan.data_retirada), 'dd/MM/yyyy') : 'N/A',
        'Quantidade': loan.quantidade_retirada || 0,
        'Data de Devolução': loan.data_devolucao ? format(parseISO(loan.data_devolucao), 'dd/MM/yyyy') : 'Pendente',
        'Status': loan.status || 'N/A',
        'Série': loan.aluno?.serie || 'N/A',
        'Turma': loan.aluno?.turma || 'N/A',
      }));

      // Criar workbook e worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Empréstimos');

      // Ajustar largura das colunas
      const columnWidths = [
        { wch: 30 }, // Aluno
        { wch: 40 }, // Livro
        { wch: 18 }, // Data de Retirada
        { wch: 12 }, // Quantidade
        { wch: 18 }, // Data de Devolução
        { wch: 15 }, // Status
        { wch: 10 }, // Série
        { wch: 10 }, // Turma
      ];
      worksheet['!cols'] = columnWidths;

      // Gerar nome do arquivo com data atual
      const fileName = `emprestimos_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.xlsx`;

      // Salvar arquivo
      XLSX.writeFile(workbook, fileName);
      toast.success(`Arquivo Excel exportado com sucesso! (${allFilteredData.length} empréstimos)`);
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      toast.error('Erro ao exportar para Excel');
    } finally {
      setExporting(false);
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
      accessorKey: 'aluno.ano_letivo',
      header: 'Ano Letivo',
      cell: ({ row }) => row.original.aluno?.ano_letivo || '—',
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
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={exportToExcel}
                disabled={loading || exporting}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" /> 
                {exporting ? 'Exportando...' : 'Exportar para Excel'}
              </Button>
              <Button onClick={() => navigate('/loans/new')}>
                <Plus className="mr-2 h-4 w-4" /> Novo Empréstimo
              </Button>
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton type="table" />
          ) : (
            <>
              <LoansFilterBar
                studentFilter={studentFilter}
                setStudentFilter={setStudentFilter}
                bookFilter={bookFilter}
                setBookFilter={setBookFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                anoFilter={anoFilter}
                setAnoFilter={setAnoFilter}
                serieFilter={serieFilter}
                setSerieFilter={setSerieFilter}
                turmaFilter={turmaFilter}
                setTurmaFilter={setTurmaFilter}
                uniqueYears={getUniqueYears()}
                uniqueSeries={getUniqueSeries()}
                uniqueTurmas={getUniqueTurmas()}
                loadingAllLoans={loadingAllLoans}
                allLoansCount={totalCount}
                filteredCount={loans.length}
                onFetchAll={fetchAllLoans}
                onClearFilters={() => {
                  setStudentFilter('');
                  setBookFilter('');
                  setStatusFilter('');
                  setSerieFilter('');
                  setTurmaFilter('');
                  setAnoFilter('');
                }}
                gridClass="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4"
              />

              <DataTable
                columns={columns}
                data={loans}
              />
              
              {totalCount > itemsPerPage && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Mostrando {loans.length} de {totalCount} empréstimos</span>
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
          <LoansFilterBar
            studentFilter={studentFilter}
            setStudentFilter={setStudentFilter}
            bookFilter={bookFilter}
            setBookFilter={setBookFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            anoFilter={anoFilter}
            setAnoFilter={setAnoFilter}
            serieFilter={serieFilter}
            setSerieFilter={setSerieFilter}
            turmaFilter={turmaFilter}
            setTurmaFilter={setTurmaFilter}
            uniqueYears={getUniqueYears()}
            uniqueSeries={getUniqueSeries()}
            uniqueTurmas={getUniqueTurmas()}
            loadingAllLoans={loadingAllLoans}
            allLoansCount={totalCount}
            filteredCount={loans.length}
            onFetchAll={fetchAllLoans}
            onClearFilters={() => {
              setStudentFilter('');
              setBookFilter('');
              setStatusFilter('');
              setSerieFilter('');
              setTurmaFilter('');
              setAnoFilter('');
            }}
            gridClass="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
          />

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
          {!loadingAllLoans && totalCount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-green-800">
                  <strong>Total:</strong> {totalCount} empréstimos
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
                  <strong>Filtros aplicados:</strong> Mostrando {loans.length} de {totalCount} empréstimos
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
            data={loans}
          />
          
{totalCount > itemsPerPage && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Mostrando {loans.length} de {totalCount} empréstimos</span>
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
