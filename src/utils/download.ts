
export function download(blob: Blob, filename: string) {
  // Criar URL para o Blob
  const url = window.URL.createObjectURL(blob);
  
  // Criar link e acionar download
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  
  // Necessário para funcionar no Firefox
  document.body.appendChild(link);
  
  link.click();
  
  // Limpar
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Corrige problema com timezone nas datas
 * Garante que a data seja apresentada sem ajuste de timezone
 * @param date String de data ou objeto Date
 * @returns String de data no formato YYYY-MM-DD ajustada para o timezone local
 */
export function formatDateForInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Fix for timezone issue: get UTC date components and format manually
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
