# Plano B da apresentação

Vai ter internet. Este documento existe para o caso de não ter — ou de ter e não prestar, que é o cenário mais comum em sala.

A regra que organiza tudo aqui: **o Livrin inteiro funciona sem internet, com uma única exceção, a janela de Libras.** Todo o resto é local — o banco, a API, o site, o leitor de PDF, as fontes, as obras. Se a rede cair, você perde um recurso e continua a apresentação.

---

## Na véspera: os quatro comandos que evitam 90% dos problemas

Faça isto **na máquina da apresentação**, com internet, pelo menos um dia antes. Leva alguns minutos e é o que separa um imprevisto de um desastre.

```bash
cd caminho/para/o/projeto

# 1. Construa tudo com rede sobrando. Depois disso, as imagens ficam na máquina.
docker compose build

# 2. Suba e confira que abre em http://localhost:5173
docker compose up -d

# 3. Entre no site, faça login, abra uma obra, compre uma obra paga.
#    O que você não testar na véspera, testa na frente da banca.

# 4. Deixe pronto para o dia: pare SEM apagar os volumes.
docker compose stop
```

> **Nunca rode `docker compose down -v` na véspera nem no dia.** O `-v` apaga os volumes `pgdata` e `uploads` — ou seja, o banco e os arquivos das obras. Reconstruir tudo isso exige internet. `stop` e `down` (sem `-v`) são seguros.

No dia, para subir:

```bash
docker compose up -d
```

**Sem `--build`.** O `./iniciar.sh` roda `docker compose up --build`, e `--build` com a rede ruim tenta buscar coisas que já estão na máquina. Na véspera, use o script à vontade; no dia, suba direto.

### Cópia de segurança das imagens

Se quiser blindagem extra — por exemplo, se a apresentação for em outra máquina — exporte as imagens para um arquivo e leve num pendrive:

```bash
# na véspera, com internet
docker save livrin-api livrin-web postgres:16-alpine -o livrin-imagens.tar

# no dia, na máquina onde for apresentar (sem precisar de internet)
docker load -i livrin-imagens.tar
```

O arquivo fica grande (ordem de 1 GB). Vale a pena só se houver risco de usar outra máquina.

---

## Se a internet cair

### O que continua funcionando

Tudo: login, catálogo, leitura de PDF, EPUB, CBZ e `.docx`, audiodescrição, leitura em voz alta, alto contraste, fontes para dislexia, compra simulada, planos, histórico, biblioteca, área administrativa. O leitor de PDF usa um `worker` empacotado no próprio site, não um CDN — isso foi uma decisão de projeto, não sorte.

### O que para

Só a **janela de Libras**. O VLibras é carregado de `vlibras.gov.br` e não fica guardado na máquina.

Desde a 3.5.4, o botão detecta a falta de rede e **avisa na hora**, em vez de girar dez segundos antes de desistir. A mensagem diz exatamente o que aconteceu: que o tradutor vem de um serviço externo e que o resto do sistema não depende dele.

### O que dizer, se perguntarem

> "A janela de Libras usa o VLibras, que é a suíte oficial do governo federal — a mesma do gov.br. Ela é carregada do serviço deles sob demanda, só quando a pessoa liga o recurso, e por isso depende de internet. Sem rede, o botão avisa na hora que o serviço não está acessível. Foi uma escolha: embutir uma cópia do tradutor no projeto significaria redistribuir e congelar software de terceiro, que envelheceria sem receber correção."

Isso é melhor do que improvisar, e é verdade.

### Leve uma gravação

Grave na véspera, com internet, uns 20 segundos de tela com a janela de Libras funcionando: ligar o botão, selecionar um texto, o avatar sinalizando. Guarde o arquivo na própria máquina.

Se a rede cair e alguém pedir para ver, você mostra a gravação e explica. É a diferença entre "não funciona" e "funciona, e aqui está".

---

## Se outra coisa der errado

Os problemas de instalação e execução estão em [troubleshooting.md](troubleshooting.md), por sintoma. Esta tabela é só para o que pode acontecer **na frente de gente**, com a resposta curta.

| O que acontece | O que fazer, na hora |
| --- | --- |
| O site não abre | `docker compose ps` — se algum serviço não estiver `running`, `docker compose up -d` de novo. Se insistir, `docker compose logs api \| tail -30` |
| "Porta já em uso" | Alguma coisa está ocupando a 5173 ou a 3000. `WEB_PORT=5174 docker compose up -d` e acesse em `localhost:5174` |
| Login recusado como "muitas tentativas" | Desde a 3.5.3, só tentativa **errada** consome a cota, então isso só acontece depois de 30 erros. Confira o Caps Lock e use outra conta de leitor: `lucas@livrin.com` |
| A obra paga abre sem comprar | Você está logado como administração ou como a autoria da obra — é a regra de revisão, e a tela diz isso. Entre como `tatiane@livrin.com` para mostrar o bloqueio |
| O cartão não é aceito | Use um da lista de [README-PAGAMENTO.md](../README-PAGAMENTO.md). Qualquer número inventado é recusado de propósito, pelo algoritmo de Luhn |
| A audiodescrição não fala | É a voz do sistema operacional, não do site. Confira o volume e, no painel do recurso, escolha outra voz |
| O projetor lava as cores | Ligue o tema **Alto contraste** no cabeçalho. Ele existe para acessibilidade e resolve projetor ruim de quebra |
| Esqueceu uma senha | Estão todas no [README](../README.md), seção "Credenciais de desenvolvimento" |
| Travou de um jeito que você não entende | `docker compose restart` e siga a apresentação por outro caminho. **Não** rode `down -v` |

---

## O que levar impresso ou aberto numa aba

Três coisas, porque procurar arquivo na frente da banca custa mais caro do que parece:

1. **[README-PAGAMENTO.md](../README-PAGAMENTO.md)** — números de cartão, contas, o que falha de propósito e as perguntas prováveis com resposta curta.
2. **As credenciais** — a tabela do [README](../README.md).
3. **Esta página.**

---

## Uma última conferência, cinco minutos antes

```bash
docker compose ps        # os três serviços em "running"
```

Abra `http://localhost:5173`, faça login como `tatiane@livrin.com`, abra uma obra. Se isso funcionar, a apresentação está de pé — com ou sem internet.
