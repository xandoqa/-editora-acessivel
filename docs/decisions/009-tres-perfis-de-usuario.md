# 009 — Três perfis de usuário

**Decisão.** O enum `user_role` passa de `USER`/`ADMIN` para `LEITOR`/`ESCRITOR`/`ADMIN`, hierárquicos e cumulativos. A verificação acontece no servidor, por `requireRole`, comparando o papel **lido do banco** com o mínimo da rota.

**Problema.** A especificação define três perfis, com uma regra explícita: o leitor **não pode publicar**. Até a 2.0.0 existiam dois papéis e qualquer conta cadastrada podia criar obra, enviar arquivo e acompanhar a curadoria. A barra lateral oferecia "Publicar Obra" até para visitantes não autenticados. Era uma falha de autorização, não só de interface.

**Alternativas consideradas.**

| Opção | Por que não |
| --- | --- |
| Tabela de permissões por usuário | Flexibilidade que o domínio não pede; três perfis fixos cobrem a regra inteira |
| Papéis como lista (`roles: string[]`) | Complica consulta, índice e migração sem ganho: aqui os perfis são estritamente hierárquicos |
| Derivar "é escritor" de "tem obra" | Circular: para ter obra é preciso poder criá-la |

**Migração das contas existentes.** `0001_tres_papeis.sql` converte: `ADMIN` continua `ADMIN`; quem **já tem obra** vira `ESCRITOR` (nenhuma conta perde o que podia fazer); o restante vira `LEITOR`.

Detalhe técnico: `ALTER TYPE ... ADD VALUE` não serve aqui, porque o valor novo não pode ser usado na mesma transação e o migrator do Drizzle roda tudo em uma. Por isso a migration guarda o destino numa coluna temporária, cria o tipo novo, troca a coluna e recria o índice.

**Como alguém vira escritor.** No cadastro a pessoa escolhe entre "Quero ler" e "Quero publicar". Depois, o leitor ativa o próprio perfil em **Meu perfil → Quero publicar** (`POST /api/auth/me/writer`), sem depender de um administrador — uma plataforma cujo propósito é baixar a barreira para publicar não deveria criar uma fila para isso. O caminho inverso é só da administração.

**Consequência aceita.** `ADMIN` continua implicando `ESCRITOR`: um administrador pode cadastrar obra. É o comportamento que já existia e que a especificação descreve ("todas as permissões do leitor" / "todas as permissões anteriores").
