import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSchools, createSchool, updateSchool } from '@/services/userService';
import { School } from '@/types';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Pencil, 
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

export default function Schools() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    telefone: ''
  });

  const { 
    data: schools = [], 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['schools'],
    queryFn: getSchools
  });

  const createSchoolMutation = useMutation({
    mutationFn: createSchool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      toast.success('Escola criada com sucesso');
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar escola');
    }
  });

  const updateSchoolMutation = useMutation({
    mutationFn: ({ id, school }: { id: string; school: Partial<School> }) => 
      updateSchool(id, school),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      toast.success('Escola atualizada com sucesso');
      setIsEditDialogOpen(false);
      setSelectedSchool(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar escola');
    }
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      endereco: '',
      telefone: ''
    });
  };

  const handleCreateSchool = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome da escola é obrigatório');
      return;
    }

    createSchoolMutation.mutate(formData);
  };

  const handleUpdateSchool = async () => {
    if (!selectedSchool || !formData.nome.trim()) {
      toast.error('Nome da escola é obrigatório');
      return;
    }

    updateSchoolMutation.mutate({
      id: selectedSchool.id,
      school: formData
    });
  };

  const handleEditSchool = (school: School) => {
    setSelectedSchool(school);
    setFormData({
      nome: school.nome,
      endereco: school.endereco || '',
      telefone: school.telefone || ''
    });
    setIsEditDialogOpen(true);
  };

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

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Escolas</h1>
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-500">
            Erro ao carregar escolas: {error instanceof Error ? error.message : 'Erro desconhecido'}
          </div>
          <Button onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Escolas</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Escola
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Escola</DialogTitle>
                <DialogDescription>
                  Preencha os dados da escola
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome da escola"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                    placeholder="Endereço da escola"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="Telefone da escola"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateSchool} disabled={createSchoolMutation.isPending}>
                  {createSchoolMutation.isPending ? 'Criando...' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Escolas</CardTitle>
            <CardDescription>
              Gerencie as escolas cadastradas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : schools.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Nenhuma escola cadastrada
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell>{school.nome}</TableCell>
                      <TableCell>{school.endereco || '-'}</TableCell>
                      <TableCell>{school.telefone || '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditSchool(school)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Escola</DialogTitle>
            <DialogDescription>
              Altere os dados da escola
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-nome">Nome</Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome da escola"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-endereco">Endereço</Label>
              <Input
                id="edit-endereco"
                value={formData.endereco}
                onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                placeholder="Endereço da escola"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-telefone">Telefone</Label>
              <Input
                id="edit-telefone"
                value={formData.telefone}
                onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                placeholder="Telefone da escola"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setSelectedSchool(null);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateSchool} disabled={updateSchoolMutation.isPending}>
              {updateSchoolMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
