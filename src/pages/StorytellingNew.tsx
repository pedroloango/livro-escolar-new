import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getTeachers } from '@/services/teacherService';
import { getBooks, findBookByBarcode } from '@/services/bookService';
import { addStorytelling, Storytelling } from '@/services/storytellingService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import { Barcode } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function StorytellingNew() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<any[]>([]);
  const [bookSearch, setBookSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [form, setForm] = useState<Partial<Storytelling>>({});
  const [loading, setLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      const teachersData = await getTeachers();
      setTeachers(teachersData);
      const booksData = await getBooks();
      setBooks(booksData);
      setFilteredBooks(booksData);
    }
    fetchData();
  }, []);

  useEffect(() => {
    const searchTerm = bookSearch.trim().toLowerCase();
    if (!searchTerm) {
      setFilteredBooks(books);
      return;
    }

    setFilteredBooks(
      books.filter((book) =>
        book.titulo?.toLowerCase().includes(searchTerm) ||
        book.autor?.toLowerCase().includes(searchTerm) ||
        book.editora?.toLowerCase().includes(searchTerm)
      )
    );
  }, [bookSearch, books]);

  // Professores que NÃO fazem contação de histórias
  const professores = teachers.filter(t => !t.contacao_historias);
  // Profissionais que fazem contação
  const profissionais = teachers.filter(t => t.contacao_historias);

  // Séries, turmas e turnos de exemplo (ajuste conforme necessário)
  const series = ['G4', 'G5', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const turmas = ['A', 'B', 'C', 'D', 'E'];
  const turnos = ['Matutino', 'Vespertino'];

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  async function handleBarcodeScan(barcode: string) {
    try {
      const book = await findBookByBarcode(barcode);
      if (book && book.id) {
        setBooks(prev => {
          if (!prev.find(b => b.id === book.id)) {
            return [book, ...prev];
          }
          return prev;
        });
        setFilteredBooks(prev => {
          if (!prev.find(b => b.id === book.id)) {
            return [book, ...prev];
          }
          return prev;
        });
        setBarcodeInput(barcode);
        setBookSearch('');
        setTimeout(() => {
          setForm(f => ({ ...f, livro_id: String(book.id) }));
        }, 0);
        toast.success(`Livro selecionado: ${book.titulo}`);
      } else {
        toast.error('Livro não encontrado com este código de barras');
      }
    } catch (error) {
      toast.error('Erro ao buscar livro por código de barras');
    }
  }

  async function handleBarcodeLookup() {
    const code = barcodeInput.trim();
    if (!code) {
      toast.error('Digite o código de barras');
      return;
    }
    await handleBarcodeScan(code);
  }

  useEffect(() => {
    let buffer = '';
    let clearTimer: number | undefined;
    let lastTime = 0;
    const INTER_CHAR_THRESHOLD = 50;
    const CLEAR_DELAY = 200;

    const onKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const isTypingField = !!activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );

      if (isTypingField && activeElement?.id !== 'storytelling-barcode-input') {
        return;
      }

      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;

      if (event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt' || event.key === 'Meta') {
        return;
      }

      if (event.key.length === 1) {
        if (delta > INTER_CHAR_THRESHOLD && buffer.length > 0) {
          buffer = '';
        }

        buffer += event.key;
        if (clearTimer) window.clearTimeout(clearTimer);
        clearTimer = window.setTimeout(() => {
          buffer = '';
        }, CLEAR_DELAY);
      } else if (event.key === 'Enter') {
        const code = buffer.trim();
        buffer = '';
        if (clearTimer) window.clearTimeout(clearTimer);
        if (!code) return;
        event.preventDefault();
        setBarcodeInput(code);
        void handleBarcodeScan(code);
      }
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      if (clearTimer) window.clearTimeout(clearTimer);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await addStorytelling({
        professor_id: form.professor_id!,
        serie: form.serie!,
        turma: form.turma!,
        turno: form.turno!,
        livro_id: form.livro_id!,
        data_contacao: form.data_contacao!,
        profissional_id: form.profissional_id!,
        qtd_alunos: Number(form.qtd_alunos) || 0,
      });
      toast.success('Registro salvo com sucesso!');
      navigate('/storytelling');
    } catch (e) {
      toast.error('Erro ao salvar registro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto p-4">
        <h2 className="text-xl font-bold mb-4">Registrar Contação de Histórias</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Nome do Professor</label>
            <select name="professor_id" value={form.professor_id || ''} onChange={handleChange} required className="border rounded px-2 py-1 w-full">
              <option value="">Selecione o professor</option>
              {professores.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block mb-1 font-medium">Série</label>
              <select name="serie" value={form.serie || ''} onChange={handleChange} required className="border rounded px-2 py-1 w-full">
                <option value="">Selecione a série</option>
                {series.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block mb-1 font-medium">Turma</label>
              <select name="turma" value={form.turma || ''} onChange={handleChange} required className="border rounded px-2 py-1 w-full">
                <option value="">Selecione a turma</option>
                {turmas.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block mb-1 font-medium">Turno</label>
              <select name="turno" value={form.turno || ''} onChange={handleChange} required className="border rounded px-2 py-1 w-full">
                <option value="">Selecione o turno</option>
                {turnos.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block mb-1 font-medium">Título do Livro</label>
            <div className="flex gap-2 items-center">
              <div className="flex-1 space-y-2">
                <Input
                  type="text"
                  placeholder="Pesquisar livro por título, autor ou editora..."
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                />
                <Select
                  value={form.livro_id || ''}
                  onValueChange={value => setForm(f => ({ ...f, livro_id: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o livro ou use o leitor" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredBooks.map(b => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-64 space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="storytelling-barcode-input"
                    type="text"
                    placeholder="Código de barras"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleBarcodeLookup();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={() => void handleBarcodeLookup()}>
                    Buscar
                  </Button>
                </div>
                <Button type="button" variant="outline" size="icon" onClick={() => setIsScannerOpen(true)}>
                  <Barcode className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <BarcodeScanner 
              isOpen={isScannerOpen}
              onClose={() => setIsScannerOpen(false)}
              onScan={handleBarcodeScan}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Data da Contação</label>
            <Input type="date" name="data_contacao" value={form.data_contacao || ''} onChange={handleChange} required />
          </div>
          <div>
            <label className="block mb-1 font-medium">Profissional da Contação</label>
            <select name="profissional_id" value={form.profissional_id || ''} onChange={handleChange} required className="border rounded px-2 py-1 w-full">
              <option value="">Selecione o profissional</option>
              {profissionais.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Qtd de Alunos</label>
            <Input type="number" name="qtd_alunos" value={form.qtd_alunos || ''} onChange={handleChange} min={1} required />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>Salvar</Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/storytelling')}>Cancelar</Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
} 