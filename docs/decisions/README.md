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
| [009](009-tres-perfis-de-usuario.md) | Três perfis de usuário e como as contas existentes foram migradas |
| [010](010-aprovar-e-publicar.md) | Aprovar passa a publicar; `PUBLICADO` é aposentado |
| [011](011-doacoes-provedor-simulado.md) | Doações com provedor de pagamento simulado |
| [012](012-manuscrito-em-docx.md) | Manuscrito em `.docx` lido no navegador, sem conversão e sem dependência nova |
| [013](013-leitura-de-pdf.md) | PDF: normalizar no envio com qpdf e ler em três vias |
| [014](014-monetizacao-e-aquisicao.md) | Monetização opcional e aquisição de obras; revisa parte da 011 |
| [015](015-publicidade-e-plano.md) | Publicidade entre unidades de leitura e plano do leitor; a brecha da audiodescrição |
| [016](016-janela-de-libras.md) | Janela de Libras com VLibras, opcional e carregada sob demanda |
| [017](017-bandeira-do-cartao.md) | Bandeira do cartão detectada pelo número, sem seletor; Luhn e vencimento nos dois lados |
