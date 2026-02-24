import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardStats } from '@/services/loanService';
import { getStudentYears } from '@/services/studentService';
import { getStorytellingsByProfessional, getStorytellingsBySerieTurma, getAllStorytellingsCount } from '@/services/storytellingService';
import { Link } from 'react-router-dom';
import { Book, Users, BookMarked, ArrowDownToLine, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCache } from '@/hooks/useCache';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Title,
  ChartDataLabels
);

export default function Dashboard() {
  const [anoFilter, setAnoFilter] = useState<string>('all');
  const [anos, setAnos] = useState<string[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalBooks: 0,
    activeLoans: 0,
    totalLoans: 0,
    totalStorytellings: 0,
  });
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Novos estados para os gráficos
  const [emprestimosPorSerie, setEmprestimosPorSerie] = useState<any>(null);
  const [emprestimosPorSerieTurma, setEmprestimosPorSerieTurma] = useState<any>(null);
  const [emprestimosPorStatus, setEmprestimosPorStatus] = useState<any>(null);
  const [topAlunos, setTopAlunos] = useState<any>(null);
  const [emprestimosPorMes, setEmprestimosPorMes] = useState<any>(null);
  
  // Estados para gráficos de storytelling
  const [storytellingPorProfissional, setStorytellingPorProfissional] = useState<any>(null);
  const [storytellingPorSerieTurma, setStorytellingPorSerieTurma] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Use cache for dashboard data with 2 minutes TTL, include anoFilter in key
  const cacheKey = `dashboard-stats-${anoFilter}`;
  const { data: dashboardData, loading: dashboardLoading, refetch } = useCache(
    cacheKey,
    () => getDashboardStats(anoFilter === 'all' ? undefined : anoFilter),
    { ttl: 2 * 60 * 1000, enabled: !authLoading && isAuthenticated }
  );

  // Load years for the filter
  useEffect(() => {
    const loadYears = async () => {
      try {
        const studentYears = await getStudentYears();
        let storytellingYears: string[] = [];
        try {
          // getStorytellingYears may return years present in contacao_historias
          const { getStorytellingYears } = await import('@/services/storytellingService');
          storytellingYears = await getStorytellingYears();
        } catch (err) {
          console.warn('getStorytellingYears not available or failed:', err);
        }

        const combined = Array.from(new Set([...studentYears, ...storytellingYears])).sort((a, b) => Number(a) - Number(b));
        setAnos(combined);
      } catch (err) {
        console.error('Erro ao carregar anos letivos:', err);
      }
    };
    if (!authLoading && isAuthenticated) loadYears();
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (dashboardData) {
      setStats({
        totalStudents: dashboardData.totalStudents,
        totalBooks: dashboardData.totalBooks,
        activeLoans: dashboardData.activeLoans,
        totalLoans: dashboardData.totalLoans,
        totalStorytellings: dashboardData.totalStorytellings,
      });

      // Gráfico de Empréstimos por Série/Turma (novo formato) - Ordenado por valores decrescentes
      const serieTurmaEntries = Object.entries(dashboardData.emprestimosPorSerieTurma);
      const sortedSerieTurma = serieTurmaEntries.sort((a, b) => b[1] - a[1]);
      const serieTurmaLabels = sortedSerieTurma.map(([label]) => label);
      const serieTurmaData = sortedSerieTurma.map(([, value]) => value);
      
      setEmprestimosPorSerieTurma({
        labels: serieTurmaLabels,
        datasets: [
          {
            label: 'Empréstimos por Série/Turma',
            data: serieTurmaData,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
          },
        ],
      });

      // Gráfico de Empréstimos por Série (mantido para compatibilidade)
      const serieLabels = Object.keys(dashboardData.emprestimosPorSerie);
      const serieData = Object.values(dashboardData.emprestimosPorSerie);
      setEmprestimosPorSerie({
        labels: serieLabels,
        datasets: [
          {
            label: 'Empréstimos por Série',
            data: serieData,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
          },
        ],
      });

      // Gráfico de Empréstimos por Status
      const statusLabels = Object.keys(dashboardData.emprestimosPorStatus);
      const statusData = Object.values(dashboardData.emprestimosPorStatus);
      setEmprestimosPorStatus({
        labels: statusLabels,
        datasets: [
          {
            data: statusData,
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#8884d8', '#82ca9d'],
          },
        ],
      });

      // Gráfico Top 15 Alunos
      setTopAlunos({
        labels: dashboardData.topAlunos.map(item => item.nome),
        datasets: [
          {
            label: 'Top 15 Alunos',
            data: dashboardData.topAlunos.map(item => item.count),
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
          },
        ],
      });

      // Gráfico de Empréstimos por Mês (últimos 6 meses) - Dados reais do banco
      const mesesEntries = Object.entries(dashboardData.emprestimosPorMes || {});
      const mesesLabels = mesesEntries.map(([label]) => label);
      const mesesData = mesesEntries.map(([, value]) => value);
      setEmprestimosPorMes({
        labels: mesesLabels,
        datasets: [
          {
            label: 'Empréstimos por Mês',
            data: mesesData,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1,
          },
        ],
      });
    }
  }, [dashboardData]);

  // Carregar dados de storytelling separadamente
  useEffect(() => {
    const loadStorytellingData = async () => {
      try {
        // Primeiro, verificar o total de registros na tabela (aplicando filtro de ano)
        const totalCount = await getAllStorytellingsCount(anoFilter === 'all' ? undefined : anoFilter);
        setDebugInfo(`Total na tabela: ${totalCount} registros`);
        
        // Gráfico de rosca - Contação por Profissional (aplicando filtro de ano)
        const profissionalData = await getStorytellingsByProfessional(anoFilter === 'all' ? undefined : anoFilter);
        const profissionalLabels = Object.keys(profissionalData);
        const profissionalValues = Object.values(profissionalData);
        
        setStorytellingPorProfissional({
          labels: profissionalLabels,
          datasets: [
            {
              data: profissionalValues,
              backgroundColor: [
                '#FF6384', '#36A2EB', '#FFCE56', '#8884d8', '#82ca9d',
                '#ff9f40', '#ff6384', '#c9cbcf', '#4bc0c0', '#9966ff'
              ],
            },
          ],
        });

        // Gráfico de barra - Contação por Série/Turma - Ordenado por valores decrescentes (aplicando filtro de ano)
        const serieTurmaData = await getStorytellingsBySerieTurma(anoFilter === 'all' ? undefined : anoFilter);
        const serieTurmaEntries = Object.entries(serieTurmaData);
        const sortedSerieTurma = serieTurmaEntries.sort((a, b) => b[1] - a[1]);
        const serieTurmaLabels = sortedSerieTurma.map(([label]) => label);
        const serieTurmaValues = sortedSerieTurma.map(([, value]) => value);
        
        setStorytellingPorSerieTurma({
          labels: serieTurmaLabels,
          datasets: [
            {
              label: 'Contações por Série/Turma',
              data: serieTurmaValues,
              backgroundColor: 'rgba(255, 99, 132, 0.6)',
            },
          ],
        });
        
        console.log(`Debug - Total: ${totalCount}, Profissionais: ${profissionalLabels.length}, Série/Turma: ${serieTurmaLabels.length}`);
      } catch (error) {
        console.error('Erro ao carregar dados de storytelling:', error);
      }
    };

    if (isAuthenticated && !authLoading) {
      loadStorytellingData();
    }
  }, [isAuthenticated, authLoading, anoFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {isAuthenticated 
            ? 'Bem-vindo Usuário ao Sistema de Controle de Empréstimos de Livros!'
            : 'Bem-vindo Usuário ao Sistema de Controle de Empréstimos de Livros!'
          }
        </p>

        <div className="flex items-center gap-4">
          <div className="w-48">
            <Label htmlFor="dashboard-ano-filter">Ano Letivo</Label>
            <Select value={anoFilter} onValueChange={setAnoFilter}>
              <SelectTrigger id="dashboard-ano-filter">
                <SelectValue placeholder="Todos os anos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {anos.map((ano) => (
                  <SelectItem key={ano} value={ano}>
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Debug Info */}
        {debugInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-800">
              <strong>Debug:</strong> {debugInfo}
            </div>
          </div>
        )}

        {(authLoading || dashboardLoading) ? (
          <LoadingSkeleton type="card" count={5} />
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            <Link to="/students">
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-medium">
                      Total de Alunos
                    </CardTitle>
                    <CardDescription>
                      Alunos cadastrados no sistema
                    </CardDescription>
                  </div>
                  <div className="text-primary bg-primary/10 p-2 rounded-md">
                    <Users className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalStudents}</div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/books">
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-medium">
                      Total de Livros
                    </CardTitle>
                    <CardDescription>
                      Livros cadastrados no sistema
                    </CardDescription>
                  </div>
                  <div className="text-primary bg-primary/10 p-2 rounded-md">
                    <Book className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBooks}</div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/loans">
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-medium">
                      Empréstimos Ativos
                    </CardTitle>
                    <CardDescription>
                      Empréstimos em andamento
                    </CardDescription>
                  </div>
                  <div className="text-primary bg-primary/10 p-2 rounded-md">
                    <BookMarked className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeLoans}</div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/returns">
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-medium">
                      Total de Empréstimos
                    </CardTitle>
                    <CardDescription>
                      Histórico de empréstimos
                    </CardDescription>
                  </div>
                  <div className="text-primary bg-primary/10 p-2 rounded-md">
                    <ArrowDownToLine className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalLoans}</div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/storytelling">
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-medium">
                      Contação de Histórias
                    </CardTitle>
                    <CardDescription>
                      Sessões de contação realizadas
                    </CardDescription>
                  </div>
                  <div className="text-primary bg-primary/10 p-2 rounded-md">
                    <BookOpen className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalStorytellings}</div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Acesso Rápido</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/students/new">
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Cadastrar Aluno
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Adicione um novo aluno ao sistema
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/books/new">
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Book className="h-4 w-4 mr-2" />
                    Cadastrar Livro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Adicione um novo livro ao acervo
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/loans/new">
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <BookMarked className="h-4 w-4 mr-2" />
                    Registrar Empréstimo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Registre um novo empréstimo
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/returns">
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <ArrowDownToLine className="h-4 w-4 mr-2" />
                    Registrar Devolução
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Registre a devolução de um livro
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {(authLoading || dashboardLoading) ? (
          <LoadingSkeleton type="chart" count={6} />
        ) : (
          <div className="space-y-6">
            {/* Gráficos de Empréstimos */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Estatísticas de Empréstimos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xl font-bold">Empréstimos por Série/Turma</h3>
                  {emprestimosPorSerieTurma && (
                    <div style={{ height: 300 }}>
                      <Bar 
                        data={emprestimosPorSerieTurma} 
                        options={{ 
                          maintainAspectRatio: false,
                          plugins: {
                            datalabels: {
                              display: true,
                              color: 'black',
                              font: {
                                weight: 'bold',
                                size: 12
                              },
                              anchor: 'end',
                              align: 'top',
                              offset: 4,
                              formatter: (value: number) => value
                            }
                          }
                        }} 
                      />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">Empréstimos por Status</h3>
                  {emprestimosPorStatus && (
                    <div style={{ height: 300 }}>
                      <Doughnut data={emprestimosPorStatus} options={{ maintainAspectRatio: false }} />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">Top 15 Alunos</h3>
                  {topAlunos && (
                    <div style={{ height: 300 }}>
                      <Bar data={topAlunos} options={{ indexAxis: 'y', maintainAspectRatio: false }} />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">Empréstimos por Mês</h3>
                  {emprestimosPorMes && (
                    <div style={{ height: 300 }}>
                      <Line data={emprestimosPorMes} options={{ maintainAspectRatio: false }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Gráficos de Contação de Histórias */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Estatísticas de Contação de Histórias</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xl font-bold">Contação por Profissional</h3>
                  {storytellingPorProfissional && (
                    <div style={{ height: 300 }}>
                      <Doughnut data={storytellingPorProfissional} options={{ maintainAspectRatio: false }} />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">Contação por Série/Turma</h3>
                  {storytellingPorSerieTurma && (
                    <div style={{ height: 300 }}>
                      <Bar 
                        data={storytellingPorSerieTurma} 
                        options={{ 
                          maintainAspectRatio: false,
                          plugins: {
                            datalabels: {
                              display: true,
                              color: 'black',
                              font: {
                                weight: 'bold',
                                size: 12
                              },
                              anchor: 'end',
                              align: 'top',
                              offset: 4,
                              formatter: (value: number) => value
                            }
                          }
                        }} 
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
