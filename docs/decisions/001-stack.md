# 001 — Stack

**Decisão.** Manter a stack do projeto recebido: **React 18 + Vite + Tailwind CSS 3 + React Router** no front-end; **Node.js + Express + TypeScript** no back-end. Atualizações: Express 4 → **5** (erros de funções `async` chegam ao tratador central sem wrappers), React Router 6 → **7** em modo biblioteca (mesma API; corrige vulnerabilidades da v6) e **TanStack Query** para dados do servidor.

**Alternativas.** Next.js (SSR, mas mudaria toda a estrutura e o deploy), NestJS (mais cerimônia do que o projeto precisa), Fastify (bom, mas exigiria reescrever o que já existia em Express), Redux/Zustand para estado (desnecessário: quase todo estado é do servidor).

**Por que é adequada.** Respeita o que já estava definido (prioridade 1 do projeto), é amplamente conhecida (manutenção fácil), roda igual em qualquer SO e o TypeScript estrito nos dois lados reduz erros de integração. React Query elimina código repetido de loading/erro/cache e torna a invalidação após mutações explícita.

**Versões fixadas em majors estáveis**: TypeScript 5.9, Vite 6, Tailwind 3.4, zod 3, pdfjs-dist 4.10 — escolhidas por estabilidade da API e compatibilidade, evitando majors muito recentes.
