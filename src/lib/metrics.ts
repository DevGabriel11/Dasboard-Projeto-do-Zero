import { parseISO, isToday, isYesterday, subDays, isAfter, isBefore, isEqual, startOfDay, parse } from 'date-fns';

// Função segura para converter strings brasileiras como "1.234,56" para float
export const parseValue = (val: any) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = val.toString().replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const referenceDate = new Date();

// Parse flexible dates (YYYY-MM-DD or DD/MM/YYYY)
const parseFlexibleDate = (dateStr: string) => {
  if (dateStr.includes('/')) {
    // try to parse DD/MM/YYYY
    const parsed = parse(dateStr, 'dd/MM/yyyy', referenceDate);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return parseISO(dateStr);
};

export const buildDateFilter = (range: string) => {
    if (range === 'MÁXIMO') return (dateStr: string) => true;

    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);
    const d8 = subDays(today, 8);
    const d15 = subDays(today, 15);
    const d31 = subDays(today, 31);

    return (dateStr: string) => {
        if (!dateStr) return false;
        
        const itemDate = startOfDay(parseFlexibleDate(dateStr)); 
        if (isNaN(itemDate.getTime())) return false; // Invalid date format fallback
        
        if (range.startsWith('CUSTOM:')) {
            const parts = range.split(':')[1].split('|');
            if (parts.length === 2) {
                const s = startOfDay(parseISO(parts[0]));
                const e = startOfDay(parseISO(parts[1]));
                return (isEqual(itemDate, s) || isAfter(itemDate, s)) && (isEqual(itemDate, e) || isBefore(itemDate, e));
            }
        }
        
        switch (range) {
            case 'HOJE':
                return isEqual(itemDate, today);
            case 'ONTEM':
                return isEqual(itemDate, yesterday);
            case 'ONTEM+HOJE':
                return isEqual(itemDate, today) || isEqual(itemDate, yesterday);
            case '7D':
                return isBefore(itemDate, today) && isAfter(itemDate, d8);
            case '14D':
                return isBefore(itemDate, today) && isAfter(itemDate, d15);
            case '30D':
                return isBefore(itemDate, today) && isAfter(itemDate, d31);
            default:
                return true;
        }
    };
};

// Retro-compatibility just in case it's used elsewhere
export const filterByDate = (dateStr: string, range: string) => {
    return buildDateFilter(range)(dateStr);
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
