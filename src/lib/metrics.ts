import { parseISO, isToday, isYesterday, subDays, isAfter, isBefore, isEqual, startOfDay, parse } from 'date-fns';

// Função segura para converter strings brasileiras como "1.234,56" para float
export const parseValue = (val: any) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = val.toString().replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

// Parse flexible dates (YYYY-MM-DD or DD/MM/YYYY)
const parseFlexibleDate = (dateStr: string) => {
  if (dateStr.includes('/')) {
    // try to parse DD/MM/YYYY
    const parsed = parse(dateStr, 'dd/MM/yyyy', new Date());
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return parseISO(dateStr);
};

// Logica de filtro de data
export const filterByDate = (dateStr: string, range: string) => {
    if (!dateStr) return false;
    
    // Supondo que a data de referência hoje seria a máxima da planilha ou usar data atual do sistema.
    // Como os dados parecem ser maio de 2026, e data atual também é maio de 2026, usamos Date()
    const itemDate = startOfDay(parseFlexibleDate(dateStr)); 
    if (isNaN(itemDate.getTime())) return false; // Invalid date format fallback

    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);
    
    switch (range) {
        case 'HOJE':
            return isEqual(itemDate, today);
        case 'ONTEM':
            return isEqual(itemDate, yesterday);
        case 'ONTEM+HOJE':
            return isEqual(itemDate, today) || isEqual(itemDate, yesterday);
        case '7D':
            return isBefore(itemDate, today) && isAfter(itemDate, subDays(today, 8));
        case '14D':
            return isBefore(itemDate, today) && isAfter(itemDate, subDays(today, 15));
        case '30D':
            return isBefore(itemDate, today) && isAfter(itemDate, subDays(today, 31));
        case 'MÁXIMO':
            return true;
        default:
            return true;
    }
};

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const formatPercent = (val: number) => {
  if (!isFinite(val) || isNaN(val)) return '0,00%';
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(val);
};

export const formatNumber = (val: number) => {
  return new Intl.NumberFormat('pt-BR').format(val);
};
