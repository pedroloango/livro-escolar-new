import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { getStorytellings, deleteStorytelling, Storytelling } from '@/services/storytellingService';
import { useNavigate } from 'react-router-dom';
import { Table } from '@/components/ui/table';
import { toast } from 'sonner';
import { getTeachers } from '@/services/teacherService';
import { getBooks } from '@/services/bookService';

export default function StorytellingPage() {
  const [storytellings, setStorytellings] = useState<Storytelling[]>([]);
  const [loading, setLoading] = useState(false);
  const [teacherMap, setTeacherMap] = useState<Record<string, string>>({});
  const [bookMap, setBookMap] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  async function fetchStorytellings() {
    setLoading(true);
    try {
      const data = await getStorytellings();
      setStorytellings(data);
    } catch (e) {
      toast.error('Erro ao buscar registros de contação');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [teachers, books] = await Promise.all([
          getTeachers(),
          getBooks()
        ]);
        setTeacherMap(Object.fromEntries(teachers.map(t => [t.id, t.nome])));
        setBookMap(Object.fromEntries(books.map(b => [b.id, b.titulo])));
        await fetchStorytellings();
      } catch (e) {
        toast.error('Erro ao carregar dados auxiliares');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este registro?')) return;
    setLoading(true);
    try {
      await deleteStorytelling(id);
      toast.success('Registro excluído com sucesso!');
      fetchStorytellings();
    } catch (e) {
      toast.error('Erro ao excluir registro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Contação de histórias</h1>
          <Button onClick={() => navigate('/storytelling/new')}>Registrar Contação de histórias</Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <th>Professor</th>
                <th>Série</th>
                <th>Turma</th>
                <th>Turno</th>
                <th>Livro</th>
                <th>Data</th>
                <th>Profissional</th>
                <th>Qtd Alunos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {storytellings.map((s) => (
                <tr key={s.id}>
                  <td>{teacherMap[s.professor_id] || s.professor_id}</td>
                  <td>{s.serie}</td>
                  <td>{s.turma}</td>
                  <td>{s.turno}</td>
                  <td>{bookMap[s.livro_id] || s.livro_id}</td>
                  <td>{s.data_contacao}</td>
                  <td>{teacherMap[s.profissional_id] || s.profissional_id}</td>
                  <td>{s.qtd_alunos}</td>
                  <td>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(s.id!)} disabled={loading}>Excluir</Button>
                  </td>
                </tr>
              ))}
              {storytellings.length === 0 && (
                <tr><td colSpan={9} className="text-center">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
} 