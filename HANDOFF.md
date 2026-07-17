# Handoff — Pluto Dashboard: matar espaço morto sem virar scroll

## Objetivo

O usuário tirou screenshots reais do Dashboard (aba Overview) em produção e anotou com
caixas coloridas em volta de áreas vazias — pediu pra eliminar esse espaço morto trazendo
o conteúdo de Categorias e Goals (que hoje vivem em abas separadas) pra dentro da própria
página, **usando largura, não altura** — ou seja, duas colunas rodando em paralelo, não
seções empilhadas uma embaixo da outra (isso só trocaria "espaço vazio" por "mais scroll",
o que ele rejeitou explicitamente).

Screenshot 1 (mock anotado) mostra o problema original: caixas magenta = espaço vazio à
esquerda abaixo do card Aetheris; caixa azul = buraco enorme antes do rodapé; caixa
vermelha + seta = margem direita inteira sem uso (o conteúdo trava numa largura fixa bem
menor que a tela).

Screenshot 2 (resultado real, `localhost:8100/dashboard`, é o ÚLTIMO estado renderizado
que o usuário capturou) mostra a tentativa mais recente já rodando — mas com um bug novo:
**nomes de metas e categorias cortados com reticências** ("PC ...", "Viag...",
"Alime...", "Trans...", "M...", "S...", "Ass...").

## Progresso atual

### Já commitado e deployado em produção (commit `14b882c`, no ar em pluto-suite.vercel.app)
Três bugs de layout reais, confirmados e resolvidos nesta rodada anterior:
1. **Dashboard Overview**: o card "Saldo do mês" esticava (CSS grid `align-items: stretch`
   padrão) pra bater a altura do card "Evolução" ao lado, sobrando espaço vazio embaixo.
2. **Categorias**: as abas "Inbox" (drag-drop, faixa horizontal quase vazia) e "Limits"
   (grade de orçamento) foram fundidas numa view só — `BudgetRow` agora é card de
   orçamento *e* alvo de drag-drop ao mesmo tempo (`src/components/BudgetRow.tsx`,
   `src/components/CategoriesPanel.tsx`).
3. **Goals**: card sem checklist pulava o bloco de rodapé inteiro, ficando mais curto que
   o vizinho na mesma linha da grid. Agora sempre renderiza o rodapé (checklist ou uma
   linha de fallback "Sem itens — só o valor.").

### NÃO commitado, NÃO deployado, NÃO verificado (tsc não rodou até o fim)
Arquivos com mudanças pendentes:
- `src/components/AppLayout.tsx` — removi o `min-h-full` do wrapper de conteúdo (linha
  ~220) que forçava o rodapé a ficar grudado no fundo do viewport mesmo em página curta,
  criando o buraco azul. Isso afeta **todas as páginas** do app (Wallets, Reports,
  Settings, About), não só o Dashboard — efeito colateral pretendido, mas vale conferir
  se alguma tela ficou estranha com o rodapé "subindo".
- `src/pages/Dashboard.tsx` — reescrita completa: eliminei o sistema de 3 abas
  (Overview/Categories/Goals). Virou uma página só, com **duas colunas em paralelo**:
  - Coluna esquerda (`lg:col-span-2` de 5): Saldo do mês → Aetheris insight → `GoalsPanel`
  - Coluna direita (`lg:col-span-3` de 5): Evolução (+ Maiores despesas/Transações
    recentes aninhados) → `CategoriesPanel`
  - `max-w-7xl` (1280px) virou `max-w-[1600px]` — resolve a margem direita vazia.
- `src/components/CategoriesPanel.tsx` e `src/components/GoalsPanel.tsx` — ganharam
  cabeçalho de seção próprio (ícone + título, ex. "Categorias"/"Metas") porque deixaram
  de ser identificados por uma pílula de aba ativa.

## O que funcionou

- Diagnosticar a causa raiz de cada bug via `javascript_tool` (bounding boxes/
  `getBoundingClientRect`) em vez de depender de screenshot — **o `computer` (screenshot)
  trava consistentemente nesta sessão/ambiente**, com ou sem canvas 3D na página. Não
  perder tempo tentando de novo; ler estrutura (`get_page_text`, `read_page`) e medir
  layout via JS é o caminho que funciona aqui.
- Levar 3 rodadas pra entender o pedido certo (documentado abaixo) — a lição principal é
  **não executar na dúvida**: usar `AskUserQuestion` assim que a ambiguidade aparece,
  porque adivinhar errado custou mais tempo que perguntar teria custado.
- Confirmar cada fix isoladamente com medição real (bounding box) antes de composto o
  próximo — pegou o "os dois goals ficaram em exatos 175px" com precisão.

## O que NÃO funcionou (não repetir)

1. **1ª tentativa** — só rebalancear o grid existente (mover Aetheris pra baixo do Saldo,
   mover Top Expenses/Recent pra dentro do card Evolução). Resolveu o "esticado vazio"
   mas não trouxe conteúdo novo — o usuário queria Categorias/Goals visíveis na página,
   não só um reflow dos mesmos 5 cards.
2. **2ª tentativa (mal-entendido)** — assumi que a pergunta "vai mover metas e
   categorias?" era sobre a *largura* da página afetar as outras abas. Errado: ele estava
   perguntando se eu ia literalmente mover o *conteúdo* de Categorias/Goals pra dentro do
   Overview.
3. **3ª tentativa (rejeitada explicitamente)** — depois de confirmar que sim, era pra
   mover o conteúdo, eu empilhei `<CategoriesPanel />` e `<GoalsPanel />` **abaixo** da
   linha de stats, full-width. Isso preencheu o vazio mas alongou a página — o usuário
   rejeitou: *"Em vez de layout compacto e inteligente que cabe tudo na tela, criou duas
   seções scrolláveis pra baixo."* A correção (2 colunas em paralelo) é a versão atual,
   ainda não verificada.

## Bug novo a resolver — truncamento de texto

**Causa raiz conhecida, ainda não corrigida:** `GoalsPanel` e `CategoriesPanel` foram
construídos como conteúdo de aba em largura cheia, com grids que reagem a breakpoints do
**viewport** (`sm:grid-cols-2`, `xl:grid-cols-3` do Tailwind) — não à largura real do
container onde estão agora aninhados (2/5 ou 3/5 de um `max-w-[1600px]`). Numa tela larga
o breakpoint `xl:` dispara mesmo a coluna real tendo bem menos espaço, forçando 2-3
colunas de card onde só cabe 1 confortavelmente — daí "PC ...", "Alime...", etc.

Duas rotas de correção, escolher uma:
- **Rápida**: reduzir os breakpoints internos desses dois componentes pra colunas fixas
  mais conservadoras (ex. `GoalsPanel`: sempre 1-2 colunas, nunca 3; `CategoriesPanel`:
  a grade de categorias cai pra 2 colunas no lugar de `xl:grid-cols-3`). Simples, mas não
  resolve se esses componentes forem reusados em outro contexto de largura diferente no
  futuro.
- **Robusta**: adotar CSS container queries (checar se `tailwind.config.ts` já tem o
  plugin `@tailwindcss/container-queries`; se não tiver, `pnpm add -D` e configurar) pra
  cada painel reagir à própria largura renderizada, não ao viewport. Mais correto a longo
  prazo já que os painéis agora vivem em pelo menos dois contextos de largura diferentes.

Também vale conferir visualmente: o botão "Nova meta" parece flutuar longe do texto
"Metas" no screenshot 2 — pode ser só o efeito colateral do mesmo bug de largura, ou pode
ser um problema de alinhamento à parte. Resolver o truncamento primeiro e reavaliar.

## Próximos passos (em ordem)

1. `cd pluto && npx tsc -b` — **isso não rodou até o fim na sessão anterior** (Bash ficou
   indisponível por instabilidade do classificador, depois o usuário interrompeu pra
   pedir este handoff). É o primeiro gate, ainda não se sabe se o código atual compila
   limpo.
2. Corrigir o truncamento (ver seção acima) em `CategoriesPanel.tsx` e `GoalsPanel.tsx`.
3. Reverificar visualmente via browser (login local → carregar dados de exemplo →
   `/dashboard`) usando `get_page_text`/`read_page`/`javascript_tool` (não `computer`
   screenshot, que trava nesta sessão) — confirmar:
   - Nomes completos, sem reticências, em metas e categorias.
   - Botão "Nova meta"/"Nova categoria" bem posicionado perto do próprio título de seção.
   - Colunas esquerda/direita com alturas razoavelmente próximas (não precisa ser
     pixel-perfeito, só sem buraco grande de novo).
   - Testar em mobile (`resize_window` preset mobile) já que os painéis agora vivem
     dentro de um `lg:grid-cols-5` que colapsa pra 1 coluna abaixo de `lg`.
4. `npx vitest run` (deve continuar 41/41 — nenhuma lógica mudou, só JSX/layout) e
   `npx tsc -b` de novo como gate final.
5. Commit (referenciar o `14b882c` anterior como contexto) descrevendo: remoção do
   `min-h-full` no AppLayout, eliminação das 3 abas em favor de 2 colunas paralelas, e o
   fix de truncamento.
6. **Deploy manual obrigatório**: `cd pluto && vercel --prod --yes`. Pluto **não tem**
   GitHub↔Vercel conectado (diferente de Chronos/Kairos/Pokédex, que fazem auto-deploy no
   push) — `git push` sozinho não bota nada no ar.
7. Depois do deploy: `curl -s -o /dev/null -w "%{http_code}\n" https://pluto-suite.vercel.app`
   pra confirmar 200, e se possível uma checagem estrutural via browser antes de reportar
   pronto.
8. Avisar o usuário e pedir pra ele mesmo tirar um screenshot real e comparar — foi o
   canal de verificação mais confiável a sessão inteira, já que a captura de tela
   automatizada (`computer`) não está funcionando neste ambiente agora.

## Contexto útil pro próximo agente

- O usuário testa e reporta com **screenshots reais próprios, anotados**. Ler essas
  anotações literalmente antes de agir — 3 dos 4 ciclos desta sessão foram gastos
  corrigindo mal-entendidos que uma pergunta via `AskUserQuestion` teria evitado.
- `pluto-card` / `pluto-card-elevated` são classes utilitárias próprias do projeto (não é
  o `Card` do shadcn) — manter esse padrão em qualquer novo elemento.
- Pluto é PWA (service worker) — se o usuário reportar "não vi mudança nenhuma" depois de
  um deploy confirmado, a explicação mais provável é cache do SW, não bug: pedir hard
  refresh (Ctrl+Shift+R) ou aba anônima antes de investigar mais.
- Este trabalho é parte de uma revisão cross-app bem maior da "Olympus Suite" (Chronos,
  Kairos, Pluto, Hermes, Chiron, Olympus, Pokédex, Zonai Codex) — o Pluto especificamente
  está recebendo um passe de layout item-por-item a partir de screenshots reais; os outros
  apps ainda têm pendências parecidas registradas em conversas anteriores.
