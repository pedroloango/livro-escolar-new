# Correção do Problema de Contabilização dos Cards de Estoque

## Problema Identificado

Os cards de quantidade na tela de Livros estavam mostrando valores zerados porque:

1. **Campos de quantidade não existiam** no banco de dados para livros existentes
2. **Função `getStockSummary`** estava tentando acessar campos `null/undefined`
3. **Valores padrão** não estavam sendo aplicados corretamente

## Soluções Implementadas

### 1. Função `getStockSummary` Corrigida

```typescript
// Antes: Valores zerados
const totalStock = booksData.reduce((sum, book) => sum + (book.quantidade_total || 0), 0);

// Depois: Valores padrão aplicados
const quantidadeTotal = book.quantidade_total ?? 1;
const quantidadeDisponivel = book.quantidade_disponivel ?? 1;
const quantidadeEmprestada = book.quantidade_emprestada ?? 0;
```

### 2. Função `getBooks` Atualizada

```typescript
// Garantir que todos os livros tenham campos de quantidade
const booksWithStock = (data || []).map(book => ({
  ...book,
  quantidade_total: book.quantidade_total || 1,
  quantidade_disponivel: book.quantidade_disponivel || 1,
  quantidade_emprestada: book.quantidade_emprestada || 0
}));
```

### 3. Função de Migração Criada

```typescript
export const migrateBooksStock = async (): Promise<void> => {
  // Atualiza livros existentes com valores padrão
  // quantidade_total: 1
  // quantidade_disponivel: 1  
  // quantidade_emprestada: 0
}
```

### 4. Botão de Migração Adicionado

- Botão "Migrar Estoque" na tela de Livros
- Executa migração automaticamente
- Recarrega dados após migração

## Como Resolver o Problema

### Opção 1: Usar o Botão de Migração (Recomendado)

1. Acesse a tela **Livros**
2. Clique no botão **"Migrar Estoque"**
3. Aguarde a migração ser concluída
4. Os cards agora mostrarão os valores corretos

### Opção 2: Executar Migração Manualmente

```sql
-- Adicionar colunas se não existirem
ALTER TABLE livros 
ADD COLUMN IF NOT EXISTS quantidade_total INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS quantidade_disponivel INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS quantidade_emprestada INTEGER DEFAULT 0;

-- Atualizar livros existentes
UPDATE livros 
SET 
  quantidade_total = COALESCE(quantidade_total, 1),
  quantidade_disponivel = COALESCE(quantidade_disponivel, 1),
  quantidade_emprestada = COALESCE(quantidade_emprestada, 0)
WHERE 
  quantidade_total IS NULL 
  OR quantidade_disponivel IS NULL 
  OR quantidade_emprestada IS NULL;
```

## Valores Esperados Após Correção

### Para 1879 livros cadastrados:
- **Total de Livros**: 1879 (títulos únicos)
- **Estoque Total**: 1879 (1 exemplar por livro)
- **Disponível**: 1879 (todos disponíveis inicialmente)
- **Emprestado**: 0 (nenhum emprestado inicialmente)
- **Estoque Baixo**: 0 (todos têm 1 exemplar, que é > 5)

### Para livros com múltiplos exemplares:
- **Total de Livros**: X (títulos únicos)
- **Estoque Total**: Soma de todos os exemplares
- **Disponível**: Soma dos exemplares disponíveis
- **Emprestado**: Soma dos exemplares emprestados
- **Estoque Baixo**: Livros com ≤ 5 exemplares disponíveis

## Debug e Monitoramento

### Logs de Debug Adicionados

```typescript
console.log('Stock Summary Debug:', {
  totalBooks,
  totalStock,
  totalAvailable,
  totalLoaned,
  lowStockBooks,
  sampleBook: booksData[0],
  booksWithStockFields: booksData.filter(b => b.quantidade_total !== null).length
});
```

### Verificação no Console

1. Abra o DevTools (F12)
2. Vá para a aba Console
3. Recarregue a página de Livros
4. Verifique os logs de debug

## Validação da Correção

### Checklist de Verificação

- [ ] Cards mostram valores > 0
- [ ] Total de Livros = número de títulos únicos
- [ ] Estoque Total = soma de todos os exemplares
- [ ] Disponível + Emprestado = Estoque Total
- [ ] Tabela mostra quantidades corretas
- [ ] Badges coloridos funcionam corretamente

### Testes Recomendados

1. **Criar novo livro** com quantidades específicas
2. **Fazer empréstimo** e verificar atualização automática
3. **Registrar devolução** e verificar reversão
4. **Verificar estoque baixo** com livros ≤ 5 exemplares

## Próximos Passos

1. **Executar migração** usando o botão na interface
2. **Verificar valores** nos cards e tabela
3. **Testar funcionalidades** de empréstimo/devolução
4. **Remover botão de migração** após confirmação (opcional)

## Arquivos Modificados

- ✅ `src/services/bookService.ts` - Funções corrigidas
- ✅ `src/pages/books/Books.tsx` - Botão de migração adicionado
- ✅ `CORRECAO_ESTOQUE.md` - Esta documentação

A correção garante que todos os livros tenham campos de quantidade válidos e que os cálculos sejam feitos corretamente, resolvendo o problema dos valores zerados nos cards de estoque.
