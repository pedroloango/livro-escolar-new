import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, enableUser, disableUser, getSchools, createUser } from '@/services/userService';
import { UserWithProfile, School } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Check, X, RefreshCcw, UserPlus, ChevronLeft, ChevronRight,
  School as SchoolIcon 
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription, 
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Users() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('user');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const itemsPerPage = 10;

  const { 
    data: users = [], 
    isLoading: isLoadingUsers, 
    error: usersError,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    retry: 1,
  });

  const { 
    data: schools = [],
    isLoading: isLoadingSchools 
  } = useQuery({
    queryKey: ['schools'],
    queryFn: getSchools,
  });

  const enableUserMutation = useMutation({
    mutationFn: enableUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário habilitado com sucesso.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Ocorreu um erro desconhecido');
    },
  });

  const disableUserMutation = useMutation({
    mutationFn: disableUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário desabilitado com sucesso.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Ocorreu um erro desconhecido');
    },
  });

  const handleCreateUser = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error('Email e senha são obrigatórios');
      return;
    }

    try {
      setIsCreating(true);
      await createUser(email, password, role, selectedSchoolId || undefined);
      toast.success('Usuário criado com sucesso');
      setIsCreateDialogOpen(false);
      refetchUsers();
      
      setEmail('');
      setPassword('');
      setRole('user');
      setSelectedSchoolId('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar usuário');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleUserStatus = (user: UserWithProfile) => {
    if (user.is_confirmed) {
      disableUserMutation.mutate(user.id);
    } else {
      enableUserMutation.mutate(user.id);
    }
  };

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = users.slice(startIndex, startIndex + itemsPerPage);

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    const halfVisiblePages = Math.floor(maxVisiblePages / 2);
    
    let startPage = Math.max(1, currentPage - halfVisiblePages);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Button 
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          size="sm"
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </Button>
      );
    }
    
    return items;
  };

  useEffect(() => {
    const createSpecificUsers = async () => {
      try {
        await createUser('ozanete.oliveira@Hotmail.com', '123456', 'user');
        await createUser('patykdcabral@hotmail.com', '123456', 'user');
        toast.success('Usuários específicos criados com sucesso');
      } catch (error) {
        console.error('Erro ao criar usuários específicos:', error);
      }
    };

    createSpecificUsers();
  }, []);

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Acesso Restrito</h1>
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-500">
            Apenas administradores têm acesso a esta página.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (usersError) {
    return (
      <DashboardLayout>
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Usuários</h1>
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-500">
            Erro ao carregar usuários: {usersError instanceof Error ? usersError.message : 'Erro desconhecido'}
          </div>
          <Button onClick={() => refetchUsers()}>Tentar novamente</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Usuários</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuário</DialogTitle>
                  <DialogDescription>
                    Preencha as informações para criar um novo usuário.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">
                      Senha
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="******"
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      Função
                    </Label>
                    <Select
                      value={role}
                      onValueChange={setRole}>
                      <SelectTrigger id="role" className="col-span-3">
                        <SelectValue placeholder="Selecione uma função" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="escola" className="text-right">
                      Escola
                    </Label>
                    <Select
                      value={selectedSchoolId}
                      onValueChange={setSelectedSchoolId}>
                      <SelectTrigger id="escola" className="col-span-3">
                        <SelectValue placeholder="Selecione uma escola" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                        {schools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateUser} disabled={isCreating}>
                    {isCreating ? 'Criando...' : 'Criar Usuário'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Usuários</CardTitle>
            <CardDescription>
              Visualize, habilite ou desabilite usuários do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingUsers || isLoadingSchools ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Escola</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.profile?.nome || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={user.profile?.role === 'admin' ? 'secondary' : 'outline'}>
                              {user.profile?.role === 'admin' ? 'Administrador' : 'Usuário'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.profile?.escola ? (
                              <div className="flex items-center">
                                <SchoolIcon className="h-4 w-4 mr-1" />
                                <span>{user.profile.escola.nome}</span>
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.is_confirmed ? 'outline' : 'destructive'}>
                              {user.is_confirmed ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleToggleUserStatus(user)}
                              disabled={
                                enableUserMutation.isPending || 
                                disableUserMutation.isPending
                              }
                            >
                              {user.is_confirmed ? (
                                <X className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="mt-4 flex justify-center">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                      </Button>
                      
                      <div className="flex gap-1">
                        {renderPaginationItems()}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próximo
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
