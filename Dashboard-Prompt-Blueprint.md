# MEGA PROMPT: REPLICAÇÃO DO DASHBOARD DE LANÇAMENTO DE ALTA CONVERSÃO

**Instruções de Uso:** 
Copie o texto a partir do bloco abaixo e cole na sua primeira ou segunda mensagem no novo chat. Isso garantirá que o agente de IA reconstrua toda a arquitetura, regras de negócio e visuais do nosso Dashboard atual.

---

**[COPIE A PARTIR DAQUI]**

Você atuará como um Desenvolvedor Front-end Especialista em React, Tailwind CSS e Recharts. Sua tarefa é estruturar e desenvolver um **Dashboard de Lançamento** completo para tráfego pago. 

Neste cenário de negócio particular, eu consolido os dados da API da Meta Ads e as plataformas de venda através do N8N para uma planilha do Google Sheets. Depois, eu uso um Google Apps Script (App Script) para expor esses dados como um endpoint JSON. O seu componente React irá bater nessa API, baixar os dados, cruzar as informações e exibir cards, gráficos, e tabelas com uma usabilidade extremamente polida.

Abaixo estão TODAS as regras técnicas, de layout e lógica de dados que você DEVE implementar no componente.

### 1. Stack Tecnológica
- **Framework:** React 18+ com TypeScript estruturado.
- **Estilização:** Tailwind CSS (cores clean: dark mode preferencial ou slate modern layout, zinc/slate).
- **Ícones:** `lucide-react`.
- **Gráficos:** `recharts` (usar `ComposedChart` misturando áreas/barras para faturamento, com linhas para CPA ou ROAS).
- **Utilitários:** Ferramentas de merge de classes estilo `clsx` e `tailwind-merge` dentro do arquivo `lib/utils.ts`. 

### 2. Contrato JSON e Integração de Dados (Endpoint URL fake para mockar)
Você consumirá uma API que devolve a seguinte estrutura JSON:
```json
{
  "data": {
    "Dados da Meta": [
      {
        "Data": "YYYY-MM-DD",
        "Nome da Campanha": "string",
        "Nome do Conjunto": "string",
        "Nome do Anúncio": "string",
        "Gasto": 150.00,
        "Impressões": 10000,
        "Cliques no Link": 200,
        "Visualizações da Página de Destino": 150,
        "Iniciate Checkout": 20
      }
    ],
    "Dados dos Compradores": [
      {
        "Data": "YYYY-MM-DD",
        "Valor": 497.00,
        "utm_campaign": "Nome da Campanha",
        "utm_source": "META",
        "utm_medium": "conv",
        "utm_term": "Nome do Conjunto",
        "utm_content": "{\"co\": \"Nome do Anúncio\", \"url\": \"https://landing-page.com/slug-da-pagina\"}"
      }
    ],
    "Link dos criativos": [
      {
        "Criativos": "Nome do Anúncio",
        "Link": "https://url-imagem-ou-video.com/preview.jpg"
      }
    ]
  }
}
```

### 3. Regras de Processamento de Negócios OBRIGATÓRIAS
1. **Taxa de Imposto:** Todo `Gasto` no objeto "Dados da Meta" deve ser multiplicado por `1.1215` na hora da exibição de Custos (impostos de cartão etc). Fica `gastoReais = gasto * 1.1215`.
2. **Parsing do utm_content:** O campo `utm_content` no objeto de Ccompradores não é sempre texto simples, mas muitas vezes um JSON stringificado que você precisará fazer `JSON.parse()`. Extraia as propriedades `co` (que será o correspondente ao Nome do Anúncio) e `url` (para funil de páginas).
3. **Cruzamento de Vendas vs Trafego:** Uma venda do array "Dados dos Compradores" pertence a uma campanha do array "Dados da Meta" se bater `utm_campaign === 'Nome da Campanha'` ou pela data referencial. Vendas através de anúncios geralmente têm o `utm_source` igual a 'META'.
4. **Auto-Update:** Implemente num `useEffect` uma regra que recarregue os dados via Fetch na API a cada 5 minutos (`setInterval(() => loadData(), 5 * 60 * 1000)`). A interface deve dar feedback de `Última atualização: hh:mm`.

### 4. Layout e Funcionalidades Visuais Main (Navs e Filtros)
- **Top Bar:** Um seletor de Período de Atuação (Todo o período, Hoje, Ontem, Últimos 7 dias, Mês Atual, Últimos 30 dias). Todos os cálculos devem ser reprocessados baseados na data selecionada.
- **Navegação (Tabs):** O Dashboard deve ser dividido visualmente em 5 abas de navegação.

#### Aba 1: GERAL
- **Cards de Scorecard no Topo:** Faturamento Total, Investimento com Taxas, Lucro (Faturamento - Investimento), Ticket Médio, Total de Vendas Globais, Vendas (somente Fonte = META), CPA Global, ROAS (Faturamento / Investimento). Indique aumento ou queda percentual quando possível. Cores de Sucesso (Verde) para lucro e Atenção (Vermelho/Laranja) para prejuízo.
- **Interatividade no Gráfico:** Quando o usuário clica num Scorecard, o gráfico principal `Recharts` troca sua métrica exibida de modo equivalente (ex: se clicar no Faturamento, o gráfico de barras plota o Faturamento diário. Se clicar em CPA, mostra gráfico de linhas diário do CPA). 

#### Aba 2: FONTES DAS VENDAS
- Uma tabela com base nos Compradores mostrando o campo `utm_source` e `utm_medium` agrupados. Se `utm_source == META`, marque "Tráfego Pago". Caso contrário, "Orgânico / Disparos" etc. Mostre Qtd. Vendas, Faturamento Gerado por aquela Fonte.

#### Aba 3: FUNIL (Páginas)
- Tabela baseada em Páginas (extraída do JSON Parse de `utm_content.url` e cliques da META). Precisamos simular o percurso: Visualizações da Página de Destino -> Iniciou Checkout -> Pagamento Confirmado. Mostrando taxa de conversão (%) etapa por etapa.

#### Aba 4: CAMPANHAS E CONJUNTOS
- Uma **Tabela com Collapsible/Accordion**. Liste as Campanhas e seus totais agrupados (Orçamento Gasto, Faturamento, ROAS, CPA, Imps, CPM, Clicks, CPC, CTR).
- Ao clicar numa linha de Campanha, ela expanda mostrando todos os Adsets (Conjuntos de Anúncios) vinculados a ela, com as mesmas métricas calculadas quebrando a exibição.

#### Aba 5: CRIATIVOS (Anúncios)
- Tabela unificada no nível "Nome do Anúncio". Totalizador do Gasto + Faturamento deste anúncio, ROAS dele etc. 
- Usando o array "Link dos criativos", tente parear o Nome do Anúncio aos links de Thumbnail. Mostre no canto esquerdo da linha um pequeno avatar/preview miniatura da imagem (`<img className="h-10 w-10 object-cover" />`).

### 5. Boas práticas para o Código Gerado
- Divida ou comente fortemente os reducers/maps responsáveis pela lógica de Cruzamento, para que não dê problema de limite temporal ou re-render infinito. 
- Use extensivamente `useMemo` na hora agrupar dados baseados nas datas e arrays primários para manter alta performance de UX.
- Faça o Loading State do Fetch da API ter um Skeleton limpo e não só uma palavra "Carregando...".

**Por favor, não pule ou ignore o estilo robusto deste dashboard. Escreva o componente principal pronto para produção.** 

**[FIM DO PROMPT]**
