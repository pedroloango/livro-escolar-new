import React, { useEffect, useState } from 'react';
import { getTeachers, addTeacher, updateTeacher, deleteTeacher, Teacher } from '@/services/teacherService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table } from '@/components/ui/table';
import { toast } from 'sonner';

const initialForm: Omit<Teacher, 'id' | 'created_at' | 'email' | 'telefone'> = {
  nome: '',
  contacao_historias: false,
};

export default function TeacherManager() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchTeachers() {
    setLoading(true);
    try {
      const data = await getTeachers();
      setTeachers(data);
    } catch (e) {
      toast.error('Erro ao buscar professores');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTeachers();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
        name === 'contacao_historias' ? value === 'true' : value
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateTeacher(editingId, form);
        toast.success('Professor atualizado com sucesso!');
      } else {
        await addTeacher(form);
        toast.success('Professor cadastrado com sucesso!');
      }
      setForm(initialForm);
      setEditingId(null);
      fetchTeachers();
    } catch (e) {
      toast.error('Erro ao salvar professor');
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(teacher: Teacher) {
    setForm({ nome: teacher.nome, contacao_historias: !!teacher.contacao_historias });
    setEditingId(teacher.id);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este professor?')) return;
    setLoading(true);
    try {
      await deleteTeacher(id);
      toast.success('Professor excluído com sucesso!');
      fetchTeachers();
    } catch (e) {
      toast.error('Erro ao excluir professor');
    } finally {
      setLoading(false);
    }
  }

  function handleCancelEdit() {
    setForm(initialForm);
    setEditingId(null);
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Cadastro de Professores</h2>
      <form onSubmit={handleSubmit} className="space-y-2 mb-6">
        <Input name="nome" placeholder="Nome" value={form.nome} onChange={handleChange} required />
        <div>
          <label className="block mb-1 font-medium">Contação de histórias</label>
          <select
            name="contacao_historias"
            value={form.contacao_historias ? 'true' : 'false'}
            onChange={handleChange}
            className="border rounded px-2 py-1"
            required
          >
            <option value="false">Não</option>
            <option value="true">Sim</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>{editingId ? 'Atualizar' : 'Cadastrar'}</Button>
          {editingId && <Button type="button" variant="secondary" onClick={handleCancelEdit}>Cancelar</Button>}
        </div>
      </form>
      <h3 className="text-lg font-semibold mb-2">Professores cadastrados</h3>
      <div className="overflow-x-auto">
        <Table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contação de histórias</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => (
              <tr key={teacher.id}>
                <td>{teacher.nome}</td>
                <td>{teacher.contacao_historias ? 'Sim' : 'Não'}</td>
                <td>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(teacher)} disabled={loading}>Editar</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(teacher.id)} disabled={loading} className="ml-2">Excluir</Button>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr><td colSpan={3} className="text-center">Nenhum professor cadastrado.</td></tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
} 