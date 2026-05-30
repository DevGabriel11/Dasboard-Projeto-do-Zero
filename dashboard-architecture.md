# Arquitetura do Dashboard de Lançamento

Este documento descreve a estrutura completa do Dashboard construído com React, Recharts, Tailwind CSS e Lucide Icons, para que possa ser replicado em um novo projeto.

## Tecnologias e Bibliotecas Utilizadas
- **React** (Vite + TypeScript)
- **Tailwind CSS** (para estilização rápida e responsiva)
- **Lucide React** (para iconografia, importado de `lucide-react`)
- **Recharts** (para os gráficos de linha e barras, importado de `recharts`)
- **Class Variance Authority / clsx / tailwind-merge** (através da função utilitária `cn()`)

## Estrutura de Arquivos
A aplicação essencialmente consiste na seguinte organização principal:
- `/src/components/Dashboard.tsx`: O componente principal que contém todo o layout, os cards de métricas, as tabelas dinâmicas, os gráficos e os filtros.
- `/src/services/api.ts`: Serviço que consome a URL do Google Apps Script (retorna o JSON da planilha consolidada).
- `/src/lib/metrics.ts`: (Opcional, embutido ou separado) Arquivo com funções auxiliares como `formatCurrency`, `formatNumber`, agrupamentos e lógicas de filtragem por data.
- `/src/lib/utils.ts`: Arquivo utilitário básico contendo apenas a função `cn()` para mesclar componentes de classe do Tailwind.

## Fontes de Dados e Integração (O JSON esperado)
O App Script retorna um objeto JSON contendo arrays e guias diferentes:
```json
{
  "data": {
    "Dados da Meta": [
      {
        "Data": "2026-05-23",
        "Nome da Campanha": "Campanha 1",
        "Nome do Conjunto": "Conjunto 1",
        "Nome do Anúncio": "Ad 1",
        "Gasto": 100,
        "Impressões": 5000,
        "Cliques no Link": 100,
        "Visualizações da Página de Destino": 80,
        "Iniciate Checkout": 10
      }
    ],
    "Dados dos Compradores": [
      {
        "Data": "2026-05-23",
        "Valor": 250,
        "utm_campaign": "Campanha 1",
        "utm_source": "META",
        "utm_medium": "conv",
        "utm_term": "Conjunto 1",
        "utm_content": "{\"co\": \"Ad 1\", \"url\": \"https://landing-page.com/slug\"}"
      }
    ],
    "Link dos criativos": [
      {
        "Criativos": "Ad 1",
        "Link": "https://url-do-criativo.com"
      }
    ]
  }
}
```

## Páginas e Abas do Dashboard (Tabs)
O Dashboard inclui um Menu Superior para Filtros de Data que recarrega os dados, auto-reload a cada 5 minutos, e as seguintes abas (Tabs) que agrupam as métricas:

1. **Geral**:
   - Cards sumários (Scorecards) calculando: Investimento Total (+ imps_tax de 1.1215), Faturamento Total, Lucro Total, Ticket Médio, Vendas (todas), Vendas (via Tráfego / UTM "META"), CPA (Tráfego), CPA (Total).
   - Um Gráfico (Recharts `ComposedChart`) de Histórico Diário que renderiza Barras e Linhas dinamicamente conforme os Scorecards clicados.

2. **Fontes das Vendas**:
   - Agrupamento das UTMs `utm_source` e regras para categorização entre "Tráfego Pago" (medium conv), "Orgânico", "Disparos" ou "Sem Origem".

3. **Funil (Páginas)**:
   - Extrai do JSON `utm_content` a URL base/clean_url para mapear `pageViews`, e funil: Entrou na LP -> Iniciou Checkout -> Pagos. Calculando a taxa de conversão das vendas.

4. **Campanhas (Campanhas e Conjuntos)**:
   - Tabela expansível listando todas as campanhas, somando total de investimento, impressões, cliques, CPM, CPC, CTR, CPAs e ROAS. Expandindo revela os Adsets / Conjuntos de anúncios e as devidas métricas detalhadas.

5. **Criativos**:
   - Tabela ordenável de Anúncios. Cruze os nomes dos anúncios (Dados Meta) com as vendas (utm_content.co) e cruza o link preview da imagem (Aba "Link dos criativos").

## O que enviar no novo Chat
Para iniciar a construção num novo chat, você pode me enviar o seguinte prompt:

> **"Estou iniciando a construção de um novo projeto de Dashboard para o N8N. Eu quero que você replique a mesma estrutura de Dashboard construído com React, Recharts e Tailwind CSS. A versão anterior tinha abas como (Geral, Fontes, Funil, Campanhas e Criativos), um card menu com auto-update de 5 minutos, processamento de métricas local cruzando array de `Dados da Meta` (Custos e tráfego) e `Dados dos Compradores` (Vendas, origens UTMs). Crie os arquivos estruturais para receber esse novo payload que vai chegar através da url mockada que vou substituir."**

Isso trará de imediato a base perfeita para reestruturar todos os dados.
