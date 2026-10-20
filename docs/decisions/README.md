# Registro de decisões técnicas (ADRs)

Cada arquivo responde: o que foi escolhido, por quê, quais alternativas existiam e por que a escolha é adequada a este projeto.

| # | Decisão |
| --- | --- |
| [001](001-stack.md) | Stack: React + Vite + Tailwind / Node + Express 5 / TypeScript |
| [002](002-orm-banco.md) | PostgreSQL + Drizzle ORM, migrations SQL versionadas e seed idempotente |
| [003](003-autenticacao-jwt.md) | Autenticação JWT + bcrypt + RBAC verificado no servidor |
| [004](004-armazenamento-arquivos.md) | Upload com multer e armazenamento em volume local |
| [005](005-leitor-e-audio.md) | Leitor no navegador (pdf.js, epub.js, JSZip) e audiodescrição com voz sintetizada |
| [006](006-docker.md) | Docker: imagens multi-stage, Nginx como proxy, migrations no start |
| [007](007-validacao-erros-estrutura.md) | Validação com zod, erros padronizados e organização em camadas |
| [008](008-mudancas-em-relacao-ao-prototipo.md) | O que mudou em relação ao código recebido e por quê |
