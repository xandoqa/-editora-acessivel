# ADR 019 — Internacionalização sem biblioteca, com as chaves tipadas

**Data:** 31/10/2026 · **Versão:** 3.5.5 · **Estado:** aceita

## Contexto

A especificação de 31/10 pede três idiomas — português do Brasil (padrão), inglês e francês — com troca por seletor, escolha preservada durante a navegação, tradução **funcional** e organização que permita acrescentar idiomas depois. E diz, com todas as letras: nada de "traduções automáticas improvisadas diretamente no código".

O caminho óbvio seria `react-i18next`. Duas coisas pesaram contra.

**A primeira é circunstancial:** o registro npm está inacessível do ambiente onde este trabalho foi feito. Dependência nova não instala, não entra no `package-lock.json` e não passa no `npm ci` da integração contínua. Isso sozinho decidiria, mas seria uma decisão por limitação, e limitação muda.

**A segunda não muda:** com biblioteca, `t('chave.que.nao.existe')` é uma string qualquer. O erro aparece como a própria chave escrita na tela, em produção, para o usuário. E tradução esquecida ao acrescentar uma frase só aparece quando alguém troca de idioma e vê português no meio do inglês.

## Decisão

Um módulo próprio em `web/src/i18n/`, com as chaves **tipadas a partir do português**.

```ts
// tipos.ts
export type ChaveDeTraducao = keyof typeof ptBR;
export type Dicionario = Record<ChaveDeTraducao, string>;

// en.ts
export const en: Dicionario = { /* … */ };
```

Consequência prática, e é a razão de tudo:

- `t('chave.inventada')` **não compila**;
- acrescentar uma chave ao português sem traduzir nos outros dois **não compila**;
- apagar uma chave de um idioma **não compila**.

Tradução faltando deixa de ser defeito em produção e passa a ser erro de build. O CI do projeto já roda `npm run build` no front-end, então nenhum PR com idioma incompleto entra no `main`.

### O que o módulo tem

| Arquivo | Papel |
| --- | --- |
| `pt-BR.ts` | A referência. Toda chave nasce aqui |
| `en.ts`, `fr.ts` | Tipados como `Dicionario` |
| `tipos.ts` | Os tipos, a lista de idiomas e o idioma padrão |
| `I18nContext.tsx` | Provider, `useT()`, persistência, `lang` do documento |

Interpolação é `{nome}` trocado em tempo de execução. Não há pluralização por regra de idioma: onde o plural importa, a frase é escrita de forma que funcione nos três — e quando isso não bastar, a ADR muda junto com a necessidade, em vez de antecipá-la.

### Decisões menores que importam

**O `lang` do documento acompanha o idioma.** Não é detalhe: é o que faz o leitor de tela trocar de voz. Interface em francês com `lang="pt-BR"` é lida com fonética portuguesa, palavra por palavra. Cada item do seletor também carrega o próprio `lang`, pela mesma razão.

**Os nomes dos idiomas nunca são traduzidos.** A lista mostra "Français", não "Francês". Quem caiu numa interface que não entende precisa reconhecer a própria língua — e "Francês" não ajuda quem só lê francês.

**Português é o destino de qualquer dúvida.** Sem escolha salva, o idioma do navegador decide, e qualquer coisa fora dos três cai em pt-BR — nunca no inglês por ser "neutro".

**Listas declaradas no nível do módulo guardam chave, não texto.** Um `const PERFIS = [...]` fora do componente roda uma vez, antes de qualquer idioma ser escolhido: guardar texto ali congelaria o português no primeiro carregamento. Eles guardam `ChaveDeTraducao` e a tradução acontece na renderização.

## O que NÃO é traduzido, de propósito

Conteúdo escrito por gente: título de obra, sinopse, avaliação, nome de autoria, nota da curadoria, nome de gênero cadastrado. Aparecem como foram escritos, em qualquer idioma — e a interface **diz isso** no seletor, para a expectativa ser honesta.

Traduzir obra por máquina seria deturpar o trabalho de quem publicou. Este projeto existe para publicar esse trabalho, não para reescrevê-lo.

## Alternativas consideradas

| Alternativa | Por que não |
| --- | --- |
| `react-i18next` | Não instala neste ambiente; e chave errada vira texto cru na tela em vez de erro de build. Se um dia o projeto precisar de ICU MessageFormat ou catálogo remoto, trocar não toca em componente nenhum: só o `I18nContext` muda |
| Tradução automática em tempo de execução | É exatamente o que a especificação proíbe, e com razão: produz texto que ninguém revisou |
| Arquivos JSON em vez de módulos TypeScript | Perde a tipagem, que é o motivo de tudo isto existir |
| Traduzir só o que o usuário final vê, deixando a administração em português | Tentador pelo tamanho, mas cria a interface meio traduzida que a especificação quer evitar. A cobertura é parcial **por ora**, e medida — não por desenho |

## Consequências

- Acrescentar um quarto idioma é criar um arquivo, declará-lo como `Dicionario` e registrá-lo em dois lugares. O compilador lista o que falta.
- Acrescentar uma frase à interface exige traduzi-la nos três idiomas no mesmo commit. É atrito deliberado.
- **A cobertura ainda é parcial.** `ferramentas/conferir-traducao.py` mede e lista o que falta, por arquivo. O número está no README e no relatório final, e não em uma frase vaga.
