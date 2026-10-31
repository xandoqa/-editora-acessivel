# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versionamento semântico.

## [3.6.0] — 2026-10-31

### Rodapé completo

O rodapé tinha uma frase e um botão. Agora traz navegação por área — ler,
publicar, o Livrin —, contato, a identidade do projeto e o selo de
acessibilidade. A coluna de publicação muda conforme o perfil: quem já publica
vê o painel e as obras em análise; quem ainda não, vê o convite.

Três ausências são deliberadas. **Não há bandeira de cartão:** uma fileira de
selos Visa/Elo diz "aceitamos esses cartões", e aqui seria mentira — o pagamento
é simulado, e no lugar vai uma linha dizendo o que de fato acontece. **Não há
CNPJ:** número de registro identifica empresa real, e inventar um para parecer
profissional é falsificar documento, ainda que em HTML. **Não há redes sociais:**
não existem perfis do Livrin, e ícone que leva a lugar nenhum é defeito, não
enfeite.

Os dados de contato são fictícios e o rodapé diz isso. O link do repositório é
real. O carimbo de versão continua lá — e acabou de provar serventia.

### Página "Sobre o Livrin"

Nova rota `/sobre`, com cinco seções: por que o projeto existe, por que ler é de
graça, o que "acessível" significa aqui, como uma obra chega ao catálogo, e que
é um trabalho acadêmico com pagamento simulado. O conteúdo vem da documentação
— README, `docs/accessibility.md`, `docs/business-rules.md` e `NOTICE.md` — e
não de texto inventado para encher página. Inclusive a parte incômoda: um
"sobre nós" que escondesse a simulação seria o único lugar do site mentindo.

### Tradução

Rodapé e página "Sobre" nasceram **inteiros no dicionário**, nos três idiomas —
38 chaves novas. Nenhum dos dois acrescentou um único trecho à conta do que
falta traduzir.

## [3.5.8] — 2026-10-31

Dois defeitos relatados com print. Os dois eram reais.

### O catálogo ficava meio em português

Trocar para inglês ou francês deixava a primeira tela do site pela metade: a
chamada, os chips de filtro, a contagem de obras e os cartões continuavam em
português. A cobertura estava declarada como parcial, mas o catálogo é a tela
que todo mundo vê primeiro — meia tradução ali é defeito, não limitação
declarada.

**O catálogo e os cartões de obra agora saem inteiros do dicionário**: chamada,
recursos destacados, chips de filtro, contagem, chamada para a autoria, e nos
cartões o formato, os selos de recurso, a modalidade e os botões.

A causa de um pedaço disso merece registro, porque é a mesma de antes e vai
voltar: **listas declaradas no nível do módulo guardavam texto, não chave.** Elas
rodam uma vez, antes de qualquer idioma ser escolhido, então o português ficava
congelado no primeiro carregamento mesmo com o seletor funcionando. `FILTERS`,
`TOP_BADGE`, `SIDE_TAG` e `FORMAT_SHORT` passaram a guardar `ChaveDeTraducao`, e
o tipo agora impede o erro.

### Tudo grande no celular

O título do catálogo era `2.75rem` fixo — 44px num aparelho de 375px, duas
palavras ocupando a tela. Agora escala com a largura: **32px no celular**, 40px
a partir de 640px, 60px no computador. O texto de apoio e os números grandes dos
painéis seguem a mesma regra.

E a busca: abaixo de 640px ela dividia a linha com o menu, os dois seletores e o
perfil, sobrava menos de cem pixels e o campo virava **uma bolinha com uma lupa
dentro**, sem lugar para digitar. Agora a lupa é um botão que abre o campo
ocupando a linha inteira, e o resto da barra cede lugar enquanto ela está aberta.

### Verificação

Medido em navegador sem interface a 360, 375, 414, 640 e 1280px: nenhuma rolagem
horizontal, título a 32px no celular, e o cabeçalho passou a ter de 123 a 177px
de folga em vez de espremer a busca. Contraste dos sete temas conferido de novo.

**O que continua faltando traduzir:** 370 trechos, concentrados no formulário de
envio, na administração e no painel da autoria —
`python3 ferramentas/conferir-traducao.py --detalhado` lista arquivo e linha.

## [3.5.7] — 2026-10-31

### Os recursos de acessibilidade voltaram a existir no celular

O grupo do cabeçalho é `hidden sm:flex`: abaixo de 640px ele não existe. Isso
significava que **no telefone não havia como ligar o alto contraste, aumentar o
texto, usar a leitura em voz alta ou abrir a janela de Libras**. Numa plataforma
cuja razão de existir é acessibilidade, era o defeito mais grave da versão para
celular — e não aparecia em teste nenhum, porque a suíte roda em tela de
computador.

Eles passam a aparecer no **menu lateral**, abaixo de 640px, com alvos de toque
de 44px (critério 2.5.5 da WCAG para dedo) em vez dos 40px que bastam para
ponteiro. O painel não duplica lógica: usa os mesmos componentes e as mesmas
preferências do cabeçalho.

### Outros acertos de tela pequena

`100dvh` além de `100vh` no `body`: em celular, `100vh` é a altura da janela com
a barra de endereço recolhida, e enquanto ela está visível sobra um pedaço de
rolagem que não leva a lugar nenhum. Os painéis de tema, idioma e da leitura em
voz alta ganharam largura máxima presa à tela, para não estourarem num aparelho
estreito.

### Abrir no celular está documentado

Não era um recurso faltando — **já funcionava** e não estava escrito em lugar
nenhum. O Vite escuta fora de `localhost`, o compose publica em todas as
interfaces e o Nginx serve a API na mesma origem, então qualquer celular na
mesma rede abre o site pelo IP do computador. O README agora traz o passo a
passo e diz o que **não** precisa ser mexido — `CORS_ORIGINS`, por exemplo — e
que o suspeito mais provável, quando não abre, é o firewall do computador.

## [3.5.6] — 2026-10-31

### Os seletores de tema e idioma foram para junto do perfil

Eles estavam dentro do grupo de acessibilidade, que é `hidden sm:flex`: **em
celular não existiam**. Quem abrisse o site no telefone não tinha como trocar de
idioma nem de tema.

Agora ficam ao lado do perfil, num par de botões estreitos, visíveis em qualquer
largura. Três razões, nessa ordem: o grupo antigo sumia no celular; idioma **não
é recurso de acessibilidade** e estava sob um rótulo errado para quem navega por
leitor de tela; e preferência de conta é procurada ao lado de quem a pessoa é.

O grupo de acessibilidade continua com o que de fato é acessibilidade: alto
contraste, tamanho do texto, leitura em voz alta e janela de Libras.

### Os dois botões dizem o que fazem

O de idioma mostra o **código do idioma atual** — PT, EN, FR — ao lado do globo.
Um globo sozinho diz que existe algo de idioma ali; o código diz em qual a pessoa
está. O de tema mostra sol ou lua conforme o tom atual.

Os dois ganharam uma seta, que é o que distingue "abre uma lista" de "alterna no
clique" — e o de tema de fato alternava, antes de os temas virarem seis. A seta
recolhe abaixo de 640px, onde cada pixel do campo de busca conta.

Os painéis ganharam `max-width` para não estourar a tela num celular estreito.

### Verificação

A largura do cabeçalho foi **medida** em 360, 400, 640, 768 e 1280px com
navegador sem interface: não há rolagem horizontal em nenhuma. O campo de busca
cai a 95px num aparelho de 360px, que é o custo honesto de ter os dois seletores
sempre à mão.

## [3.5.5] — 2026-10-31

### Seis temas, medidos

Eram dois na lista — Papel e Noite — mais o alto contraste num botão à parte.
Entraram **Sépia** (papel âmbar, leitura longa), **Tinta** (neutro frio, o mais
sóbrio), **Grafite** (escuro sem o roxo do Noite) e **Índigo** (escuro com
destaque âmbar — o único que troca a cor de ação, e por isso serve de prova de
que o sistema de tokens aguenta isso sem nenhum componente saber).

O alto contraste continua fora da lista, com botão próprio: é recurso de
acessibilidade, não gosto, e vence qualquer tema escolhido. Alternar
claro/escuro passou a preservar a escolha de cada lado.

`ferramentas/conferir-contraste.py` mede **39 pares por tema** pela fórmula da
WCAG e reprova se algum cair. Os três temas antigos passaram — a promessa de
AAA do projeto estava certa e agora está medida. Os quatro novos **não passaram
de primeira**: três tokens de texto discreto ficaram entre 6,43:1 e 7,00:1 e
foram ajustados. A verificação entrou no CI. Ver [ADR 020](docs/decisions/020-temas.md).

### Três idiomas

Português do Brasil (padrão), English e Français, com seletor na barra
superior, escolha preservada entre páginas e `lang` do documento acompanhando —
que é o que faz o leitor de tela trocar de voz.

Feito sem biblioteca, com **as chaves tipadas a partir do português**:
acrescentar uma frase e esquecer de traduzi-la **não compila**. Tradução
faltando virou erro de build em vez de texto cru na tela. Ver
[ADR 019](docs/decisions/019-internacionalizacao.md).

Obras não são traduzidas, e a interface diz isso: título, sinopse e avaliação
aparecem como foram escritos.

**Cobertura parcial, e medida.** Navegação, telas de acesso, catálogo,
biblioteca e histórico já saem do dicionário; painel da autoria, administração
e formulário de envio ainda não. `ferramentas/conferir-traducao.py` conta o que
falta, por arquivo — o número está no README, não numa frase vaga.

## [3.5.4] — 2026-10-30

### Plano B da apresentação

Novo `docs/plano-b-apresentacao.md`: os quatro comandos da véspera que evitam a
maior parte dos imprevistos, o que fazer se cada coisa falhar na frente de
gente, e o que dizer. A regra que o organiza: **o Livrin inteiro funciona sem
internet, com uma única exceção — a janela de Libras.**

### A janela de Libras avisa na hora quando não há rede

O botão tentava carregar o plugin e só desistia depois de 15 segundos. Numa
apresentação, 15 segundos de ampulheta não parecem espera: parecem defeito.

Agora, máquina sem rede nem chega a tentar — `navigator.onLine` responde na hora,
e a mensagem diz que o tradutor vem de um serviço externo e que **só este
recurso** depende de internet. O limite das tentativas que de fato acontecem caiu
para 10 segundos, e a mensagem de falha passou a distinguir conexão caída de
serviço fora do ar ou bloqueado na rede.

`navigator.onLine` é usado só para encurtar o caminho da falha, nunca para
garantir o sucesso: `false` é confiável, `true` apenas diz que existe uma
interface de rede.

### README

Ganhou duas seções: **Antes da apresentação**, apontando o plano B, e
**Correções recentes**, com o que a 3.5.3 e a 3.5.4 corrigiram e por que cada
coisa importava — inclusive a correção que foi recusada depois de implementada.

## [3.5.3] — 2026-10-30

Correções de uma auditoria completa do repositório. Nenhuma funcionalidade nova.

### Limite de login deixou de punir quem acerta a senha

O limitador contava **toda** tentativa de login, certa ou errada, 20 por IP a cada
15 minutos. Numa sala atrás do mesmo Wi-Fi — o grupo e quem estivesse avaliando —
a cota se esgotava com todo mundo entrando normalmente, com a senha certa.

Agora só tentativa que falha consome cota (`skipSuccessfulRequests`), e o teto
subiu para 30. Força bruta é feita de erros: contar os acertos protegia contra
nada e punia o uso legítimo.

As rotas que abrem cobrança — apoio, compra e assinatura — ganharam o
`cobrancaLimiter`, separado, onde o oposto é verdade: ali o **acerto** repetido é
que precisa ser contado.

### Assinatura de plano protegida contra corrida

A garantia de banco contra cobrança duplicada não alcançava a assinatura: o
índice único é sobre `(user_id, work_id)`, e plano grava `work_id` nulo — nulos
são distintos entre si no PostgreSQL.

A correção óbvia (`NULLS NOT DISTINCT`) **foi implementada, testada e recusada**:
cancelar assinatura não apaga o que foi pago, então a cobrança anterior segue
`CONFIRMADA`, e o índice impediria quem cancelou de assinar de novo. Trocaria uma
corrida improvável por um defeito garantido.

A assinatura passou a serializar com `SELECT … FOR UPDATE` sobre a linha da conta.
Um teste novo cobre o caminho que o índice teria quebrado. Ver [ADR 018](docs/decisions/018-assinatura-concorrente.md).

### Correções menores

Duas cores fixas (`text-[#d6e2ff]`) que ignoravam o sistema de temas, em
`Reader` e `ReviewStatus`, passaram a usar token. A chave que evita repetir a
palavra na leitura em voz alta deixou de ser o início do texto — que colidia
entre nós começando igual, calando o recurso — e passou a ser a identidade do nó,
por `WeakMap`. `PAYMENT_PROVIDER` foi documentada nos dois `.env.example`. Os três
`package-lock.json`, que ainda registravam `3.1.5`, foram sincronizados.

### Relatório final

Atualizado para a 3.5.3, cobrindo a 3.5.1, a 3.5.2 e esta auditoria — o que foi
verificado e estava correto, o que foi corrigido, e a recomendação que se provou
errada ao ser implementada.

## [3.5.2] — 2026-10-29

### Licença e organização do repositório

O repositório é público e não tinha arquivo de licença, o que juridicamente
significa "todos os direitos reservados": ninguém podia reaproveitar o código
legalmente. Entrou `LICENSE` com a **MIT**, em texto literal para o GitHub
reconhecer.

`NOTICE.md` separa o que a MIT **não** cobre: contos, poemas, roteiros, capas e
peças visuais são autorais do Grupo 13 e seguem reservados. A distinção que
importa está dita lá — `gerar-obras.py` e `gerar-capas.py` são código e estão
sob MIT, então qualquer pessoa pode usar os scripts para gerar as próprias
obras; o que eles produzem a partir dos textos do grupo, não.

`CONTRIBUTING.md` documenta o fluxo que o projeto usa desde a 3.0.0 — branch
por assunto, teste e documentação na mesma branch, CI verde, merge por squash —
e que até aqui existia como uma seção de quatro linhas no fim de
`docs/development.md`. Diz também o que o CI não cobre: a suíte Playwright não
roda nele.

## [3.5.1] — 2026-10-29

### Layout do player de audiodescrição

O aviso de "descrição básica" tinha sido escrito dentro da linha flex do
cabeçalho e virou um terceiro item dela, roubando largura das outras duas
colunas: título e subtítulo passaram a quebrar uma palavra por linha. A seção
virou coluna, com a linha de controles e o aviso como filhos.

Junto, dois acertos de texto: o cabeçalho dizia "Audiodescrição Narrada:
Descrição da obra: Capa", com dois 'dois-pontos' seguidos, e a linha de
progresso dizia "página 1" nos seis trechos da descrição de reserva — que
descrevem a obra, não páginas.

### Bandeira do cartão identificada pelo número

O formulário de pagamento passa a **identificar a bandeira enquanto se
digita** — Visa, Mastercard, Elo, American Express, Hipercard e Diners —, a
formatar o número em grupos, a ajustar o tamanho do código de segurança (4 no
American Express) e a trazer a lista de cartões de teste na própria tela.

**Não há seletor de bandeira**, porque o número já informa qual é: pedir que a
pessoa escolha criaria divergência entre o que ela marca e o que digita.
Bandeira também não se confunde com emissor — Nubank, Itaú e afins emitem
cartões Visa ou Mastercard.

A validação deixou de ser contagem de dígitos: entraram o **algoritmo de
Luhn** e a conferência de vencimento, **nos dois lados**. Sem Luhn,
`1111 1111 1111 1111` passava — dezesseis dígitos que nenhum banco emitiria.

### Guia de pagamento simulado

Novo `README-PAGAMENTO.md`, separado do README principal: todos os números de
cartão por bandeira (21, conferidos um por um), Pix, boleto, assinatura e
cancelamento do plano, a tabela do que falha de propósito com as mensagens
exatas, e as perguntas prováveis da banca com resposta curta. O raciocínio
técnico ficou na [ADR 017](docs/decisions/017-bandeira-do-cartao.md); `docs/api.md`
passou a descrever a conferência do cartão no servidor.

## [3.5.0] — 2026-10-29

### Histórico de leitura

Nova área em **Histórico de leitura**, com as obras que a pessoa de fato
abriu, da mais recente para a mais antiga, com a página alcançada e o
progresso.

**Sem tabela nova.** O sistema já registrava cada sessão em
`reading_sessions`, com obra, conta, última página e horário — esses dados
alimentavam só as métricas da autoria. O histórico é a mesma informação lida
do outro lado, por quem leu. Guardar duas vezes o mesmo fato criaria o risco
de os dois registros discordarem.

Agrupa por obra e guarda a **página mais distante**, não a da última sessão:
reler o começo não deve fazer o histórico dizer que a pessoa regrediu.

Apagar o histórico **desvincula** as sessões em vez de excluí-las: a leitura
sai do histórico de quem leu e a contagem da autoria continua de pé, como
acontece com um visitante sem conta.

### Planos do Livrin

Página pública em **Planos do Livrin**, no cabeçalho ao lado de "Publique sua
obra" e no menu lateral. Mostra o gratuito e o premium lado a lado, com os
benefícios — e, na mesma lista, **o que o premium não faz**: não libera obra
paga, porque quem define o preço de uma obra é a autoria e o dinheiro de uma
assinatura não é dela.

A assinatura é simulada e **funciona de verdade**: o pagamento usa o mesmo
fluxo da compra de obra, o plano é ativado pelo servidor ao confirmar a
cobrança, e há cancelamento em um clique. Cancelar devolve a conta ao
gratuito e **mantém o histórico de pagamento**.

A mensalidade reaproveita a tabela `purchases` em vez de ganhar uma própria:
mesmo ciclo, mesma idempotência, mesmo provedor. `work_id` passou a aceitar
nulo e um `CHECK` garante que OBRA exige obra e PLANO exige a ausência dela.

O diálogo de pagamento virou um componente só, usado pela compra de obra e
pela assinatura — manter duas cópias significaria mantê-las concordando para
sempre.

### Audiodescrição que funciona em toda obra

Antes, obra sem audiodescrição cadastrada tinha um botão que **não fazia
nada**. Um botão que não faz nada é pior que um botão ausente: promete um
recurso de acessibilidade e não entrega.

Agora, quando não há descrição página a página, o player narra uma
**descrição de reserva** montada a partir do que o sistema de fato sabe:
descrição da capa, ficha (formato, páginas, gênero, classificação), recursos
declarados, sinopse e notas da autoria. Nada é inventado, e onde falta
informação a narração diz que falta. A tela avisa que é descrição básica.

Iniciar, pausar e parar continuam sendo os mesmos controles — a reserva entra
no player existente, que não precisa saber a diferença.

### Descrição da capa

Campo novo na publicação: **descrição da capa**, escrita pela autoria. Serve
para duas coisas ao mesmo tempo — é o texto alternativo da imagem e é o
primeiro trecho narrado pela audiodescrição. Uma capa sem descrição é, para
quem não a enxerga, uma caixa vazia.

É editável depois da aprovação, junto com os metadados de divulgação.

## [3.4.0] — 2026-10-29

### Janela de Libras

A barra superior ganhou um botão que liga uma janela com avatar sinalizando em
Libras o texto selecionado, pelo **VLibras** — suíte livre do governo federal
feita com a UFPB. Mesma mecânica da leitura em voz alta: opcional, começa
desligada, a preferência fica guardada.

- **O script só é baixado ao ligar.** Enquanto desligado, a aplicação não faz
  uma única requisição a `vlibras.gov.br`. É a única exceção à regra de não
  carregar script de terceiro, e acontece por escolha explícita da pessoa.
- **A falha é dita.** Serviço fora do ar ou máquina sem internet: o botão
  avisa e volta a desligado, em vez de girar para sempre. Recurso de
  acessibilidade que falha em silêncio é pior que um ausente.
- **Declarada como automática.** Libras é língua com gramática própria, não
  português sinalizado. Apresentar avatar automático como equivalente a
  intérprete humano seria exagerar o que se entrega.

Ver [ADR 016](docs/decisions/016-janela-de-libras.md).

### Corrigida uma promessa que o sistema não cumpria

A marcação `hasLibras` dizia *"Janela de Libras — intérprete de Libras nos
diálogos principais"*, e **não existe campo de vídeo no sistema**: nem rota,
nem armazenamento. O catálogo exibia o selo e o filtro funcionava, com nada
por trás.

O rótulo passou a dizer o que a marcação de fato significa — *"Libras no
conteúdo: a autoria declara que a obra traz sinalização em Libras em suas
páginas"* — no catálogo, no card e nos filtros. A tradução automática ficou
onde ela é, na barra superior. São coisas diferentes e não podem se confundir.

## [3.3.0] — 2026-10-29

### Correção de segurança: audiodescrição de obra paga era acessível

`GET /works/:id/audio-descriptions` verificava apenas a visibilidade por
status, **não a aquisição**. A audiodescrição traz a descrição de cada quadro
e as falas de cada personagem — num quadrinho, é a obra em texto. O endpoint
do arquivo recusava corretamente, e este entregava o mesmo conteúdo em outro
formato.

Pior que o vazamento: era uma porta dos fundos que atingia exatamente quem
mais depende da audiodescrição. A verificação passou a ser a mesma dos outros
caminhos de conteúdo.

Fica a lição registrada na [ADR 015](docs/decisions/015-publicidade-e-plano.md):
a pergunta não é "quais endpoints servem arquivos", é **"por quais caminhos o
conteúdo pode sair"**. Num projeto de acessibilidade, o mesmo conteúdo existe
de propósito em mais de uma forma.

### O acesso de autoria e administração passou a ser declarado

Obra paga sempre abriu para a autoria e para a administração — é o que
permite revisar. Mas isso ficava invisível, e testar com a conta de
administração dava a impressão de que o bloqueio não funcionava.

O detalhe da obra agora devolve `access.reason` (`LIVRE`, `COMPRADA`,
`AUTORIA`, `ADMINISTRACAO`, `NEGADO`), e o leitor avisa quando a obra paga foi
aberta sem compra. O acesso não mudou; o que mudou é que ele se explica.

### Obra paga deixa de oferecer botões que não funcionam

No leitor, obra paga sem aquisição não mostra mais ler, ouvir e baixar: mostra
o preço e a opção de comprar. O servidor já recusava — oferecer um botão que
vai falhar é prometer o que não se cumpre.

### Publicidade dentro da experiência de leitura

Antes era uma faixa no rodapé da página. Agora o bloco aparece na abertura da
leitura, a cada quatro páginas e ao fim — **entre** unidades de leitura, nunca
dentro delas: o anúncio só surge quando a página terminou, então não parte
frase, parágrafo ou diálogo.

Sem pop-up, sem sobreposição, sem movimento, sem script de terceiro e sem
rastreamento. O bloco segue a paleta escolhida no leitor, porque um anúncio
que ignorasse o alto contraste seria ele próprio uma barreira. Os anunciantes
são fictícios e cada bloco declara que é demonstração.

Aparece **somente** em obra cuja autoria escolheu a modalidade publicidade.

### Plano do leitor

`GRATUITO` (padrão) e `PREMIUM`, ativado pela administração em
Administração → Usuários. O premium faz uma coisa: esconder os anúncios.

**Ele não desbloqueia obra paga.** Quem define preço é a autoria, e o dinheiro
de uma assinatura da plataforma não é dela — um passe livre sobre obras pagas
seria a plataforma vendendo trabalho de terceiros.


## [3.2.0] — 2026-10-29

### Monetização opcional e aquisição de obras

A autoria passa a escolher como disponibiliza cada obra: **gratuita**, **paga**
(preço próprio, até R$ 50,00) ou **com publicidade** (leitura livre, espaços
publicitários simulados). Obra paga exige aquisição confirmada para ser lida.

Isso **revisa parte da ADR 011**, que dizia que nenhuma obra ficaria atrás de
pagamento. A mudança é deliberada e está registrada na
[ADR 014](docs/decisions/014-monetizacao-e-aquisicao.md). Gratuita continua
sendo o padrão, e nenhuma obra existente mudou de modalidade.

**As regras moram no servidor**, não na tela:

- **O preço vem do banco.** A requisição de compra não tem campo de valor, e o
  schema é estrito: mandar `priceCents` é erro 400, não um campo ignorado em
  silêncio. Alterar o preço no navegador deixa de ser um ataque possível.
- **Preço existe se, e somente se, a obra é paga**, e dentro do teto —
  validado na API e por `CHECK` no banco.
- **Uma pessoa, uma aquisição confirmada por obra**, garantida por índice único
  parcial. Dois cliques simultâneos não viram duas compras porque o banco
  recusa a segunda, não porque a aplicação lembrou de verificar. A confirmação
  segue a mesma ideia: o `UPDATE` exige que a linha ainda esteja pendente.
- **A autorização é verificada na entrega do conteúdo**, em `getWorkFileInfo` e
  `getWorkAudioInfo`. A faixa de audiodescrição entra na guarda de propósito:
  para quem depende dela, ela **é** a obra, e deixá-la aberta seria uma porta
  dos fundos contra o público que a plataforma existe para servir.

**Cobrança pendente expira** (PIX 30min, cartão 15min, boleto 3 dias). Sem
isso, uma cobrança abandonada ficaria "aguardando pagamento" para sempre e
bloquearia nova tentativa — o estado que quase todo trabalho acadêmico esquece.

**Nenhum dado de cartão é armazenado.** O formulário valida formato e o
servidor descarta: nada de número, validade ou código de segurança em banco,
log ou resposta.

**Monetização não substitui curadoria.** Definir preço não publica a obra nem
concede o Selo Livrin, e obra fora do catálogo não pode ser adquirida. Na
estante, a modalidade aparece ao lado do selo, nunca dentro dele.

**Publicidade é demonstração declarada:** faixa identificada, fora do corpo do
texto, sem script de terceiro, sem rastreamento e sem coleta de dado algum. O
percentual de divisão (padrão 70% para a autoria) é configurável por obra
justamente para não parecer uma regra aprovada.

Novidades na interface: seletor de modalidade no formulário de publicação,
indicação de modalidade e preço na estante, fluxo de cartão/Pix/boleto, e a
**biblioteca pessoal** (`/biblioteca`), ligada à conta e não ao navegador.

## [3.1.6] — 2026-10-25

### Correções de acessibilidade encontradas em auditoria

Três defeitos achados numa varredura do código, não por relato de uso. Os dois
primeiros são falhas de critério WCAG, e os dois atingiam justamente quem
depende dos recursos de acessibilidade do projeto.

- **As setas do teclado brigavam entre si no leitor.** O leitor escuta `← →` em
  `window` para virar página; a leitura por palavra escuta as mesmas teclas em
  `document`, que vem antes no borbulhamento. Os dois rodavam: a seta falava a
  próxima palavra **e** virava a página — e virar a página troca o conteúdo,
  o que zera o índice pelo `MutationObserver` e devolve a leitura à primeira
  palavra. Na prática, a leitura por teclado não funcionava dentro do leitor,
  que é exatamente onde ela importa, e é a rota de quem não usa mouse
  (critério WCAG 2.1.1). O `preventDefault()` que já existia não resolvia:
  ele cancela a ação padrão do navegador, não os outros ouvintes.
  Agora há `stopPropagation()`, e a regra ficou explícita: **com a leitura
  ligada, as setas andam palavra a palavra e não viram página.** Para virar
  página, desligue a leitura ou use os botões do leitor.
- **Os dois campos de busca ficavam sem indicador de foco.** A busca global e
  a busca da administração usavam `focus:outline-none`, e o contêiner em volta
  não tinha realce de foco. O utilitário do Tailwind gera
  `.focus\:outline-none:focus`, de especificidade 0-2-0, que vence o
  `:focus-visible` do `global.css`, de 0-1-0, e aplica
  `outline: 2px solid transparent`. Resultado: ao chegar pelo Tab, **nenhum
  indicador de foco** — falha do critério WCAG 2.4.7, e a mesma regressão que
  o comentário do `global.css` descrevia como já corrigida. O utilitário saiu
  dos dois campos; o realce de borda em `focus-within` é reforço visual, não o
  indicador.
- **O `accent` do leitor reprovava no AAA que o projeto declara.** Nas paletas
  Claro e Sépia ele ficava em 6,16:1 e 6,03:1 — aprovado em AA, reprovado nos
  7:1 exigidos. Importa porque `accent` é cor de **texto** no leitor (rótulo de
  audiodescrição e fala alternada), não só de borda. Passou a `#0a6134` e
  `#6c420d`, medidos em 7,06:1 e 7,08:1.

As paletas do site não foram alteradas: as 120 combinações de token de texto
sobre superfície, nos três temas, já passavam em AAA, com pior caso 7,28:1.

### Compatibilidade entre navegadores

- **O piso de navegador passou a ser declarado**, não herdado: `chrome90`,
  `firefox90`, `safari15.4`, `edge90` em `web/vite.config.ts`. O padrão do Vite
  incluía o Safari 14, que não tem `<dialog>` com `showModal()` — e o projeto
  usa diálogo nativo nas confirmações. Ali o botão respondia e nada aparecia.
- **Diálogo com desvio:** sem `showModal`, o diálogo é exibido sem prender o
  foco, em vez de não abrir em silêncio.
- **Foco visível garantido:** navegador sem `:focus-visible` descartava a regra
  inteira e a página ficava **sem indicador de foco** — numa plataforma de
  acessibilidade, o pior defeito possível. Agora há uma regra `:focus` de
  reserva, anulada por `@supports` onde o seletor moderno existe.
- **`docs/navegadores.md`**, novo: o piso, o motivo de cada versão mínima, os
  dois dialetos de cada API com divergência (palavra sob o cursor, PDF, voz) e
  onde a experiência muda por conta do sistema, não do código.


### Leitura em voz alta: palavra sob o cursor

- **Saiu a leitura da página inteira.** Ela entregava minutos de texto corrido
  sem controle de onde se estava. Agora o Livrin fala **a palavra sob o
  ponteiro**, encontrada por `caretPositionFromPoint` / `caretRangeFromPoint` —
  sem envolver cada palavra num elemento e sem alterar o HTML da página.
- **Equivalente por teclado**, com as setas ← → andando palavra a palavra e a
  palavra corrente selecionada pela API de seleção, portanto visível sem
  inserir marcação. Hover sozinho reprovaria no critério WCAG 2.1.1.
- **Seletor de voz e velocidade.** A qualidade da fala é do sistema
  operacional; o que cabe ao Livrin é deixar escolher entre as vozes
  instaladas — e dizer isso quando não encontra nenhuma em português.

### Design — etapas 2 a 4

- **Cabeçalho, barra lateral e moldura:** traços estruturais de 2px que
  moravam dentro dos componentes caíram para 1px com a mesma cor, então o
  contraste do critério 1.4.11 ficou idêntico. O item ativo da navegação
  deixou de ser um bloco de cor e virou um filete à esquerda.
- **Página da obra:** abertura sem caixa nem degradê, como o catálogo.
- **Leitor:** o painel de preferências era um card com outros cards dentro.
  Virou seção com filetes, e as paletas viraram abas. As quatro paletas de
  leitura continuam iguais.


### Design — etapa 1 de 4: catálogo e card da obra

Primeira etapa da reforma de layout, na direção do site do Instituto Ziraldo:
rótulo de seção em versalete, fileira sem moldura, cor vinda da arte e
estrutura por alinhamento. Ícones, opções de cor e tipografia ficaram como
estavam, conforme pedido.

- **A capa aparece inteira e o texto desceu para a página.** O card era uma
  caixa com borda, sombra e três etiquetas sobre a arte, com o título escrito
  em cima da imagem. Isso exigia um gradiente preto cobrindo a capa só para o
  título ter contraste — texto sobre imagem arbitrária não tem contraste
  garantido. Agora a arte aparece como foi desenhada e o título fica embaixo,
  sobre o papel: contraste previsível e a cor da página vindo das obras.
- **Recursos assistivos viraram texto com ícone**, no lugar de etiqueta
  colorida sobre a capa.
- **A ação do card deixou de ser um bloco azul.** Um acento por página, não um
  por obra: o botão preenchido ficou só para "publicar minha obra".
- **A abertura perdeu a caixa:** rótulo pequeno, título grande e um filete
  fechando a seção.
- **Os filtros viraram abas com filete**, no lugar de pílulas preenchidas. O
  estado ativo continua explícito e `aria-pressed` segue igual.
- **A grade ganhou respiro:** `gap-6` uniforme passou a 28px na horizontal e
  48px na vertical, que é o que separa uma obra da outra agora que não há
  moldura.
- Corrigido um detalhe que só apareceu ao ver renderizado: `editionLabel` e o
  gênero às vezes são a mesma palavra, e a ficha imprimia "Ficção histórica ·
  Ficção Histórica · 9p". A comparação agora ignora acento e caixa.


### Organização do repositório

Nenhuma mudança de código — só de onde as coisas moram e de como se acha cada uma.

- **A raiz ficou limpa.** `diagramas/`, `interfaces/` e o cronograma solto saíram
  dela e foram para `docs/`, junto do resto da documentação.
- **Documento do trabalho e documentação técnica deixaram de se misturar.** Os
  seis arquivos acadêmicos que estavam soltos em `docs/` foram para
  `docs/academico/`, com um índice que diz o que é cada um.
- **Nomes de arquivo sem espaço, acento ou parêntese.** `Plataforma de
  Publicação e Distribuição Digital  (1).docx` virou
  `plataforma-de-publicacao-e-distribuicao-digital.docx`. Nome com espaço
  obriga aspas em todo comando e quebra link em markdown.
- **Índice em cada pasta:** `docs/README.md` organiza a documentação por
  assunto, e `docs/academico/`, `docs/design/`, `docs/diagramas/` e
  `ferramentas/` ganharam o seu.
- **`docs/design/` é novo**, com a direção visual escrita — o que a interface
  quer ser, o que já é, e os itens de acessibilidade que nenhuma mudança visual
  pode quebrar — mais a prévia interativa das paletas e tipografias.
- Modelos de pull request e de issue em `.github/`, e selo do CI no README.

## [3.1.5] — 2026-10-24

### Corrigido

- **PDF enviado passa pelo qpdf antes de ir para o acervo.** O pdf.js recusa
  arquivos que leitores nativos abrem sem reclamar: tabela de referências
  cruzadas quebrada, cifra de permissão, objetos empacotados de um jeito que
  ele não espera — o que é a regra, não a exceção, em digitalização antiga.
  Agora o `qpdf` reescreve a estrutura preservando o conteúdo: tira a cifra que
  não tem senha de abertura, reconstrói o xref e desfaz os object streams.
  Conferido com um PDF cifrado em AES-256 (abriu, texto intacto) e com um de
  xref destruído (reconstruído, texto recuperado). Se o `qpdf` não estiver
  instalado ou falhar, o original segue intacto — normalizar é ganho, não
  requisito.
- A mensagem do leitor passou a dizer que o Firefox usa o **mesmo** motor do
  Livrin, e que no Chrome vale tentar de novo porque o motor é outro. Omitir
  isso fazia a terceira via parecer uma saída que, no Firefox, ela não é.

## [3.1.4] — 2026-10-24

### Corrigido

- **O navegador continuava rodando a versão antiga do site depois do deploy.**
  O `index.html` é o único arquivo que aponta para os pacotes com hash no nome,
  e ele era servido **sem cabeçalho de cache** — então o navegador aplicava
  heurística própria e o guardava por horas, enquanto os arquivos em `/assets/`
  seguem marcados como `immutable` por um ano. Resultado: correções publicadas
  e invisíveis na tela, sem erro e sem pista. Agora o `index.html` vai com
  `no-store, must-revalidate`. Era a causa de "o design não mudou" e de "a
  mensagem de erro é a mesma" aparecerem juntos.
- **O PDF que o pdf.js recusa agora abre pelo leitor do navegador.** O pdf.js é
  uma implementação em JavaScript e rejeita arquivos que o motor nativo — o
  PDFium, no Chrome — abre sem reclamar, o que é comum em digitalização antiga.
  A leitura passou a ter três vias: por pedaços (Range), arquivo inteiro e, por
  último, o leitor embutido do navegador, com aviso de que a navegação por
  páginas e o "Texto desta página" não valem nesse modo. Se o arquivo abre de
  algum jeito, ele tem de abrir.

### Adicionado

- **A versão aparece no rodapé.** Sem isso não havia como olhar a tela e saber
  qual build estava no ar — foi assim que um pacote velho passou despercebido
  por três correções seguidas.

## [3.1.3] — 2026-10-24

### Corrigido

- **O mesmo defeito estava em todos os leitores, não só no de PDF.** EPUB, CBZ,
  DOCX e a faixa de audiodescrição tinham, cada um, um `catch` que trocava o
  erro real por uma frase fixa — "Não foi possível abrir este EPUB", "...este
  arquivo CBZ", "...este arquivo do Word". Verdadeiras e inúteis: não
  distinguem arquivo que não chegou de arquivo corrompido, e não deixam pista
  nenhuma para quem for investigar.

  Agora os quatro usam `web/src/components/reader/erroDeLeitura.ts`, que
  traduz o erro para linguagem comum **e** mantém o detalhe técnico junto. As
  bibliotecas já diziam coisas específicas — "Can't find end of central
  directory" para ZIP truncado, "sem document.xml" para DOCX inválido —, e
  descartar isso era jogar fora a única pista existente. Os casos de ZIP
  truncado e de arquivo protegido por senha ganharam explicação própria, já que
  EPUB, CBZ e DOCX compartilham o mesmo formato por baixo.
- A faixa de audiodescrição passou a mostrar a mensagem que a API devolve, em
  vez de uma frase genérica.

## [3.1.2] — 2026-10-24

### Corrigido

- **O leitor escondia o motivo real da falha.** A versão anterior tratava quatro
  casos conhecidos e mandava todo o resto para uma frase genérica, descartando o
  nome e a mensagem da exceção do pdf.js. Quem lia ficava sem próximo passo e
  quem mantém ficava sem pista. Agora o caso não previsto mostra o que de fato
  aconteceu, com o detalhe técnico junto.
- **Leitura em duas vias.** O pdf.js lê o arquivo em pedaços, por requisições
  Range. Quando isso falha — proxy que não repassa Range, resposta sem
  `Content-Range`, intermediário que recomprime —, o leitor agora tenta de novo
  baixando o arquivo inteiro antes de desistir. Boa parte dos "não abre" é do
  transporte, não do arquivo.

### Adicionado

- **Conferência de PDF truncado no envio.** A assinatura `%PDF-` continua no
  começo de um arquivo cortado no meio do upload, então a validação anterior o
  aceitava e o problema só aparecia no leitor, longe da causa. Agora o fim do
  arquivo é conferido: sem a marca `%%EOF`, o envio é recusado com uma mensagem
  que aponta para o envio interrompido. Com teste.

## [3.1.0] — 2026-10-24

Rodada de ajustes a partir do uso real: dois defeitos que impediam ler uma obra
enviada, e uma revisão visual pedida depois de ver o sistema no ar.

### Corrigido

- **O leitor dizia "Não foi possível abrir este PDF" para qualquer falha.** A
  mesma frase cobria arquivo sumido do volume, PDF com senha, arquivo
  corrompido e API fora do ar — quatro problemas com soluções diferentes e
  nenhuma pista de qual era. Agora cada caso tem sua mensagem e, quando a
  falha é de HTTP, o leitor busca a explicação que a própria API devolveu.
- **A API servia um arquivo sem conferir se ele existia.** O registro no banco
  e os bytes no volume têm ciclos de vida independentes: trocar entre o
  `docker-compose.yml` e o de desenvolvimento troca o volume de uploads e
  mantém o banco, e o registro passa a apontar para o nada. O `sendFile`
  falhava com um erro que não dizia nada. Agora a resposta nomeia o problema e
  diz o que fazer. Vale também para a faixa de audiodescrição.

### Adicionado

- **As obras de demonstração passaram a ter conteúdo de leitura de verdade.**
  Antes eram amostras de duas a quatro páginas. Agora são contos, poemas e
  roteiros de quadrinho originais, escritos para o projeto: *Meu Livro
  Incrível*, *Além das Estrelas*, *Chamas de Agosto*, *O Último Mapa* (HQs, 6 a
  10 páginas), *Terra Nova* (leitura fácil), *Vozes do Mar* (dez poemas),
  *Raízes* (três gerações no sertão, em EPUB). O texto-fonte fica em
  `ferramentas/historias/` e os arquivos saem de `ferramentas/gerar-obras.py`.
- Os PDFs têm **camada de texto real**, extraível e legível por leitor de tela —
  antes, parte do acervo era imagem de texto, o que numa plataforma de
  acessibilidade é contradizer a própria proposta. O EPUB ganhou `lang="pt-BR"`
  e sumário navegável.

### Alterado

- **Formato e arquivo agora batem.** *Meu Livro Incrível*, *Chamas de Agosto* e
  *Além das Estrelas* estavam cadastrados como quadrinho e guardavam um PDF de
  prosa; viraram HQ de fato, em CBZ. As páginas de *Além das Estrelas* seguem a
  audiodescrição já registrada no banco, de modo que o que se ouve e o que se vê
  contam a mesma cena. O número de páginas de cada obra passou a conferir com o
  arquivo.
- **Peso visual.** Todo card tinha traço de 2px e sombra dura de 5px; com tudo
  em destaque, nada ficava em destaque. O traço caiu para 1px **mantendo a mesma
  cor** — o contraste do critério 1.4.11 é idêntico —, a sombra dura saiu dos
  cards e ficou para o botão principal e o Selo, os raios de canto diminuíram e
  o grão do papel ficou mais discreto. A paleta clareou e dessaturou.
- **Tipografia mais calma:** títulos de peso 800 para 700, entrelinha de corpo
  mais generosa, parágrafos limitados a 72 caracteres e micro-rótulos em
  versalete mais largo.
- **Capas de demonstração refeitas.** As anteriores eram imagens geradas por IA.
  No lugar entraram composições geométricas originais — cor chapada, uma forma,
  um filete —, sem texto, porque o card já escreve título e autoria por cima.
  São 10 a 60 vezes mais leves e o gerador (`ferramentas/gerar-capas.py`) fica
  no repositório como prova de autoria.

## [3.0.0] — 2026-10-22

Auditoria completa do projeto e correção dos problemas encontrados, na ordem de
estabilidade → segurança → banco → arquitetura → funcionalidades → experiência →
design → documentação. O relatório da auditoria classificou 4 problemas
críticos, 9 altos, 13 médios e 7 baixos; esta versão endereça todos.

### Corrigido — crítico

- **Aprovar não publicava.** O catálogo filtrava `status = 'PUBLICADO'`, mas a
  decisão do administrador parava em `APROVADO`: quem publicava era o autor, em
  outra tela. Na prática, a curadoria aprovava e a obra nunca aparecia. Agora
  `APROVADO` é o estado visível no catálogo e aprovar publica na mesma ação.
- **Dois papéis onde a especificação pede três.** Qualquer conta cadastrada
  podia publicar. Agora existem `LEITOR`, `ESCRITOR` e `ADMIN`, verificados no
  servidor em todas as rotas; o leitor recebe `403` ao tentar cadastrar obra.
- **Segredos reais versionados.** Os arquivos `.env` e `api/.env` vinham dentro
  do pacote, com um `JWT_SECRET` real e outro de exemplo publicado — quem
  conhecesse o repositório assinaria um token válido para qualquer conta.
  Removidos; o segredo passa a ser gerado na primeira execução e a API recusa
  valores de exemplo, marcadores e segredos com pouca entropia.
- **Quatro senhas de administrador diferentes** espalhadas entre `.env`,
  `.env.example`, `api/.env`, README e testes — a credencial dependia de como o
  projeto tinha sido iniciado. Agora há uma fonte única: `.env.example`.

### Corrigido — alto

- O seed regravava a senha do administrador a cada inicialização, desfazendo em
  silêncio a troca feita em "Meu perfil". Agora ele só cria a conta quando ela
  não existe.
- Capa ausente no volume virava **HTTP 500** com `Erro não tratado` no log, em
  vez de 404: o tratador central não reconhecia erros que já trazem `status`.
- O componente de capa não tinha `onError`, então um arquivo faltante deixava o
  ícone de imagem quebrada em vez do fallback tipográfico que já existia.
- **Banco e uploads podiam sair de sincronia para sempre.** Nova verificação de
  integridade roda a cada subida, recopia de `seed-assets` o que falta e limpa
  referências órfãs (seção 5 da especificação).
- O `:focus-visible` global era anulado nos campos de formulário por
  `focus:outline-none` — quem navega por teclado perdia o foco em toda a
  aplicação. Numa plataforma de acessibilidade, isso era o oposto do objetivo.
- Contrastes abaixo do nível declarado: bordas de campos e cards a 1,1:1 contra
  o mínimo de 3:1 do critério WCAG 1.4.11. Tokens ajustados.
- O leitor baixava o arquivo inteiro (até 180 MB) na memória antes de desenhar
  a primeira página.
- A política de senha do seed aceitava `12345678`, que o próprio sistema
  recusaria em qualquer formulário. Unificada.
- Os modos de desenvolvimento e produção dividiam o volume de uploads com donos
  diferentes, quebrando o envio de arquivos depois de alternar entre eles.

### Corrigido — médio e baixo

- `PATCH /sessions/:id` não exigia autenticação nem conferia dono: dava para
  inflar as métricas de leitura. Agora exige o token da sessão e tem limite por
  IP na criação.
- Dados de demonstração incoerentes: as obras declaravam de 88 a 310 páginas e
  os arquivos tinham de 2 a 4. A mesma tela mostrava "208 páginas" e
  "Pág 01 / 04".
- Duas estantes do catálogo nasciam vazias por não existir nenhuma obra de
  demonstração nos formatos mangá e zine. Faltava também o filtro por categoria.
- Afirmações fixas no código ("Navegação Motora: Aprovado pelo Comitê",
  "Camadas Contraste: 7:1 Aferido") eram apresentadas como resultado de
  verificação. Agora vêm dos dados ou estão escritas como declaração do autor.
- Documentação contradizia o código em quatro pontos sobre o seed do
  administrador; o README e o `docs/api.md` citavam uma senha inexistente.
- Os testes de ponta a ponta usavam uma senha padrão que não existia em arquivo
  nenhum e falhavam no login do administrador.
- Vazamentos de memória no leitor de quadrinhos e na pré-visualização de capa.
- O filtro de gêneros da administração escondia os gêneros desativados.
- Comentários `eslint-disable` referenciavam um linter que não estava instalado.

### Adicionado

- **Sistema de apoio voluntário** (seções 17 a 19): página "Apoiar o Livrin",
  tabela `donations`, arquitetura `PaymentService → PaymentProvider → método`,
  provedor simulado explícito quanto a não movimentar dinheiro, apoio anônimo ou
  identificado, vínculo opcional com uma obra, e painel administrativo com os
  números. Os pontos de entrada são discretos: rodapé e página da obra.
- **Nova identidade visual** (seções 14 e 15): paleta, tipografia, hierarquia,
  componentes e ornamentos ilustrados originais, no espírito editorial e
  artesanal pedido — sem reproduzir personagens ou obras de terceiros.
- **Manuscrito em `.docx`** aceito no envio e lido no navegador. É o formato em
  que quem escreve entrega o texto, e por isso o que mais baixa a barreira para
  publicar. No leitor é o formato **mais acessível** de todos: o texto reflui e
  obedece à tipografia, ao espaçamento, à escala e à paleta escolhidas — ao
  contrário do PDF, que é página fixa. Nenhuma dependência nova: o `.docx` é um
  ZIP, o projeto já usa JSZip e o XML do Word é convertido em blocos tipados
  (`web/src/components/reader/docxParser.ts`). O parser devolve estrutura, nunca
  HTML — não existe marcação de terceiros para injetar na página de quem lê.
- **Selo de Qualidade Livrin** nos cards do catálogo e na página da obra, com o
  nome de quem assinou a curadoria, a data e a lista do que foi verificado. O
  critério fica aberto de propósito: selo cujo critério ninguém pode ler não
  atesta nada. A coluna `reviewed_by` (migração `0004_selo_curadoria`) registra
  o revisor no momento da aprovação.
- Leitor ativa o próprio perfil de escritor em "Meu perfil", sem depender de um
  administrador.
- Verificação de integridade como comando: `npm run db:verify`.
- `docker-compose.test.yml` com um PostgreSQL efêmero para a suíte de testes.
- Integração contínua (`.github/workflows/ci.yml`): tipos, testes, build do
  front-end e construção das duas imagens Docker.
- `iniciar.sh` e `parar.sh` para Linux e macOS, equivalentes aos `.bat`. O
  `iniciar.sh` **confere o ambiente antes de tentar subir**: binário do Docker,
  plugin Compose v2 (o `docker-compose` v1 não entende este arquivo) e daemon
  acessível — e, em cada caso, diz o que fazer em vez de deixar o Docker
  devolver o erro cru. Também respeita um `WEB_PORT` trocado no `.env` ao
  informar a URL.
- **`docs/rodar-no-linux.md`**: passo a passo seguido para rodar no Linux, do
  zero até o navegador, com a solução de cada erro no ponto em que ele aparece
  (permissão perdida no unzip, Compose v1, socket sem permissão, porta ocupada,
  disco cheio, "parece travado"). A abertura do README e o `LEIA-ME-RAPIDO.txt`
  passaram a começar pelos comandos, com os pré-requisitos logo abaixo: antes a
  explicação vinha antes do que digitar, e era fácil se perder nela.
- Pré-requisitos e tropeços de Linux documentados onde se tropeça neles:
  `LEIA-ME-RAPIDO.txt`, a abertura do README, `docs/docker.md` e cinco entradas
  novas em `docs/troubleshooting.md` (permissão de execução perdida no unzip,
  CRLF em `.env` e nos `.sh`, socket do Docker sem permissão, disco cheio,
  primeira subida que parece travada).
- Obras de demonstração em espanhol e nos formatos que faltavam, incluindo
  *Rimas*, de Bécquer (domínio público), e *O Alfabeto das Coisas Pequenas*,
  manuscrito original em `.docx` deixado **em análise** e sem capa — é assim que
  um texto chega à curadoria, e serve para ver o leitor de `.docx` funcionando
  sem precisar enviar nada.
- Testes de catálogo e de apoio; a suíte da API foi de 22 para 47 testes.

### Alterado

- Status das obras: `RASCUNHO`, `EM_ANALISE`, `APROVADO`, `PUBLICADO`,
  `REJEITADO`, `ARQUIVADO` → `RASCUNHO`, `EM_ANALISE`, `APROVADO`, `REJEITADO`,
  `ARQUIVADO`. `PUBLICADO` foi aposentado e `ARQUIVADO` passou a ser o caminho
  para despublicar.
- `POST /works/:id/publish` deixou de existir: não há mais uma ação de
  publicação separada da aprovação.
- Toda a documentação foi reescrita a partir do comportamento real do código.

### Banco de dados

- `0001_tres_papeis`: amplia `user_role` e converte as contas existentes — quem
  já tinha obra vira `ESCRITOR`, o resto vira `LEITOR`.
- `0002_aprovado_publica`: remove `PUBLICADO` de `work_status`, migrando as
  obras publicadas para `APROVADO` e preenchendo `published_at` quando faltava.
- `0003_doacoes`: tabela `donations`, enums `donation_status` e `payment_method`.

### Removido

- Arquivos `.env` e `api/.env` do pacote distribuído.
- Botão "Lançar Agora" e a tela de publicação pelo autor.
- `api/seed-assets/panels/alvorada.jpg`, que nenhum código referenciava.

## [2.0.0] — 2026-10-18

Transformação do protótipo em aplicação completa, funcional e executável com Docker.

### Adicionado
- **Leitor Acessível real**: renderização de PDF (pdf.js, com extração do texto da página), EPUB (epub.js) e CBZ (JSZip); paginação por botões e teclado (← →); escala do texto, espaçamento, tipografia Inter/Lexend/OpenDyslexic e paletas Escuro/Claro/Sépia/Amarelo-Preto aplicadas em tempo real; ficha técnica; download da obra.
- **Audiodescrição** por página (descrição do quadro + falas com personagem e tom), editável pelo autor e pela curadoria, usada também como texto alternativo das páginas.
- **Player de audiodescrição**: faixa de áudio enviada (MP3/OGG/M4A) com ±10s, barra de posição e velocidade; ou narração por voz sintetizada sincronizada com as páginas (atalho Espaço).
- **Upload real** de obras (PDF/EPUB/CBZ/CBR), capas e áudios com validação de assinatura binária, arrastar-e-soltar e barra de progresso.
- **Ciclo editorial completo**: rascunho, envio, análise com checklist e notas dos pareceristas, chat do autor com a curadoria, aprovação, solicitação de ajustes com motivo, publicação pelo autor, arquivamento e reabertura.
- **Cadastro**, perfil (nome, apresentação) e troca de senha; tela de recuperação de acesso.
- **Catálogo** com busca (título, autor, gênero, tags), filtros por formato/recurso assistivo, ordenação, paginação, "Ouvir sinopse" e "Ouvir introdução da página".
- **Avaliações** dos leitores (nota, comentário, recurso avaliado), "Voz dos Leitores" no painel do autor.
- **Métricas reais**: sessões de leitura com uso de audiodescrição, alto contraste, fonte para dislexia e zoom; painel do autor e dashboard administrativo calculados no banco.
- **Área administrativa completa**: dashboard; obras (listagem com filtros/ordenação, criação em nome de autor, edição completa, decisão editorial, checklist, notas, audiodescrição, exclusão); usuários (criar, editar, papéis, ativar/desativar, redefinir senha, excluir com proteções); gêneros; moderação de avaliações.
- **Acessibilidade global**: alto contraste amarelo/preto por tokens CSS, A-/A+, leitura da página em voz alta, modo "Leitor Otimizado", link para pular ao conteúdo, foco visível, layout responsivo com menu gaveta.
- Layout fiel ao protótipo (barra lateral, barra superior, cards, telas de análise e painel).
- Script `create-admin` (criar/promover administrador).
- Testes de integração da API (22, Vitest + Supertest + PostgreSQL) e testes E2E (Playwright).
- Documentação completa em `README.md` e `docs/` (arquitetura, banco, API, autenticação, admin, regras de negócio, acessibilidade, Docker, variáveis, desenvolvimento, testes, deploy, troubleshooting, ADRs).

### Alterado
- Express 4 → 5; React Router 6 → 7 (modo biblioteca); TanStack Query para dados do servidor; `bcrypt` → `bcryptjs`.
- Estrutura do back-end em camadas: rotas → controllers → services, validação com zod, erros padronizados.
- Status das obras: `EM_ANALISE/APROVADO/REJEITADO` → `RASCUNHO/EM_ANALISE/APROVADO/PUBLICADO/REJEITADO/ARQUIVADO` (o catálogo mostra apenas `PUBLICADO`).
- Docker: imagens multi-stage de produção (API como usuário sem privilégios, front no Nginx com proxy `/api`), compose de desenvolvimento separado, migrations e seed automáticos no start, segredos obrigatórios via `.env`.
- O front-end usa caminho relativo `/api` (proxy do Vite/Nginx) em vez de URL absoluta.

### Banco de dados
- Migration inicial `0000_initial_schema`: enums `user_role`, `work_status`, `work_format`, `file_type`, `check_status`; tabelas `users` (+ `is_active`, `headline`, `last_login_at`), `genres` (nova), `works` (gênero por FK, formato, metadados editoriais, novos recursos de acessibilidade, créditos de audiodescrição, arquivos, datas do ciclo editorial), `audio_descriptions`, `review_checks`, `review_notes`, `feedbacks` (moderação, unicidade por leitor/obra), `reading_sessions`; índices, `CHECK`s e FKs com `RESTRICT`/`CASCADE`/`SET NULL`.
- Seed idempotente com gêneros, administrador inicial e dados de demonstração do protótipo (capas e arquivos de amostra).

### Corrigido (segurança e bugs)
- Cadastro permitia escolher `role=ADMIN` (escalada de privilégio).
- Segredo JWT com valor padrão no código.
- Obras não publicadas acessíveis por qualquer pessoa em `GET /works/:id`.
- Status arbitrário aceito em `PATCH /admin/works/:id/status`.
- Erros em rotas assíncronas não tratados (requisições presas / processo derrubado).
- IDs não numéricos geravam erro de SQL.
- Seed duplicava dados a cada execução; banco dependia de `drizzle-kit push` manual.
- Credenciais pré-preenchidas no formulário de login.
- Botões e indicadores apenas visuais (mocks) substituídos por funcionalidades reais.

### Removido
- Números fixos do painel do autor e da tela de análise.
- `docs/admin.md` e `docs/development.md` antigos (reescritos e ampliados).

## [1.0.0]
- Protótipo inicial gerado: telas de login, catálogo, leitor, painel do autor, fluxo de avaliação, submissão e painel administrativo básico.
