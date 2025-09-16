import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Barcode, Package, AlertTriangle, RefreshCw } from 'lucide-react';
import { getBooks, deleteBook, findBookByBarcode, getBooksCount, getStockSummary, syncBooksStockWithLoans } from '@/services/bookService';
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
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Books() {
  const { isAuthenticated, loading: authLoading } = useAuth();
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
  const [stockSummary, setStockSummary] = useState<{
    totalBooks: number;
    totalStock: number;
    totalAvailable: number;
    totalLoaned: number;
    lowStockBooks: number;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchBooks();
      fetchBooksCount();
      fetchStockSummary();
    }
  }, [authLoading, isAuthenticated]);

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

  const fetchStockSummary = async () => {
    try {
      const summary = await getStockSummary();
      setStockSummary(summary);
    } catch (error) {
      console.error('Failed to fetch stock summary:', error);
    }
  };


  const handleSyncStock = async () => {
    try {
      await syncBooksStockWithLoans();
      toast.success('Estoque atualizado com sucesso!');
      // Recarregar dados após sincronização
      await fetchBooks();
      await fetchStockSummary();
    } catch (error) {
      console.error('Failed to sync stock:', error);
      toast.error('Erro ao atualizar estoque. Os dados serão calculados automaticamente.');
      // Recarregar dados mesmo assim
      await fetchBooks();
      await fetchStockSummary();
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
      accessorKey: 'quantidade_total',
      header: 'Total',
      cell: ({ row }) => {
        const book = row.original;
        return (
          <div className="text-center">
            <span className="font-medium">{book.quantidade_total || 0}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'quantidade_disponivel',
      header: 'Disponível',
      cell: ({ row }) => {
        const book = row.original;
        const isLowStock = (book.quantidade_disponivel || 0) <= 5;
        return (
          <div className="text-center">
            <Badge 
              variant={isLowStock ? "destructive" : "default"}
              className={isLowStock ? "bg-red-100 text-red-800" : ""}
            >
              {book.quantidade_disponivel || 0}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'quantidade_emprestada',
      header: 'Emprestado',
      cell: ({ row }) => {
        const book = row.original;
        return (
          <div className="text-center">
            <span className="font-medium">{book.quantidade_emprestada || 0}</span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Ações',
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
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleSyncStock}
              className="text-sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar Estoque
            </Button>
            <Button onClick={() => navigate('/books/new')}>
              <Plus className="mr-2 h-4 w-4" /> Novo Livro
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {/* Cards de Resumo do Estoque */}
            {stockSummary && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total de Livros</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stockSummary.totalBooks}</div>
                    <p className="text-xs text-muted-foreground">Títulos únicos</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Estoque Total</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stockSummary.totalStock}</div>
                    <p className="text-xs text-muted-foreground">Exemplares</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Disponível</CardTitle>
                    <Package className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stockSummary.totalAvailable}</div>
                    <p className="text-xs text-muted-foreground">Para empréstimo</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Emprestado</CardTitle>
                    <Package className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{stockSummary.totalLoaned}</div>
                    <p className="text-xs text-muted-foreground">Em circulação</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stockSummary.lowStockBooks}</div>
                    <p className="text-xs text-muted-foreground">≤ 5 exemplares</p>
                  </CardContent>
                </Card>
              </div>
            )}

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
