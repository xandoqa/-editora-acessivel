# Obras em domínio público no acervo

Critério para incluir obra de terceiro na biblioteca de demonstração, e a lista do que já foi verificado. O repositório é público: ser trabalho acadêmico **não** cria exceção a direito autoral.

---

## A regra no Brasil

Lei 9.610/98, art. 41: a proteção dura **70 anos contados de 1º de janeiro do ano seguinte ao falecimento** do autor.

| Autor faleceu em | Entra em domínio público em |
| --- | --- |
| 1948 | 1º/1/2019 |
| 1953 | 1º/1/2024 |
| 1954 | 1º/1/2025 |
| 1955 | 1º/1/2026 |

Obra audiovisual e fotográfica segue outra contagem (art. 44): 70 anos a partir da divulgação, não da morte.

**O prazo é por país.** Domínio público no Brasil não significa domínio público em todo lugar: o México, por exemplo, usa 100 anos. Como o Livrin é servido no Brasil, a regra brasileira é a que vale aqui — mas vale saber que a afirmação "está em domínio público" é sempre relativa a uma jurisdição.

---

## As três armadilhas

São os casos em que o autor morreu há mais de 70 anos e **ainda assim** não se pode publicar o arquivo que se tem na mão.

### 1. Tradução tem direito próprio

O original cair em domínio público **não liberta a tradução**. A tradução é obra derivada, com autoria do tradutor e prazo contado a partir da morte *dele*.

Então, de uma lista de autores estrangeiros falecidos em 1955 — Thomas Mann, Einstein, Paul Claudel, Teilhard de Chardin, Ortega y Gasset —, o que ficou livre foi o texto **em alemão, francês e espanhol**. Qualquer tradução brasileira recente continua protegida.

Para usar esses autores seria preciso o texto no idioma original, ou uma tradução cujo tradutor também já esteja em domínio público.

### 2. Gravação não é a mesma coisa que a obra

Carmen Miranda faleceu em 1955, mas "gravações e interpretações" envolvem **direitos conexos**, que são outros e têm contagem própria: os do intérprete e os do produtor fonográfico, contados a partir da fixação, não da morte da cantora. E a canção tem autor — compositor e letrista —, que pode ter morrido bem depois dela.

Resultado: uma gravação de Carmen Miranda pode ter três titulares vivos ao mesmo tempo. Fora que o Livrin é plataforma de leitura, não de áudio musical.

### 3. Edição tem direito próprio

Diários, cartas e manuscritos publicados postumamente costumam sair em edição com organização, notas, prefácio e fixação de texto — tudo isso é obra protegida do organizador, mesmo quando o texto-base já caiu.

Vale para os diários de Getúlio Vargas e para o diário de Frida Kahlo: o conteúdo pode estar livre, a **edição** que circula não está.

---

## Correção de uma confusão comum

Listas de "entrou em domínio público em 2026" costumam trazer **Monteiro Lobato** entre os falecidos em 1955. Está errado: **Lobato faleceu em 1948**, e suas obras estão em domínio público no Brasil **desde 1º de janeiro de 2019** — o que foi bastante noticiado na época. Ele é utilizável, e há sete anos.

---

## Verificado e aproveitável

Autores brasileiros, em português, sem o problema da tradução:

| Autor | Falecimento | Livre desde | Observação |
| --- | --- | --- | --- |
| Monteiro Lobato | 1948 | 2019 | Texto em português, sem intermediário |
| Graciliano Ramos | 1953 | 2024 | *Vidas Secas*, *Angústia*, *Memórias do Cárcere* |
| Oswald de Andrade | 1954 | 2025 | *Pau-Brasil*, *Manifesto Antropófago* |
| Getúlio Vargas | 1954 | 2025 | Só o texto dos diários, nunca a edição comentada |

**Fora de escopo:** filmes. *O Circo*, de Chaplin, é audiovisual — o Livrin publica livros e quadrinhos.

---

## A regra de procedência

Esta é a parte que não é jurídica, é de integridade, e vale mais que a lista acima.

**O texto precisa vir de uma fonte identificada, e a fonte fica registrada junto com a obra.** Nunca escrever texto e atribuí-lo a um autor real, nem "reconstituir de memória".

Numa plataforma de leitura, texto inventado com nome de autor verdadeiro é falsificação — e num trabalho acadêmico é o defeito mais grave disponível, pior que ter menos obras no acervo. Se o texto não puder ser obtido de fonte verificável, a obra **não entra**.

**O precedente correto já está no projeto:** *Rimas*, de Gustavo Adolfo Bécquer (falecido em 1870), traz as rimas XXI, XXIII e LIII — texto curto, canônico e conferível. É o padrão a seguir: obra curta e verificável vale mais que romance inteiro mal copiado.

---

## Não dá para pôr a obra na estante sem o arquivo

Tentação natural: cadastrar as obras só com capa, título e sinopse, e deixar o texto para depois. **O sistema não permite**, e isso é proposital.

Em `api/src/services/works.service.ts`, mudar o estado de uma obra verifica o arquivo duas vezes:

- para **EM_ANALISE** — *"Envie o arquivo original da obra antes de submetê-la para análise."*
- para **APROVADO** — *"Não é possível aprovar uma obra sem o arquivo original."*

Como aprovar **é** publicar ([ADR 010](decisions/010-aprovar-e-publicar.md)), uma obra sem arquivo não pode estar no catálogo. O único estado que aceita obra sem arquivo é `RASCUNHO`, visível apenas para a própria autoria.

Inserir no seed uma obra `APROVADO` sem arquivo criaria, no banco, um estado que a aplicação recusa criar pela interface — uma contradição que qualquer avaliador atento encontra, e que enfraqueceria justamente a regra de curadoria que é o centro do projeto. **Primeiro o texto, depois a estante.**

## Como adicionar, quando houver o texto

O caminho já existe e está automatizado:

1. Colocar o texto em `ferramentas/historias/<slug>.txt`, no formato que o gerador espera (cabeçalho com `#` título, `@` autoria, `=` linha de apoio; `##` abre capítulo).
2. Rodar `python3 ferramentas/gerar-capas.py` — a capa é composição geométrica original. **Nunca reproduzir capa de edição comercial**, que tem direito próprio do ilustrador e da editora, mesmo quando o texto é livre.
3. Rodar `python3 ferramentas/gerar-obras.py api/seed-assets/works`.
4. Acrescentar a entrada em `api/src/db/seed-data.ts`, com `editionLabel` deixando claro que é edição de domínio público.

Requer `reportlab` e `pillow`.
