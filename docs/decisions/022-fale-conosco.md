# ADR 022 — Fale Conosco: gravar antes de entregar, sem captcha e sem selo falso

**Data:** 01/11/2026 · **Versão:** 3.8.0 · **Estado:** aceita

## Contexto

A especificação de 01/11 pediu o "Entre em Contato" de uma loja de quadrinhos, com três referências visuais: o formulário (com reCAPTCHA), um botão flutuante "Fale Conosco" com mascote de atendente, e uma faixa de rodapé com bandeiras de cartão, logotipos dos Correios e selos de "site seguro". Pediu também um mural de capas da Marvel e artes pop de quadrinho.

Veio junto um endereço de e-mail pessoal para receber as mensagens.

## Decisão 1 — Gravar primeiro, entregar depois

A mensagem é **gravada no banco antes de qualquer tentativa de envio**. O e-mail é uma segunda etapa, cujo resultado fica em `delivered_at` / `delivery_error` e **nunca derruba a requisição**.

A tentação é mandar o e-mail e responder "enviado". Mas entrega falha de um jeito que a tela não tem como prever — servidor fora, senha de app revogada, rede caída, provedor recusando por volume. Se a mensagem só existisse no caminho do envio, ela sumiria junto com a falha, e quem escreveu ficaria esperando uma resposta a um pedido que ninguém recebeu.

Como consequência, a resposta da API diz `gravada` e `entregue` **separadamente**, e a tela diz os dois, com número de protocolo. "Enviado com sucesso" quando nada saiu é uma mentira pequena com custo grande.

Isso também resolve a apresentação sem internet: sem SMTP configurado, o formulário continua inteiro e as mensagens aparecem em Administração → Fale Conosco.

## Decisão 2 — Cliente SMTP escrito aqui, sem dependência nova

Nodemailer resolveria em três linhas. Mas o projeto tem `package-lock.json` travado, a integração contínua roda `npm ci` — que recusa um lock que não bate com o `package.json` — e o registro npm não é alcançável do ambiente onde este código foi escrito. Acrescentar dependência exigiria resolver a árvore no escuro.

SMTP é um protocolo de texto de 1982: abrir a conexão, cumprimentar, autenticar, dizer de quem e para quem, mandar o corpo, desligar. São seis comandos, e estão em `api/src/services/smtp.ts` com cinco testes contra um servidor de brinquedo que fala o protocolo de verdade — incluindo os três erros clássicos de cliente SMTP caseiro: resposta de várias linhas lida pela metade, acento virando lixo no assunto e falha de autenticação tratada como sucesso.

O que ele **não** faz, de propósito: STARTTLS na 587, anexos, vários destinatários, fila de reenvio, OAuth. Cada um seria código sem teste.

## Decisão 3 — Sem reCAPTCHA

A referência tinha "Não sou um robô". Aqui não tem, e a razão é o assunto do projeto.

O reCAPTCHA v2 de caixinha é barreira conhecida de acessibilidade: o desafio visual é impossível para quem não enxerga, o sonoro falha com frequência para quem depende dele, e o modo invisível julga movimento de mouse — que quem navega só por teclado não produz. Pôr justamente esse controle na **única tela onde alguém pede ajuda**, numa plataforma que existe para ser acessível, seria contradizer a proposta no pior lugar possível.

No lugar vão três freios que não cobram nada de quem é humano:

| Freio | O que pega |
| --- | --- |
| Campo-armadilha (`website`) | Robô que preenche tudo que encontra. Invisível, fora da tabulação, `aria-hidden` |
| Limitador por IP (5 em 15 min) | Volume. Ninguém escreve seis mensagens diferentes em quinze minutos |
| Limites de tamanho | Envio de mensagem gigante |

Nenhum é perfeito contra um atacante dedicado; os três juntos resolvem o problema real de um formulário de TCC, que é robô de varredura. A tela **explica isso em voz alta**, porque ausência de captcha costuma ser lida como descuido.

## Decisão 4 — O e-mail de destino não entra no repositório

O endereço informado é pessoal, e o repositório é público. Endereço de e-mail pessoal em repositório público é varrido por robô de spam em poucos dias, e isso não se desfaz.

Ele vai em `CONTATO_EMAIL_DESTINO`, no `.env`, que não é versionado. O `.env.example` traz a variável **em branco**, com o passo a passo ao lado. `SMTP_PASS` é senha de app do provedor — nunca a senha da conta —, pelo mesmo motivo que qualquer credencial: uma senha de app pode ser revogada sozinha, sem mexer na conta.

## Decisão 5 — Mascote próprio: o Pingo

A referência era um atendente humano de cabelo laranja, óculos e fone. Copiá-lo seria copiar o mascote de outra loja.

O Pingo é uma **gota de tinta com fone de atendimento**. A forma não é arbitrária: a identidade do projeto é "papel e traço de tinta" e a logo é um livro que fala — o mascote fecha o par, a tinta que *escuta*. O traço é torto do mesmo jeito que o das letras da marca.

Ele tem quatro humores (`oi`, `escutando`, `enviado`, `ops`), todos construídos a partir dos tokens, e a geometria mora em `pingo.ts` para `ferramentas/previa-mascote.mjs` desenhar exatamente o que o site desenha. Isso pagou duas vezes: na prévia apareceu que o arco do fone sumia sobre a gota (tinta sobre tinta) e que as sobrancelhas do `ops` desciam para dentro, deixando o Pingo com **cara de bravo** em vez de preocupado — justamente o oposto do que uma tela de erro deve transmitir.

O botão flutuante é um **link**, não um chat: chat exige alguém do outro lado, e inventar um atendimento inexistente seria mentir na tela mais sensível do site. Ele dá para fechar, lembra da escolha, e some sozinho no leitor, nas telas de conta e na própria página de contato.

## Decisão 6 — O que foi recusado da referência

| Pedido | Por que não | O que entrou no lugar |
| --- | --- | --- |
| Mural de capas da Marvel | Capas e personagens protegidos. Não há versão "inspirada" que resolva: o personagem é protegido por si só | A linguagem do quadrinho desenhada do zero — retícula, estrela de impacto, balão, linhas de velocidade — e, para mural, as capas originais do próprio acervo |
| Artes pop das referências | São obras de alguém. A *gramática* do quadrinho não é de ninguém; aquelas composições, sim | `ui/Quadrinhos.tsx`, desenhado para o projeto |
| Bandeiras Visa / Mastercard / Elo | Marcas registradas — e seriam mentira: o pagamento aqui é simulado | Os meios nomeados em texto: "Pix, cartão, boleto" |
| Correios, PAC, SEDEX | Marcas registradas — e não há entrega física: o acervo é digital | Nada. Não existe o que substituir |
| Selo "Site Seguro Google" / SSL | Certificação de terceiro que ninguém emitiu | Quatro selos do que é **verdade e conferível** |

Os quatro selos que ficaram afirmam coisas que dá para checar: o contraste é medido por script a cada alteração, a licença está no repositório, a simulação do pagamento está escrita na tela de compra, e o caráter acadêmico está no NOTICE. **Selo serve para dizer em que confiar; um selo falso estraga exatamente aquilo que deveria construir.**

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| Mandar o e-mail e não gravar nada | A mensagem some junto com a falha de entrega, e ninguém fica sabendo |
| Gravar e nunca enviar | Obriga a abrir o painel todo dia para descobrir que alguém escreveu |
| Instalar nodemailer | Lock travado, `npm ci` na integração contínua e registro inacessível no ambiente |
| reCAPTCHA, como na referência | Barreira de acessibilidade na tela de pedir ajuda, numa plataforma de acessibilidade |
| Chat de verdade no botão flutuante | Exige alguém do outro lado; prometer atendimento inexistente é mentir |
| Pôr o e-mail pessoal no código | Repositório público; robô de spam acha em dias e não há como desfazer |

## Consequências

- Sem SMTP configurado, nada se perde: o recurso funciona completo pelo painel.
- O administrador consegue distinguir "ninguém escreveu" de "o e-mail parou de sair", porque as duas informações são separadas na caixa de entrada.
- Responder é `mailto:` com assunto e citação montados — a resposta sai melhor do cliente de e-mail de quem responde, com assinatura e histórico, do que de uma caixa de saída que o projeto teria de manter.
- Qualquer selo, logotipo ou mascote novo volta a abrir as perguntas das decisões 5 e 6.
