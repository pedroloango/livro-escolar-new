# Investigação dos Cálculos de Estoque

## Problema Identificado

Há uma inconsistência nos cálculos de estoque conforme relatado pelo usuário:

### Valores Atuais (Incorretos):
- **Estoque Total**: 1879 livros ✅
- **Emprestado**: 434 livros ✅
- **Disponível**: 1594 livros ❌ (deveria ser 1879 - 434 = 1445)
- **Estoque Baixo**: 1879 livros ❌ (deveria ser menor)

### Valores Esperados (Corretos):
- **Estoque Total**: 1879 livros ✅
- **Emprestado**: 434 livros ✅
- **Disponível**: 1445 livros ✅ (1879 - 434)
- **Estoque Baixo**: < 1879 livros ✅ (apenas livros com ≤ 5 exemplares)

## Análise do Problema

### 1. Cálculo de Disponível
**Fórmula**: `Disponível = Estoque Total - Emprestado`
- **Esperado**: 1879 - 434 = 1445
- **Atual**: 1594
- **Diferença**: +149 livros (1594 - 1445)

### 2. Cálculo de Estoque Baixo
**Condição**: Livros com ≤ 5 exemplares disponíveis
- **Atual**: 1879 (todos os livros)
- **Problema**: Se todos tivessem estoque baixo, não haveria 434 livros emprestados

## Possíveis Causas

### 1. Problema na Consulta de Empréstimos
- Empréstimos podem não estar sendo filtrados corretamente por escola
- Status dos empréstimos pode estar incorreto
- Quantidades de retirada/devolução podem estar inconsistentes

### 2. Problema no Cálculo por Livro
- Alguns livros podem ter `quantidade_total` diferente de 1
- Cálculo de `quantidade_disponivel_real` pode estar incorreto
- Soma dos valores pode estar duplicando ou omitindo dados

### 3. Problema na Agregação
- Soma dos valores individuais pode não corresponder ao total
- Lógica de `Math.max(0, quantidadeTotal - quantidadeEmprestadaReal)` pode estar incorreta

## Logs de Debug Implementados

### 1. Debug de Empréstimos
```typescript
console.log('Empréstimos Debug:', {
  activeLoansCount: (activeLoans || []).length,
  sampleLoans: (activeLoans || []).slice(0, 3),
  totalRetirada: (activeLoans || []).reduce((sum, loan) => sum + (loan.quantidade_retirada || 0), 0),
  totalDevolvida: (activeLoans || []).reduce((sum, loan) => sum + (loan.quantidade_devolvida || 0), 0),
  totalEmprestado: (activeLoans || []).reduce((sum, loan) => sum + ((loan.quantidade_retirada || 0) - (loan.quantidade_devolvida || 0)), 0)
});
```

### 2. Debug de Livros
```typescript
const debugBooks = booksData.slice(0, 5).map(book => ({
  id: book.id,
  titulo: book.titulo,
  quantidadeTotal: book.quantidade_total ?? 1,
  quantidadeEmprestadaReal: loanedByBook[book.id] || 0,
  quantidadeDisponivelReal: Math.max(0, (book.quantidade_total ?? 1) - (loanedByBook[book.id] || 0))
}));
```

### 3. Debug de Cálculos
```typescript
console.log('Stock Summary Debug:', {
  totalBooks,
  totalStock,
  totalAvailable,
  totalLoaned,
  lowStockBooks,
  calculationCheck: {
    expectedAvailable: totalStock - totalLoaned,
    actualAvailable: totalAvailable,
    isConsistent: (totalStock - totalLoaned) === totalAvailable
  },
  booksWithLoans: Object.keys(loanedByBook).length,
  totalLoanedFromLoans: totalLoanedFromLoans,
  debugBooks: debugBooks,
  loanedByBookKeys: Object.keys(loanedByBook).length,
  loanedByBookValues: Object.values(loanedByBook).slice(0, 5)
});
```

## Verificações Necessárias

### 1. Console do Desenvolvedor
Verificar os logs para identificar:
- Quantos empréstimos ativos existem
- Se os empréstimos estão sendo filtrados corretamente por escola
- Se as quantidades de retirada/devolução estão corretas
- Se o cálculo por livro está correto

### 2. Dados de Empréstimos
Verificar se:
- Status dos empréstimos está correto ('Emprestado', 'Pendente')
- Quantidades de retirada e devolução estão consistentes
- Filtro por escola_id está funcionando

### 3. Dados de Livros
Verificar se:
- Todos os livros têm `quantidade_total = 1`
- Cálculo de disponibilidade está correto por livro
- Soma dos valores individuais corresponde ao total

## Próximos Passos

### 1. Executar Debug
1. Acesse a tela de Livros
2. Abra o Console do DevTools (F12)
3. Clique em "Atualizar Estoque"
4. Verifique os logs de debug

### 2. Analisar Resultados
- Verificar se `isConsistent: true` no `calculationCheck`
- Comparar `totalLoaned` com `totalLoanedFromLoans`
- Verificar se `booksWithLoans` faz sentido
- Analisar `debugBooks` para ver cálculos individuais

### 3. Identificar Causa
Com base nos logs, identificar se o problema está em:
- Consulta de empréstimos
- Cálculo por livro
- Agregação dos totais

### 4. Implementar Correção
Após identificar a causa, implementar a correção específica.

## Arquivos Modificados

- ✅ `src/services/bookService.ts` - Logs de debug adicionados
- ✅ `INVESTIGACAO_CALCULOS_ESTOQUE.md` - Esta documentação

## Expectativa dos Logs

### Logs Esperados (Corretos):
```
Empréstimos Debug: {
  activeLoansCount: X,
  totalEmprestado: 434
}

Stock Summary Debug: {
  totalStock: 1879,
  totalAvailable: 1445,
  totalLoaned: 434,
  calculationCheck: {
    expectedAvailable: 1445,
    actualAvailable: 1445,
    isConsistent: true
  }
}
```

### Logs Problemáticos (Atuais):
```
Stock Summary Debug: {
  totalStock: 1879,
  totalAvailable: 1594,  // ❌ Deveria ser 1445
  totalLoaned: 434,
  calculationCheck: {
    expectedAvailable: 1445,
    actualAvailable: 1594,
    isConsistent: false  // ❌ Inconsistente
  }
}
```

A investigação com logs detalhados permitirá identificar exatamente onde está o problema nos cálculos de estoque.
