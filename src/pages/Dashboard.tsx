import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getStudents } from '@/services/studentService';
import { getBooks, getBooksCount } from '@/services/bookService';
import { getLoans, getActiveLoans } from '@/services/loanService';
import { Link } from 'react-router-dom';
import { Book, Users, BookMarked, ArrowDownToLine } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
);

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalBooks: 0,
    activeLoans: 0,
    totalLoans: 0,
  });
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Novos estados para os gráficos
  const [emprestimosPorSerie, setEmprestimosPorSerie] = useState<any>(null);
  const [emprestimosPorStatus, setEmprestimosPorStatus] = useState<any>(null);
  const [topAlunos, setTopAlunos] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [students, booksCount, loans, activeLoans] = await Promise.all([
          getStudents(),
          getBooksCount(),
          getLoans(),
          getActiveLoans(),
        ]);

        setStats({
          totalStudents: students.length,
          totalBooks: booksCount,
          activeLoans: activeLoans.length,
          totalLoans: loans.length,
        });

        // Gráfico de Empréstimos por Série
        const serieCount: Record<string, number> = {};
        loans.forEach((loan: any) => {
          const serie = loan.serie || 'N/A';
          serieCount[serie] = (serieCount[serie] || 0) + 1;
        });
        const serieLabels = Object.keys(serieCount);
        const serieData = Object.values(serieCount);
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
        const statusCount: Record<string, number> = {};
        loans.forEach((loan: any) => {
          const status = loan.status || 'N/A';
          statusCount[status] = (statusCount[status] || 0) + 1;
        });
        const statusLabels = Object.keys(statusCount);
        const statusData = Object.values(statusCount);
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
        const alunoCount: Record<string, number> = {};
        loans.forEach((loan: any) => {
          const nome = loan.aluno?.nome || 'N/A';
          alunoCount[nome] = (alunoCount[nome] || 0) + 1;
        });
        const sortedAlunos = Object.entries(alunoCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15);
        setTopAlunos({
          labels: sortedAlunos.map(([nome]) => nome),
          datasets: [
            {
              label: 'Top 15 Alunos',
              data: sortedAlunos.map(([, count]) => count),
              backgroundColor: 'rgba(153, 102, 255, 0.6)',
            },
          ],
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    if (!authLoading && isAuthenticated) {
      fetchStats();
    }
  }, [authLoading, isAuthenticated]);

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

        {authLoading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <CardTitle className="h-6 bg-muted rounded-md"></CardTitle>
                  <CardDescription className="h-4 bg-muted rounded-md w-2/3 mt-2"></CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded-md w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h2 className="text-xl font-bold">Empréstimos por Série</h2>
            {emprestimosPorSerie && (
              <div style={{ height: 300 }}>
                <Bar data={emprestimosPorSerie} options={{ maintainAspectRatio: false }} />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">Empréstimos por Status</h2>
            {emprestimosPorStatus && (
              <div style={{ height: 300 }}>
                <Doughnut data={emprestimosPorStatus} options={{ maintainAspectRatio: false }} />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">Top 15 Alunos</h2>
            {topAlunos && (
              <div style={{ height: 300 }}>
                <Bar data={topAlunos} options={{ indexAxis: 'y', maintainAspectRatio: false }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
