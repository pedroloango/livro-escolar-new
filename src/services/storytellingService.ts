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
};

export async function getStorytellings(): Promise<Storytelling[]> {
  const { data, error } = await supabase
    .from('contacao_historias')
    .select('*')
    .order('data_contacao', { ascending: false });
  if (error) throw error;
  return data as Storytelling[];
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