import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AnoLetivoFilter from '@/components/common/AnoLetivoFilter';

export interface LoansFilterBarProps {
  studentFilter: string;
  setStudentFilter: (v: string) => void;
  bookFilter: string;
  setBookFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  anoFilter: string;
  setAnoFilter: (v: string) => void;
  serieFilter: string;
  setSerieFilter: (v: string) => void;
  turmaFilter: string;
  setTurmaFilter: (v: string) => void;
  uniqueYears: string[];
  uniqueSeries: string[];
  uniqueTurmas: string[];
  loadingAllLoans?: boolean;
  allLoansCount?: number;
  filteredCount?: number;
  onFetchAll?: () => void;
  onClearFilters: () => void;
  /** Grid class for layout (standalone vs embedded) */
  gridClass?: string;
}

export default function LoansFilterBar({
  studentFilter,
  setStudentFilter,
  bookFilter,
  setBookFilter,
  statusFilter,
  setStatusFilter,
  anoFilter,
  setAnoFilter,
  serieFilter,
  setSerieFilter,
  turmaFilter,
  setTurmaFilter,
  uniqueYears,
  uniqueSeries,
  uniqueTurmas,
  loadingAllLoans = false,
  allLoansCount = 0,
  filteredCount = 0,
  onFetchAll,
  onClearFilters,
  gridClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4',
}: LoansFilterBarProps) {
  const hasFilters =
    !!studentFilter ||
    !!bookFilter ||
    statusFilter !== '' ||
    serieFilter !== '' ||
    turmaFilter !== '' ||
    anoFilter !== '';

  return (
    <>
      <div className={gridClass}>
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
        <AnoLetivoFilter
          value={anoFilter}
          onValueChange={setAnoFilter}
          years={uniqueYears}
          id="ano-filter"
          placeholder="Todos os anos"
        />
        <div>
          <Label htmlFor="serie-filter">Série</Label>
          <Select value={serieFilter} onValueChange={setSerieFilter}>
            <SelectTrigger id="serie-filter">
              <SelectValue placeholder="Todas as séries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {uniqueSeries.map((serie) => (
                <SelectItem key={serie} value={serie}>
                  {serie}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="turma-filter">Turma</Label>
          <Select value={turmaFilter} onValueChange={setTurmaFilter}>
            <SelectTrigger id="turma-filter">
              <SelectValue placeholder="Todas as turmas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {uniqueTurmas.map((turma) => (
                <SelectItem key={turma} value={turma}>
                  {turma}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loadingAllLoans && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600" />
            <div className="text-sm text-yellow-800">
              <strong>Carregando todos os empréstimos...</strong> Isso pode levar alguns segundos para grandes volumes de dados.
            </div>
          </div>
        </div>
      )}

      {!loadingAllLoans && allLoansCount > 0 && onFetchAll && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-green-800">
              <strong>Dados completos carregados:</strong> {allLoansCount} empréstimos disponíveis para filtros
            </div>
            <Button variant="outline" size="sm" onClick={onFetchAll} disabled={loadingAllLoans}>
              {loadingAllLoans ? 'Carregando...' : 'Recarregar Todos'}
            </Button>
          </div>
        </div>
      )}

      {hasFilters && !loadingAllLoans && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800">
              <strong>Filtros aplicados:</strong> Mostrando {filteredCount} de {allLoansCount} empréstimos
            </div>
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
