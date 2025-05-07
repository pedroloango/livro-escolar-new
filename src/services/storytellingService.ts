import { supabase } from '@/integrations/supabase/client';

export type Storytelling = {
  id?: string;
  professor_id: string;
  serie: string;
  turma: string;
  turno: string;
  livro_id: string;
  data_contacao: string;
  profissional_id: string;
  qtd_alunos: number;
  professor_nome?: string;
  profissional_nome?: string;
  livro_titulo?: string;
};

export async function getStorytellings(): Promise<Storytelling[]> {
  const { data, error } = await supabase
    .from('contacao_historias')
    .select(`*,
      professor:professor_id (nome),
      profissional:profissional_id (nome),
      livro:livro_id (titulo)
    `)
    .order('data_contacao', { ascending: false });
  if (error) throw error;
  // Mapear para adicionar os nomes/títulos ao objeto principal
  return (data as any[]).map((row) => ({
    ...row,
    professor_nome: row.professor?.nome,
    profissional_nome: row.profissional?.nome,
    livro_titulo: row.livro?.titulo,
  }));
}

export async function addStorytelling(story: Omit<Storytelling, 'id'>): Promise<Storytelling> {
  const { data, error } = await supabase
    .from('contacao_historias')
    .insert([story])
    .select()
    .single();
  if (error) throw error;
  return data as Storytelling;
}

export async function updateStorytelling(id: string, updates: Partial<Omit<Storytelling, 'id'>>): Promise<Storytelling> {
  const { data, error } = await supabase
    .from('contacao_historias')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Storytelling;
}

export async function deleteStorytelling(id: string): Promise<void> {
  const { error } = await supabase
    .from('contacao_historias')
    .delete()
    .eq('id', id);
  if (error) throw error;
} 