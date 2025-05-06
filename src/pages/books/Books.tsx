import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Barcode } from 'lucide-react';
import { getBooks, deleteBook, findBookByBarcode, getBooksCount } from '@/services/bookService';
import { lookupBookByIsbn } from '@/services/bookLookupService';
import { Book } from '@/types';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

export default function Books() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [titleFilter, setTitleFilter] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [bookInfo, setBookInfo] = useState<any>(null);
  const [isLookupDialogOpen, setIsLookupDialogOpen] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [totalBooks, setTotalBooks] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBooks();
    fetchBooksCount();
  }, []);

  useEffect(() => {
    // Aplicar filtro por título
    if (titleFilter) {
      const filtered = books.filter(book => 
        book.titulo.toLowerCase().includes(titleFilter.toLowerCase())
      );
      setFilteredBooks(filtered);
    } else {
      setFilteredBooks(books);
    }
  }, [books, titleFilter]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const data = await getBooks();
      setBooks(data);
      setFilteredBooks(data);
    } catch (error) {
      console.error('Failed to fetch books:', error);
      toast.error('Erro ao carregar livros');
    } finally {
      setLoading(false);
    }
  };

  const fetchBooksCount = async () => {
    try {
      const count = await getBooksCount();
      setTotalBooks(count);
    } catch (error) {
      console.error('Failed to fetch books count:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBook(id);
      setBooks(books.filter(book => book.id !== id));
      toast.success('Livro excluído com sucesso');
    } catch (error) {
      console.error('Failed to delete book:', error);
      toast.error('Erro ao excluir livro');
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    try {
      setScannedBarcode(barcode);
      setIsLookingUp(true);
      setIsLookupDialogOpen(true);
      
      // Primeiro, verificar se o livro já existe no sistema
      const existingBook = await findBookByBarcode(barcode);
      
      if (existingBook) {
        // Se encontrou o livro, filtra apenas para ele
        setFilteredBooks([existingBook]);
        setTitleFilter(''); // Limpa o filtro de título para não confundir
        setBookInfo(null);
        setIsLookingUp(false);
        setIsLookupDialogOpen(false);
        toast.success(`Livro encontrado: ${existingBook.titulo}`);
      } else {
        // Buscar informações do livro por ISBN
        const bookData = await lookupBookByIsbn(barcode);
        
        if (bookData) {
          setBookInfo(bookData);
          toast.success('Informações do livro encontradas');
        } else {
          setBookInfo(null);
          toast.info('Nenhuma informação encontrada para este código de barras');
        }
        
        setIsLookingUp(false);
      }
    } catch (error) {
      console.error('Error finding book:', error);
      toast.error('Erro ao buscar informações do livro');
      setIsLookingUp(false);
      setIsLookupDialogOpen(false);
    }
  };

  const handleCreateBookFromLookup = () => {
    // Navegar para a página de novo livro com as informações pré-preenchidas
    navigate('/books/new', { 
      state: { 
        barcode: scannedBarcode,
        title: bookInfo?.title || ''
      }
    });
    
    setIsLookupDialogOpen(false);
  };

  const columns: ColumnDef<Book>[] = [
    {
      accessorKey: 'titulo',
      header: 'Título',
    },
    {
      accessorKey: 'codigo_barras',
      header: 'Código de Barras',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const book = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/books/edit/${book.id}`)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir o livro "{book.titulo}"? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(book.id!)}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Livros</h1>
          <Button onClick={() => navigate('/books/new')}>
            <Plus className="mr-2 h-4 w-4" /> Novo Livro
          </Button>
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por título..."
                  value={titleFilter}
                  onChange={(e) => setTitleFilter(e.target.value)}
                />
              </div>
              <Button 
                variant="outline" 
                className="w-full md:w-auto"
                onClick={() => setIsScannerOpen(true)}
              >
                <Barcode className="mr-2 h-4 w-4" />
                Escanear Código de Barras
              </Button>
            </div>
            <div className="mt-4 mb-2 text-right text-muted-foreground text-sm">
              Total de livros cadastrados: <span className="font-bold text-primary">{totalBooks}</span>
            </div>
            <DataTable
              columns={columns}
              data={filteredBooks}
              searchKey="titulo"
              searchPlaceholder="Buscar por título..."
            />
          </>
        )}
      </div>

      <BarcodeScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
      />

      <Dialog open={isLookupDialogOpen} onOpenChange={setIsLookupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informações do Livro</DialogTitle>
            <DialogDescription>
              Resultado da busca para o código: {scannedBarcode}
            </DialogDescription>
          </DialogHeader>
          
          {isLookingUp ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {bookInfo ? (
                <div className="space-y-2">
                  <div>
                    <Label>Título</Label>
                    <div className="p-2 border rounded-md">{bookInfo.title || 'Não disponível'}</div>
                  </div>
                  
                  {bookInfo.authors && (
                    <div>
                      <Label>Autor(es)</Label>
                      <div className="p-2 border rounded-md">{bookInfo.authors.join(', ')}</div>
                    </div>
                  )}
                  
                  {bookInfo.publisher && (
                    <div>
                      <Label>Editora</Label>
                      <div className="p-2 border rounded-md">{bookInfo.publisher}</div>
                    </div>
                  )}
                  
                  {bookInfo.publishedDate && (
                    <div>
                      <Label>Data de Publicação</Label>
                      <div className="p-2 border rounded-md">{bookInfo.publishedDate}</div>
                    </div>
                  )}
                  
                  {bookInfo.description && (
                    <div>
                      <Label>Descrição</Label>
                      <div className="p-2 border rounded-md max-h-40 overflow-y-auto">
                        {bookInfo.description}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  Nenhuma informação encontrada para este código de barras.
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLookupDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateBookFromLookup}>
              Cadastrar Novo Livro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
