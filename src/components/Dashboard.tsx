import React, { useEffect, useState, useMemo } from 'react';
import { 
  Calendar, RotateCcw, LayoutDashboard, Layers, Disc, MousePointer2, Package, 
  DollarSign, TrendingUp, Zap, Ticket, ShoppingCart, Target, Megaphone, ChevronDown, ChevronRight, PieChart, Eye, MousePointerClick, Monitor, Plus, Equal
} from 'lucide-react';
import { fetchSpreadsheetData } from '../services/api';
import { cn } from '../lib/utils';
import { filterByDate, buildDateFilter, parseValue, formatCurrency, formatPercent, formatNumber } from '../lib/metrics';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
  className?: string;
}

function MetricCard({ title, value, subtext, icon, iconBg, iconColor, valueColor, className }: MetricCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all duration-300",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className={cn("p-2.5 rounded-xl", iconBg, iconColor)}>
          {icon}
        </div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
      </div>
      <div>
        <h3 className={cn("text-3xl font-black mb-1.5 tracking-tight", valueColor || "text-slate-900")}>{value}</h3>
        <p className="text-xs text-slate-500 font-medium">{subtext}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [activeTab, setActiveTab] = useState('Geral');
  const [dateRange, setDateRange] = useState('HOJE');
  
  // Expanded Campaign rows
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [activeSourceIndex, setActiveSourceIndex] = useState<number | undefined>(undefined);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchSpreadsheetData();
      setData(result);
      setLastUpdated(new Date());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const tabs = [
    { name: 'Geral', icon: <LayoutDashboard size={18} /> },
    { name: 'Fontes das Vendas', icon: <PieChart size={18} /> },
    { name: 'Funil', icon: <Layers size={18} /> },
    { name: 'Campanhas', icon: <Megaphone size={18} /> }
  ];

  const dateOptions = ['HOJE', 'ONTEM', 'ONTEM+HOJE', '7D', '14D', '30D', 'MÁXIMO'];

  const metricsData = useMemo(() => {
    const defaultMetrics = {
      geral: {
        investimentoTotal: 0,
        faturamentoTotal: 0,
        lucroTotal: 0,
        ticketMedio: 0,
        vendasIngressos: 0,
        vendasTrafego: 0,
        cpaTrafego: 0,
        cpaTotal: 0,
        impressoesTotal: 0,
        cliquesTotal: 0,
        pageViewsTotal: 0,
        checkoutsTotal: 0,
      },
      campaigns: [] as any[],
      sources: [] as any[],
      totalSalesWithSource: 0
    };

    if (!data || !data.data) return defaultMetrics;

    const rawMetaData = data.data["Dados da Meta"] || [];
    const rawBuyersData = data.data["Dados dos Compradores"] || [];

    const dateFilterPredicate = buildDateFilter(dateRange);

    // Filter by date
    const metaData = rawMetaData.filter((row: any) => {
      const date = row['Data'];
      return dateFilterPredicate(date);
    });

    const buyersByDate = rawBuyersData.filter((row: any) => {
      // Assuming 'Data' or similar exists for buyers, else fallback to max / true if missing
      const date = row['Data'] || row['Data da Compra'] || row['Criado em'];
      if (!date) return true; // If no date column found, keep it
      return dateFilterPredicate(date);
    });

    const filteredBuyers = buyersByDate;

    // 2. Geral - Investimento
    const investimentoCru = metaData.reduce((acc: number, row: any) => acc + parseValue(row['Gasto']), 0);
    const investimentoTotal = investimentoCru * 1.1215;

    // 3. Geral - Faturamento
    const faturamentoTotal = filteredBuyers.reduce((acc: number, row: any) => {
      const valStr = row['Valor'] || row['Valor Bruto'] || row['Preço'] || row['Faturamento'] || row['Valor Pago'] || '0';
      return acc + parseValue(valStr);
    }, 0);

    // 4. Geral - Lucro e Ticket Médio
    const lucroTotal = faturamentoTotal - investimentoTotal;
    const vendasIngressos = filteredBuyers.length;
    const ticketMedio = vendasIngressos > 0 ? faturamentoTotal / vendasIngressos : 0;

    // Funnel Meta Totals
    const impressoesTotal = metaData.reduce((acc: number, row: any) => acc + parseValue(row['Impressões']), 0);
    const cliquesTotal = metaData.reduce((acc: number, row: any) => acc + parseValue(row['Cliques no Link']), 0);
    const pageViewsTotal = metaData.reduce((acc: number, row: any) => acc + parseValue(row['Visualizações da Página de Destino']), 0);
    const checkoutsTotal = metaData.reduce((acc: number, row: any) => acc + parseValue(row['Iniciate Checkout']), 0);

    // 5. TRÁFEGO origin check
    const isTrafficSale = (b: any) => {
      const colFOrig = (b['utm_source'] || b['Source'] || b['Origem'] || b['Origem / utm_source'] || '').toString().trim().toUpperCase();
      return colFOrig === 'META';
    };

    const vendasTrafego = filteredBuyers.filter(isTrafficSale).length;
    const cpaTrafego = vendasTrafego > 0 ? investimentoTotal / vendasTrafego : 0;
    const cpaTotal = vendasIngressos > 0 ? investimentoTotal / vendasIngressos : 0;


    // --- AGRUPAMENTO DE CAMPANHAS E CONJUNTOS ---
    const campaignsMap: Record<string, any> = {};

    metaData.forEach((row: any) => {
      const campName = row['Nome da Campanha'] || 'Desconhecida';
      const setName = row['Nome do Conjunto'] || 'Desconhecido';
      
      if (!campaignsMap[campName]) {
        campaignsMap[campName] = {
          name: campName,
          gastoBruto: 0,
          impressoes: 0,
          cliques: 0,
          landingPageViews: 0,
          initiateCheckout: 0,
          comprasTrafego: 0, // Vendas atreladas à campanha
          setsMap: {} as Record<string, any>
        };
      }

      const camp = campaignsMap[campName];
      if (!camp.setsMap[setName]) {
        camp.setsMap[setName] = {
          name: setName,
          gastoBruto: 0,
          impressoes: 0,
          cliques: 0,
          landingPageViews: 0,
          initiateCheckout: 0,
        };
      }

      const cs = camp.setsMap[setName];
      const g = parseValue(row['Gasto']);
      const imp = parseValue(row['Impressões']);
      const clq = parseValue(row['Cliques no Link']);
      const lpv = parseValue(row['Visualizações da Página de Destino']);
      const ic = parseValue(row['Iniciate Checkout']);

      // Sum for Camp
      camp.gastoBruto += g;
      camp.impressoes += imp;
      camp.cliques += clq;
      camp.landingPageViews += lpv;
      camp.initiateCheckout += ic;

      // Sum for Set
      cs.gastoBruto += g;
      cs.impressoes += imp;
      cs.cliques += clq;
      cs.landingPageViews += lpv;
      cs.initiateCheckout += ic;
    });

    // Mapeamento extra: Tenta encontrar as vendas por campanha
    filteredBuyers.filter(isTrafficSale).forEach((b: any) => {
      const campUtm = (b['Campanha'] || b['UTM Campaign'] || '').toString();
      if (campUtm && campaignsMap[campUtm]) {
        campaignsMap[campUtm].comprasTrafego += 1;
      }
    });

    // Convert map to array
    const campaigns = Object.values(campaignsMap).map((c: any) => {
      const cInvestimento = c.gastoBruto * 1.1215;
      return {
        ...c,
        investimento: cInvestimento,
        cpm: c.impressoes > 0 ? (cInvestimento / c.impressoes) * 1000 : 0,
        cpc: c.cliques > 0 ? cInvestimento / c.cliques : 0,
        ctr: c.impressoes > 0 ? c.cliques / c.impressoes : 0,
        cpa: c.comprasTrafego > 0 ? cInvestimento / c.comprasTrafego : 0,
        sets: Object.values(c.setsMap).map((s: any) => {
          const sInvestimento = s.gastoBruto * 1.1215;
          return {
            ...s,
            investimento: sInvestimento,
            cpm: s.impressoes > 0 ? (sInvestimento / s.impressoes) * 1000 : 0,
            cpc: s.cliques > 0 ? sInvestimento / s.cliques : 0,
            ctr: s.impressoes > 0 ? s.cliques / s.impressoes : 0,
          };
        }).sort((a: any, b: any) => b.investimento - a.investimento)
      };
    }).sort((a: any, b: any) => b.investimento - a.investimento);

    // --- AGRUPAMENTO DE FONTES DE VENDAS ---
    const sourcesMap: Record<string, any> = {
      'META': { name: 'META', category: 'Tráfego Pago', count: 0, revenue: 0 },
      'IG_STORIES': { name: 'IG_STORIES', category: 'Orgânico', count: 0, revenue: 0 },
      'IG_LINKBIO': { name: 'IG_LINKBIO', category: 'Orgânico', count: 0, revenue: 0 },
      'SENDFLOW': { name: 'SENDFLOW', category: 'Disparos', count: 0, revenue: 0 },
      'SENDFLOWMBA': { name: 'SENDFLOWMBA', category: 'Disparos', count: 0, revenue: 0 },
      'SEM ORIGEM IDENTIFICADA': { name: 'SEM ORIGEM IDENTIFICADA', category: 'Sem Origem', count: 0, revenue: 0 }
    };
    let totalSalesWithSource = 0;

    const fillSourceMap = (row: any, increment: boolean) => {
      const colDStr = (row['utm_medium'] || row['Medium'] || row['utm_medium (D)'] || '').toString().toLowerCase().trim();
      const colFOrig = (row['utm_source'] || row['Source'] || row['Origem'] || row['Origem / utm_source'] || '').toString().trim();
      
      let sourceName = colFOrig || "Sem Origem Identificada";
      let category = "Indefinida";
      
      if (!colFOrig || sourceName.toUpperCase() === 'SEM ORIGEM IDENTIFICADA') {
        sourceName = "Sem Origem Identificada";
        category = "Sem Origem";
      } else if (!colDStr) {
        sourceName = colFOrig;
        category = "Outros"; 
      } else {
        sourceName = colFOrig;
        if (colDStr.includes('conv')) {
          category = "Tráfego Pago";
        } else if (colDStr.includes('organic')) {
          category = "Orgânico";
        } else if (colDStr.includes('disparos')) {
          category = "Disparos";
        } else {
          category = "Outros";
        }
      }

      const key = `${sourceName.toUpperCase()}`;
      if (!sourcesMap[key]) {
        sourcesMap[key] = {
          name: sourceName.toUpperCase(),
          category,
          count: 0,
          revenue: 0
        };
      }
      
      if (increment) {
        sourcesMap[key].count += 1;
        const valStr = row['Valor'] || row['Valor Bruto'] || row['Preço'] || row['Faturamento'] || row['Valor Pago'] || '0';
        sourcesMap[key].revenue += parseValue(valStr);
        totalSalesWithSource += 1;
      }
    };

    // Primeiro cadastra todas as chaves (inclusive de dias que podem não estar no filtro atual)
    rawBuyersData.forEach((row: any) => fillSourceMap(row, false));
    
    // Depois incementa apenas os dados do filtro de data atual
    buyersByDate.forEach((row: any) => fillSourceMap(row, true));

    const sourcesRaw = Object.values(sourcesMap).sort((a: any, b: any) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name); // Desempate por nome para manter ordem
    });
    const COLOR_HEX = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1', '#94a3b8', '#0ea5e9'];
    const COLOR_BG = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-slate-400', 'bg-sky-500'];

    const sources = sourcesRaw.map((s: any, i: number) => ({
      ...s,
      rank: i + 1,
      originalIndex: i,
      hex: COLOR_HEX[i % COLOR_HEX.length],
      bg: COLOR_BG[i % COLOR_BG.length]
    }));

    return {
      geral: {
        investimentoTotal, faturamentoTotal, lucroTotal, ticketMedio, vendasIngressos, vendasTrafego, cpaTrafego, cpaTotal, impressoesTotal, cliquesTotal, pageViewsTotal, checkoutsTotal
      },
      campaigns,
      sources,
      totalSalesWithSource
    };
  }, [data, dateRange]);

  const { geral } = metricsData;

  const toggleCampaign = (campName: string) => {
    setExpandedCampaigns(prev => ({ ...prev, [campName]: !prev[campName] }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 lg:px-10 py-5 flex flex-col md:flex-row md:items-center justify-between gap-6 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl tracking-tighter bg-slate-900 text-white shadow-md">
            LP
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Lançamento Pago - Mario</h1>
            <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">Maio 2026</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1.5 border border-slate-200">
            {dateOptions.map(opt => (
              <button 
                key={opt}
                onClick={() => setDateRange(opt)}
                className={cn(
                  "px-4 py-2 text-xs font-black rounded-md transition-all",
                  dateRange === opt 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {opt}
              </button>
            ))}
          </div>

          <button 
            onClick={loadData}
            disabled={loading}
            className="p-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm inline-flex items-center gap-2 font-bold text-sm"
          >
            <RotateCcw size={16} className={cn(loading && "animate-spin")} />
            {loading ? "Sincronizando..." : "Sincronizar"}
          </button>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto p-6 lg:p-10">
        
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
          <div className="flex flex-wrap bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm gap-1">
            {tabs.map(tab => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all",
                  activeTab === tab.name 
                    ? "bg-slate-900 text-white shadow-md" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                {tab.icon}
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {loading && !data ? (
          <div className="flex flex-col justify-center items-center h-64 text-slate-400 gap-4">
            <RotateCcw size={32} className="animate-spin text-indigo-500" />
            <span className="font-bold tracking-wide">Puxando dados da Planilha...</span>
          </div>
        ) : (
          <>
            {activeTab === 'Geral' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <MetricCard 
                  title="Investimento Total"
                  value={formatCurrency(geral.investimentoTotal)}
                  subtext="Gasto * 1.1215"
                  icon={<DollarSign size={24} />}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-500"
                  className="lg:col-span-1"
                />
                <MetricCard 
                  title="Faturamento Total"
                  value={formatCurrency(geral.faturamentoTotal)}
                  subtext="Valor Bruto"
                  icon={<TrendingUp size={24} />}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-500"
                />
                <MetricCard 
                  title="Lucro Total"
                  value={formatCurrency(geral.lucroTotal)}
                  subtext="Faturamento - Investimento"
                  valueColor={geral.lucroTotal >= 0 ? "text-emerald-600" : "text-rose-600"}
                  icon={<Zap size={24} />}
                  iconBg={geral.lucroTotal >= 0 ? "bg-emerald-50" : "bg-rose-50"}
                  iconColor={geral.lucroTotal >= 0 ? "text-emerald-500" : "text-rose-500"}
                />
                <MetricCard 
                  title="Ticket Médio"
                  value={formatCurrency(geral.ticketMedio)}
                  subtext={`Para ${geral.vendasIngressos} vendas`}
                  icon={<Ticket size={24} />}
                  iconBg="bg-indigo-50"
                  iconColor="text-indigo-500"
                />
                <MetricCard 
                  title="Vendas (Todas)"
                  value={geral.vendasIngressos}
                  subtext="Cadastradas no Sheets"
                  icon={<ShoppingCart size={24} />}
                  iconBg="bg-purple-50"
                  iconColor="text-purple-500"
                />
                <MetricCard 
                  title="Vendas (Tráfego)"
                  value={geral.vendasTrafego}
                  subtext="Origem identificada como Meta"
                  icon={<Target size={24} />}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-500"
                />

                {/* DOUBLE CPA CARD */}
                <div className="md:col-span-2 lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow h-full">
                  <h3 className="uppercase tracking-widest text-[11px] font-bold text-slate-400 mb-4 text-center">Custo por Aquisição Geral</h3>
                  
                  <div className="flex w-full h-full max-sm:flex-col">
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-rose-50 text-rose-500">
                            <Disc size={20} />
                          </div>
                          <span className="uppercase tracking-widest text-[11px] font-bold text-slate-500">CPA (Tráfego)</span>
                        </div>
                        <div className="font-outfit font-black text-[32px] tracking-tight text-slate-900 leading-none">
                          {formatCurrency(geral.cpaTrafego)}
                        </div>
                      </div>
                      <p className="text-[13px] text-slate-500 font-medium mt-3">
                        Investimento / Vendas Meta
                      </p>
                    </div>

                    <div className="w-px bg-slate-200 mx-8 max-sm:h-px max-sm:w-full max-sm:my-6 max-sm:mx-0"></div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-500">
                            <Layers size={20} />
                          </div>
                          <span className="uppercase tracking-widest text-[11px] font-bold text-slate-500">CPA (Total)</span>
                        </div>
                        <div className="font-outfit font-black text-[32px] tracking-tight text-slate-900 leading-none">
                          {formatCurrency(geral.cpaTotal)}
                        </div>
                      </div>
                      <p className="text-[13px] text-slate-500 font-medium mt-3">
                        Investimento / Vendas Totais
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Campanhas' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-xs">
                      <tr>
                        <th className="px-6 py-4">Campanha / Conjunto</th>
                        <th className="px-6 py-4 text-right">Gasto (+12%)</th>
                        <th className="px-6 py-4 text-right">Impressões</th>
                        <th className="px-6 py-4 text-right">CPM</th>
                        <th className="px-6 py-4 text-right">Cliques</th>
                        <th className="px-6 py-4 text-right">CPC</th>
                        <th className="px-6 py-4 text-right">CTR</th>
                        <th className="px-6 py-4 text-right">Compras</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {metricsData.campaigns.map((camp: any) => (
                        <React.Fragment key={camp.name}>
                          <tr 
                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                            onClick={() => toggleCampaign(camp.name)}
                          >
                            <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2 max-w-[300px] xl:max-w-md">
                              {expandedCampaigns[camp.name] ? <ChevronDown size={14} className="text-slate-400 group-hover:text-indigo-500" /> : <ChevronRight size={14} className="text-slate-400 group-hover:text-indigo-500" />}
                              <span className="truncate" title={camp.name}>{camp.name}</span>
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(camp.investimento)}</td>
                            <td className="px-6 py-4 text-right font-medium">{formatNumber(camp.impressoes)}</td>
                            <td className="px-6 py-4 text-right">{formatCurrency(camp.cpm)}</td>
                            <td className="px-6 py-4 text-right font-medium">{formatNumber(camp.cliques)}</td>
                            <td className="px-6 py-4 text-right">{formatCurrency(camp.cpc)}</td>
                            <td className="px-6 py-4 text-right">{formatPercent(camp.ctr)}</td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-600">{camp.comprasTrafego}</td>
                          </tr>
                          
                          {expandedCampaigns[camp.name] && camp.sets.map((set: any) => (
                            <tr key={`${camp.name}-${set.name}`} className="bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                              <td className="px-6 py-3 pl-12 text-slate-600 flex items-center gap-2 max-w-[300px] xl:max-w-md before:content-[''] before:w-1 before:h-full before:bg-slate-300 before:absolute relative">
                                <Layers size={14} className="text-slate-400" />
                                <span className="truncate text-xs" title={set.name}>{set.name}</span>
                              </td>
                              <td className="px-6 py-3 text-right text-xs text-slate-900">{formatCurrency(set.investimento)}</td>
                              <td className="px-6 py-3 text-right text-xs text-slate-600">{formatNumber(set.impressoes)}</td>
                              <td className="px-6 py-3 text-right text-xs text-slate-500">{formatCurrency(set.cpm)}</td>
                              <td className="px-6 py-3 text-right text-xs text-slate-600">{formatNumber(set.cliques)}</td>
                              <td className="px-6 py-3 text-right text-xs text-slate-500">{formatCurrency(set.cpc)}</td>
                              <td className="px-6 py-3 text-right text-xs text-slate-500">{formatPercent(set.ctr)}</td>
                              <td className="px-6 py-3 text-right text-xs text-slate-400">-</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                      {metricsData.campaigns.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-medium">Nenhum dado encontrado para este período/filtro.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'Funil' && (
              <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                
                {/* Visual Funnel */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 py-10 flex flex-col items-center w-full min-h-[400px]">
                  
                  {/* Step 1: Impressões */}
                  <div className="w-full max-w-3xl bg-slate-900 text-white rounded-xl py-4 flex flex-col items-center justify-center shadow-md">
                    <div className="flex items-center gap-2 text-slate-300 text-[10px] font-bold uppercase tracking-widest mb-1">
                      <Eye size={12} /> 1. Impressões
                    </div>
                    <div className="font-outfit font-black text-3xl">{formatNumber(geral.impressoesTotal)}</div>
                  </div>

                  {/* Connect 1-2 */}
                  <div className="flex flex-col items-center my-1 relative h-12 w-full max-w-xs">
                    <div className="w-px h-full bg-slate-200 absolute left-1/2 top-0 block"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm whitespace-nowrap z-10 flex flex-col items-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cliques / Impressão (CTR)</span>
                      <span className="text-xs font-black text-slate-700">{formatPercent(geral.impressoesTotal > 0 ? geral.cliquesTotal / geral.impressoesTotal : 0)}</span>
                    </div>
                  </div>

                  {/* Step 2: Cliques */}
                  <div className="w-full max-w-2xl bg-indigo-500 text-white rounded-xl py-4 flex flex-col items-center justify-center shadow-md">
                    <div className="flex items-center gap-2 text-indigo-100 text-[10px] font-bold uppercase tracking-widest mb-1">
                      <MousePointerClick size={12} /> 2. Cliques no Link
                    </div>
                    <div className="font-outfit font-black text-3xl">{formatNumber(geral.cliquesTotal)}</div>
                  </div>

                  {/* Connect 2-3 */}
                  <div className="flex flex-col items-center my-1 relative h-12 w-full max-w-xs">
                    <div className="w-px h-full bg-slate-200 absolute left-1/2 top-0 block"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm whitespace-nowrap z-10 flex flex-col items-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Views Pag / Clique</span>
                      <span className="text-xs font-black text-slate-700">{formatPercent(geral.cliquesTotal > 0 ? geral.pageViewsTotal / geral.cliquesTotal : 0)}</span>
                    </div>
                  </div>

                  {/* Step 3: Page Views */}
                  <div className="w-full max-w-xl bg-blue-500 text-white rounded-xl py-4 flex flex-col items-center justify-center shadow-md">
                    <div className="flex items-center gap-2 text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-1">
                      <Monitor className="rotate-90" size={12} /> 3. Page Views Destino
                    </div>
                    <div className="font-outfit font-black text-3xl">{formatNumber(geral.pageViewsTotal)}</div>
                  </div>

                  {/* Connect 3-4 */}
                  <div className="flex flex-col items-center my-1 relative h-12 w-full max-w-xs">
                    <div className="w-px h-full bg-slate-200 absolute left-1/2 top-0 block"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm whitespace-nowrap z-10 flex flex-col items-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Checkout / View</span>
                      <span className="text-xs font-black text-slate-700">{formatPercent(geral.pageViewsTotal > 0 ? geral.checkoutsTotal / geral.pageViewsTotal : 0)}</span>
                    </div>
                  </div>

                  {/* Step 4: Initiate Checkout */}
                  <div className="w-full max-w-lg bg-amber-500 text-white rounded-xl py-4 flex flex-col items-center justify-center shadow-md">
                    <div className="flex items-center gap-2 text-amber-100 text-[10px] font-bold uppercase tracking-widest mb-1">
                      <ShoppingCart size={12} /> 4. Initiate Checkout
                    </div>
                    <div className="font-outfit font-black text-3xl">{formatNumber(geral.checkoutsTotal)}</div>
                  </div>

                  {/* Connect 4-5 */}
                  <div className="flex flex-col items-center my-1 relative h-12 w-full max-w-xs">
                    <div className="w-px h-full bg-slate-200 absolute left-1/2 top-0 block"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm whitespace-nowrap z-10 flex flex-col items-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Venda / Checkout</span>
                      <span className="text-xs font-black text-slate-700">{formatPercent(geral.checkoutsTotal > 0 ? geral.vendasTrafego / geral.checkoutsTotal : 0)}</span>
                    </div>
                  </div>

                  {/* Step 5: Vendas (Tráfego, Totais, Others) */}
                  <div className="flex flex-col items-center gap-1 w-full max-w-md">
                    <div className="w-full bg-emerald-500 text-white rounded-xl py-2.5 flex flex-col items-center justify-center shadow-md">
                      <div className="flex items-center gap-2 text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-0.5">
                        <Ticket size={12} /> 5. Vendas (Tráfego Meta)
                      </div>
                      <div className="font-outfit font-black text-3xl leading-none">{formatNumber(geral.vendasTrafego)}</div>
                    </div>
                    
                    <div className="text-slate-300 font-black"><Plus size={16} strokeWidth={3} /></div>

                    <div className="w-full relative group bg-teal-50 border border-teal-100 text-teal-800 rounded-xl py-2.5 flex flex-col items-center justify-center shadow-sm cursor-help hover:bg-teal-100 transition-colors">
                      <span className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-teal-600/70">Vendas (Outras/Orgânicas)</span>
                      <span className="font-outfit font-black text-3xl leading-none">{formatNumber(geral.vendasIngressos - geral.vendasTrafego)}</span>
                      
                      {/* Tooltip on hover */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-slate-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-3 pointer-events-none">
                        <div className="font-bold border-b border-slate-700 pb-2 mb-2">Origens (Outras/Orgânicas)</div>
                        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                          {metricsData.sources.filter((s:any) => s.name !== 'META' && s.count > 0).map((s:any) => (
                            <div key={s.name} className="flex justify-between items-center">
                              <span className="truncate pr-2 font-medium">{s.name === 'SEM ORIGEM' ? 'Desconhecida' : s.name}</span>
                              <span className="font-bold">{s.count}</span>
                            </div>
                          ))}
                          {metricsData.sources.filter((s:any) => s.name !== 'META' && s.count > 0).length === 0 && (
                            <div className="text-slate-400 italic">Nenhuma venda encontrada</div>
                          )}
                        </div>
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                      </div>
                    </div>

                    <div className="text-slate-300 font-black"><Equal size={16} strokeWidth={3} /></div>

                    <div className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2.5 flex flex-col items-center justify-center shadow-sm hover:bg-slate-100 transition-colors">
                      <span className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-slate-500">Vendas (Totais Globais)</span>
                      <span className="font-outfit font-black text-3xl leading-none">{formatNumber(geral.vendasIngressos)}</span>
                    </div>
                  </div>
                </div>

                {/* Tabela de Campanhas - Funil */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-indigo-50 border-b border-indigo-100 text-indigo-700 font-bold uppercase tracking-wider text-xs">
                      <tr>
                        <th className="px-6 py-4">Campanha / Conjunto</th>
                        <th className="px-6 py-4 text-center">Impressões</th>
                        <th className="px-6 py-4 text-center text-indigo-400">&rarr;</th>
                        <th className="px-6 py-4 text-center">Cliques no Link</th>
                        <th className="px-6 py-4 text-center text-indigo-400">&rarr;</th>
                        <th className="px-6 py-4 text-center">Vz da Pag.<br/><span className="text-[10px] font-normal text-indigo-500">Visualizações</span></th>
                        <th className="px-6 py-4 text-center text-indigo-400">&rarr;</th>
                        <th className="px-6 py-4 text-center">IC<br/><span className="text-[10px] font-normal text-indigo-500">Iniciate Checkout</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {metricsData.campaigns.map((camp: any) => (
                        <React.Fragment key={camp.name}>
                          <tr 
                            className="hover:bg-slate-50 transition-colors cursor-pointer group bg-slate-50/20"
                            onClick={() => toggleCampaign(camp.name)}
                          >
                            <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2 max-w-[300px] xl:max-w-md">
                              {expandedCampaigns[camp.name] ? <ChevronDown size={14} className="text-slate-400 group-hover:text-indigo-500" /> : <ChevronRight size={14} className="text-slate-400 group-hover:text-indigo-500" />}
                              <span className="truncate" title={camp.name}>{camp.name}</span>
                            </td>
                            <td className="px-6 py-4 text-center font-medium bg-slate-50/50">{formatNumber(camp.impressoes)}</td>
                            <td className="px-2 py-4 text-center text-xs text-slate-400">{formatPercent(camp.ctr)}</td>
                            <td className="px-6 py-4 text-center font-medium bg-blue-50/40 text-blue-800">{formatNumber(camp.cliques)}</td>
                            <td className="px-2 py-4 text-center text-xs text-slate-400">{formatPercent(camp.cliques > 0 ? camp.landingPageViews / camp.cliques : 0)}</td>
                            <td className="px-6 py-4 text-center font-medium bg-amber-50/40 text-amber-800">{formatNumber(camp.landingPageViews)}</td>
                            <td className="px-2 py-4 text-center text-xs text-slate-400">{formatPercent(camp.landingPageViews > 0 ? camp.initiateCheckout / camp.landingPageViews : 0)}</td>
                            <td className="px-6 py-4 text-center font-bold bg-emerald-50/40 text-emerald-800">{formatNumber(camp.initiateCheckout)}</td>
                          </tr>
                          
                          {expandedCampaigns[camp.name] && camp.sets.map((set: any) => (
                            <tr key={`${camp.name}-${set.name}`} className="bg-white hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-3 pl-12 text-slate-600 flex items-center gap-2 max-w-[300px] xl:max-w-md relative">
                                <Layers size={14} className="text-slate-400" />
                                <span className="truncate text-xs" title={set.name}>{set.name}</span>
                              </td>
                              <td className="px-6 py-3 text-center text-xs text-slate-600">{formatNumber(set.impressoes)}</td>
                              <td className="px-2 py-3 text-center text-[10px] text-slate-400 font-medium">{formatPercent(set.ctr)}</td>
                              <td className="px-6 py-3 text-center text-xs text-blue-700 font-medium">{formatNumber(set.cliques)}</td>
                              <td className="px-2 py-3 text-center text-[10px] text-slate-400 font-medium">{formatPercent(set.cliques > 0 ? set.landingPageViews / set.cliques : 0)}</td>
                              <td className="px-6 py-3 text-center text-xs text-amber-700 font-medium">{formatNumber(set.landingPageViews)}</td>
                              <td className="px-2 py-3 text-center text-[10px] text-slate-400 font-medium">{formatPercent(set.landingPageViews > 0 ? set.initiateCheckout / set.landingPageViews : 0)}</td>
                              <td className="px-6 py-3 text-center text-xs text-emerald-700 font-bold">{formatNumber(set.initiateCheckout)}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                      {metricsData.campaigns.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-medium">Nenhum dado encontrado para este período.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
            )}

            {activeTab === 'Fontes das Vendas' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {/* Distribuição por Fonte */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col h-[600px]">
                  <div className="mb-4">
                    <h3 className="text-lg font-black tracking-tight text-slate-800 uppercase">Distribuição por Fonte</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Origem das Vendas Captadas</p>
                  </div>
                  
                  <div className="flex-1 w-full h-full min-h-[300px]">
                    {metricsData.sources.filter((s:any) => s.count > 0).length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={metricsData.sources.filter((s:any) => s.count > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius="60%"
                            outerRadius="80%"
                            paddingAngle={2}
                            dataKey="count"
                            stroke="none"
                          >
                            {metricsData.sources.filter((s:any) => s.count > 0).map((entry: any, index: number) => {
                              const isSelected = activeSourceIndex === entry.originalIndex;
                              return (
                                <Cell 
                                  key={`cell-${entry.originalIndex}`} 
                                  fill={entry.hex} 
                                  fillOpacity={activeSourceIndex !== undefined && !isSelected ? 0.3 : 1}
                                  className="transition-all duration-300 outline-none"
                                  style={{
                                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                    transformOrigin: 'center'
                                  }}
                                />
                              );
                            })}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any, name: string, props: any) => [`${value} vendas (${formatCurrency(props.payload.revenue)})`, name]}
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex justify-center items-center h-full text-slate-400 font-medium">Nenhum dado encontrado.</div>
                    )}
                  </div>
                </div>

                {/* Ranking de Fontes */}
                <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden flex flex-col max-h-[800px]">
                  <div className="mb-6 flex-shrink-0">
                    <h3 className="text-lg font-black tracking-tight text-slate-800 uppercase">Ranking de Fontes</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Performance por Canal de Aquisição</p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex flex-col gap-6">
                      {[
                        { title: "Tráfego Pago", items: metricsData.sources.filter((s:any) => s.category === "Tráfego Pago") },
                        { title: "Tráfego Orgânico", items: metricsData.sources.filter((s:any) => s.category === "Orgânico") },
                        { title: "Disparos", items: metricsData.sources.filter((s:any) => s.category === "Disparos") },
                        { title: "Sem Origem", items: metricsData.sources.filter((s:any) => s.category === "Sem Origem") },
                        { title: "Outros", items: metricsData.sources.filter((s:any) => s.category === "Outros") }
                      ].filter(g => g.items.length > 0).map((group) => (
                        <div key={group.title} className="flex flex-col gap-3">
                          <h4 className="font-black text-slate-800 uppercase tracking-tight ml-1">{group.title}</h4>
                          <div className="flex flex-col gap-2">
                            {group.items.map((source: any) => {
                              const percentage = metricsData.totalSalesWithSource > 0 
                                ? (source.count / metricsData.totalSalesWithSource) 
                                : 0;
                              const isSelected = activeSourceIndex === source.originalIndex;

                              return (
                                <div 
                                  key={source.name} 
                                  onClick={() => setActiveSourceIndex(isSelected ? undefined : source.originalIndex)}
                                  className={cn("flex items-center justify-between p-4 rounded-xl border bg-white cursor-pointer transition-all group", 
                                    isSelected ? "border-indigo-500 shadow-md ring-2 ring-indigo-500/20" : "border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200"
                                  )}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={cn("w-10 h-10 rounded-full text-white flex items-center justify-center font-black text-lg shadow-sm transition-transform", 
                                      source.bg, isSelected && "scale-110"
                                    )}>
                                      {source.rank}
                                    </div>
                                    <div>
                                      <h4 className="font-black text-slate-900 text-[15px]">{source.name}</h4>
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-0.5">{source.category}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <div className="font-black text-slate-900 text-lg">
                                      {formatNumber(source.count)} <span className="text-xs font-bold text-slate-400 uppercase">VENDAS</span>
                                    </div>
                                    <div className="text-xs font-bold text-slate-500 mt-1 flex items-center justify-end gap-2">
                                      <span className={cn(
                                        "px-2 py-0.5 rounded text-[10px]",
                                        percentage >= 0.2 ? "bg-emerald-50 text-emerald-600" : "text-slate-400"
                                      )}>
                                        {formatPercent(percentage)} DO TOTAL
                                      </span>
                                      <span className="text-slate-300">|</span>
                                      <span className="text-indigo-600">{formatCurrency(source.revenue)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      
                      {metricsData.sources.length === 0 && (
                        <div className="py-12 text-center text-slate-500 font-medium border border-dashed border-slate-200 rounded-xl">
                          Nenhum dado encontrado para este período.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        {lastUpdated && (
          <div className="mt-12 flex justify-center items-center gap-2 text-xs font-bold text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Última sincronização: {lastUpdated.toLocaleTimeString()} 
          </div>
        )}
      </main>
    </div>
  );
}


