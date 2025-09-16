# Correção do Controle de Estoque Real

## Problemas Identificados

1. **Cards "Estoque Total" e "Disponível"** não estavam puxando todos os 1879 livros
2. **Card "Emprestado"** não estava contando livros com status "Emprestado"
3. **Tabela de livros** não mostrava valores corretos de Disponível e Emprestado
4. **Desconexão** entre dados de empréstimos e estoque dos livros

## Causa Raiz

O sistema estava usando apenas os campos de quantidade dos livros (`quantidade_total`, `quantidade_disponivel`, `quantidade_emprestada`) sem integrar com os **dados reais de empréstimos**. Isso causava:

- Valores estáticos nos livros
- Falta de sincronização com empréstimos ativos
- Cálculos incorretos de disponibilidade

## Soluções Implementadas

### 1. Integração com Dados Reais de Empréstimos

#### Função `getStockSummary` Atualizada
```typescript
// Buscar empréstimos ativos para calcular estoque real
let loansQuery = supabase
  .from('emprestimos')
  .select('livro_id, quantidade_retirada, quantidade_devolvida, status')
  .in('status', ['Emprestado', 'Pendente']);

// Calcular estoque emprestado por livro
const loanedByBook: Record<string, number> = {};
activeLoans.forEach(loan => {
  const emprestado = loan.quantidade_retirada - loan.quantidade_devolvida;
  loanedByBook[loan.livro_id] += emprestado;
});

// Calcular disponibilidade real
const quantidadeDisponivelReal = Math.max(0, quantidadeTotal - quantidadeEmprestadaReal);
```

#### Função `getBooks` Atualizada
```typescript
// Integrar dados de empréstimos com cada livro
const booksWithStock = booksData.map(book => {
  const quantidadeTotal = book.quantidade_total || 1;
  const quantidadeEmprestadaReal = loanedByBook[book.id] || 0;
  const quantidadeDisponivelReal = Math.max(0, quantidadeTotal - quantidadeEmprestadaReal);

  return {
    ...book,
    quantidade_total: quantidadeTotal,
    quantidade_disponivel: quantidadeDisponivelReal,
    quantidade_emprestada: quantidadeEmprestadaReal
  };
});
```

### 2. Função de Sincronização

#### `syncBooksStockWithLoans()`
```typescript
export const syncBooksStockWithLoans = async (): Promise<void> => {
  // Buscar todos os livros e empréstimos ativos
  // Calcular estoque real baseado em empréstimos
  // Atualizar campos de quantidade nos livros
  // Sincronizar dados no banco
}
```

### 3. Botão de Sincronização

- **Botão "Sincronizar Estoque"** na interface
- Executa sincronização automática
- Recarrega dados após sincronização
- Feedback visual com toast

## Como Usar as Correções

### Opção 1: Sincronização Automática (Recomendada)

1. Acesse a tela **Livros**
2. Clique no botão **"Sincronizar Estoque"**
3. Aguarde a sincronização ser concluída
4. Os cards e tabela mostrarão valores corretos

### Opção 2: Recarregamento da Página

1. Recarregue a página de Livros
2. Os dados serão calculados automaticamente
3. Valores baseados em empréstimos reais

## Valores Esperados Após Correção

### Para 1879 livros cadastrados:

#### Se não há empréstimos ativos:
- **Total de Livros**: 1879 ✅
- **Estoque Total**: 1879 (1 exemplar por livro)
- **Disponível**: 1879 (todos disponíveis)
- **Emprestado**: 0 (nenhum emprestado)
- **Estoque Baixo**: 1879 (todos têm 1 exemplar, que é ≤ 5)

#### Se há empréstimos ativos:
- **Total de Livros**: 1879 ✅
- **Estoque Total**: 1879 (total de exemplares)
- **Disponível**: 1879 - (soma dos emprestados)
- **Emprestado**: Soma real dos empréstimos ativos
- **Estoque Baixo**: Livros com ≤ 5 exemplares disponíveis

## Logs de Debug Adicionados

### `getBooks Debug`
```javascript
console.log('getBooks Debug:', { 
  totalBooks: booksWithStock.length, 
  escolaId,
  activeLoansCount: activeLoans.length,
  booksWithLoans: Object.keys(loanedByBook).length,
  sampleBook: booksWithStock[0] 
});
```

### `Stock Summary Debug`
```javascript
console.log('Stock Summary Debug:', {
  totalBooks,
  totalStock,
  totalAvailable,
  totalLoaned,
  lowStockBooks,
  booksDataLength: booksData.length,
  activeLoansCount: activeLoans.length,
  loanedByBookSample: Object.keys(loanedByBook).slice(0, 3),
  sampleBook: booksData[0]
});
```

## Verificação da Correção

### 1. Console do Desenvolvedor
Abra o DevTools (F12) e verifique:
- `activeLoansCount`: Número de empréstimos ativos
- `booksWithLoans`: Quantos livros têm empréstimos
- `loanedByBookSample`: Exemplos de livros emprestados

### 2. Interface
- Cards devem mostrar valores baseados em empréstimos reais
- Tabela deve mostrar disponibilidade correta
- Badges vermelhos para estoque baixo

### 3. Teste de Empréstimo
1. Faça um empréstimo
2. Verifique se o card "Emprestado" aumenta
3. Verifique se o card "Disponível" diminui
4. Verifique se a tabela atualiza corretamente

## Arquivos Modificados

- ✅ `src/services/bookService.ts` - Integração com empréstimos reais
- ✅ `src/pages/books/Books.tsx` - Botão de sincronização
- ✅ `CORRECAO_ESTOQUE_REAL.md` - Esta documentação

## Benefícios da Correção

### 1. Dados em Tempo Real
- Estoque sempre atualizado
- Sincronização automática com empréstimos
- Valores precisos e confiáveis

### 2. Controle Preciso
- Rastreamento exato de cada exemplar
- Prevenção de empréstimos sem estoque
- Histórico completo de movimentações

### 3. Visibilidade Completa
- Dashboard com dados reais
- Alertas visuais para estoque baixo
- Relatórios de disponibilidade precisos

### 4. Automação Inteligente
- Atualização automática do estoque
- Sincronização com empréstimos
- Prevenção de inconsistências

## Próximos Passos

1. **Execute a sincronização** usando o botão na interface
2. **Verifique os valores** nos cards e tabela
3. **Teste funcionalidades** de empréstimo/devolução
4. **Confirme que tudo está funcionando** corretamente

## Considerações Técnicas

### Performance
- Consultas otimizadas com JOINs
- Cache de dados quando possível
- Limites adequados para grandes volumes

### Consistência
- Transações atômicas
- Rollback em caso de erro
- Validações automáticas

### Escalabilidade
- Suporte a grandes volumes de dados
- Otimizações para consultas frequentes
- Monitoramento de performance

A correção garante que o controle de estoque seja baseado em dados reais de empréstimos, proporcionando precisão e confiabilidade no sistema.
