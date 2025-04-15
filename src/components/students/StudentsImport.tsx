
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { download } from '@/utils/download';
import { Student } from '@/types';
import { createStudent } from '@/services/studentService';
import { Upload, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface StudentsImportProps {
  onSuccess: () => void;
}

const TEMPLATE_HEADERS = [
  'Nome do Aluno',
  'Série',
  'Turma',
  'Turno',
  'Sexo',
  'Data de Nascimento (YYYY-MM-DD)'
];

export default function StudentsImport({ onSuccess }: StudentsImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileData, setFileData] = useState<Student[]>([]);
  
  const downloadTemplate = () => {
    // Criar planilha modelo com os cabeçalhos
    const worksheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Alunos');
    
    // Exemplo de dados
    XLSX.utils.sheet_add_aoa(worksheet, [
      ['João da Silva', '5', 'A', 'Matutino', 'Masculino', '2010-05-15'],
      ['Maria Oliveira', '3', 'B', 'Vespertino', 'Feminino', '2012-08-22']
    ], { origin: 'A2' });
    
    // Converter para blob e fazer download
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    download(data, 'modelo_importacao_alunos.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const binaryStr = evt.target?.result;
        const workbook = XLSX.read(binaryStr, { type: 'binary' });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        const data = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Validar e transformar dados
        const students = data.map((row, index) => {
          // Verificar se tem os campos necessários
          if (!row['Nome do Aluno'] || !row['Série'] || !row['Turma'] || !row['Turno'] || !row['Sexo'] || !row['Data de Nascimento (YYYY-MM-DD)']) {
            throw new Error(`Linha ${index + 2}: Faltam campos obrigatórios`);
          }

          return {
            nome: row['Nome do Aluno'],
            serie: parseInt(row['Série']),
            turma: row['Turma'],
            turno: row['Turno'],
            sexo: row['Sexo'],
            data_nascimento: row['Data de Nascimento (YYYY-MM-DD)']
          } as Student;
        });

        setFileData(students);
        toast.success(`${students.length} alunos encontrados no arquivo`);
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        toast.error(error instanceof Error ? error.message : 'Erro ao processar o arquivo');
        setFileData([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (fileData.length === 0) {
      toast.error('Nenhum dado para importar');
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const student of fileData) {
        try {
          await createStudent(student);
          successCount++;
        } catch (error) {
          console.error('Erro ao criar aluno:', student.nome, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} alunos importados com sucesso`);
        onSuccess();
        setIsOpen(false);
        setFileData([]);
      }

      if (errorCount > 0) {
        toast.error(`Falha ao importar ${errorCount} alunos`);
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro durante a importação');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Alunos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Alunos</DialogTitle>
          <DialogDescription>
            Faça upload de uma planilha Excel com dados dos alunos para importação em massa.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2"
            onClick={downloadTemplate}
          >
            <Download className="h-4 w-4" />
            Baixar modelo da planilha
          </Button>
          
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <label 
              htmlFor="file-upload" 
              className="flex justify-center items-center gap-2 h-32 border-2 border-dashed border-muted-foreground/25 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col items-center gap-1 text-center">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Clique para selecionar arquivo ou arraste e solte
                </span>
                <span className="text-xs text-muted-foreground/70">
                  (formato .xlsx)
                </span>
              </div>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
          
          {fileData.length > 0 && (
            <div className="text-sm text-center">
              <span className="font-medium">{fileData.length} alunos</span> prontos para importação
            </div>
          )}
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={fileData.length === 0 || isLoading}
          >
            {isLoading ? 'Importando...' : 'Importar Alunos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
