/**
 * Identificação de bandeira e validação de cartão.
 *
 * **Bandeira não é banco.** Nubank, Itaú ou Inter são emissores; Visa,
 * Mastercard e Elo são bandeiras. Um cartão Nubank é um Mastercard ou um
 * Visa, e quem diz isso é o próprio número — por isso aqui não existe um
 * seletor de banco: a bandeira é detectada pela faixa de numeração, como
 * fazem os checkouts de verdade. Pedir que a pessoa escolha algo que o número
 * já informa só cria uma chance a mais de divergência entre o que ela marcou
 * e o que ela digitou.
 *
 * Nada disto é enviado ao servidor nem guardado: serve para a tela conferir o
 * que foi digitado e mostrar a bandeira enquanto se digita. O servidor valida
 * por conta própria, porque validação que só existe no navegador não é
 * validação.
 */

export type Bandeira = 'VISA' | 'MASTERCARD' | 'ELO' | 'AMEX' | 'HIPERCARD' | 'DINERS';

export interface InfoDaBandeira {
  id: Bandeira;
  nome: string;
  /** Quantos dígitos o número tem nesta bandeira. */
  tamanhos: number[];
  /** Dígitos do código de segurança. */
  tamanhoCvv: number;
  /** Onde entram os espaços ao exibir o número. */
  grupos: number[];
}

export const BANDEIRAS: Record<Bandeira, InfoDaBandeira> = {
  VISA: { id: 'VISA', nome: 'Visa', tamanhos: [13, 16, 19], tamanhoCvv: 3, grupos: [4, 4, 4, 4, 3] },
  MASTERCARD: { id: 'MASTERCARD', nome: 'Mastercard', tamanhos: [16], tamanhoCvv: 3, grupos: [4, 4, 4, 4] },
  ELO: { id: 'ELO', nome: 'Elo', tamanhos: [16], tamanhoCvv: 3, grupos: [4, 4, 4, 4] },
  AMEX: { id: 'AMEX', nome: 'American Express', tamanhos: [15], tamanhoCvv: 4, grupos: [4, 6, 5] },
  HIPERCARD: { id: 'HIPERCARD', nome: 'Hipercard', tamanhos: [16], tamanhoCvv: 3, grupos: [4, 4, 4, 4] },
  DINERS: { id: 'DINERS', nome: 'Diners Club', tamanhos: [14], tamanhoCvv: 3, grupos: [4, 6, 4] },
};

/** Só os dígitos: a pessoa digita com espaço, e isso não deve atrapalhar. */
export const apenasDigitos = (valor: string): string => valor.replace(/\D/g, '');

/**
 * A ordem destas regras importa.
 *
 * Elo tem faixas que começam com 4 (4011, 4312…), as mesmas do Visa, e
 * Hipercard tem a faixa 3841, que cai dentro do 38 do Diners. Testar do mais
 * específico para o mais genérico é o que impede um Elo de ser lido como
 * Visa e um Hipercard como Diners.
 */
const REGRAS: { bandeira: Bandeira; teste: RegExp }[] = [
  { bandeira: 'AMEX', teste: /^3[47]/ },
  { bandeira: 'HIPERCARD', teste: /^(606282|3841)/ },
  { bandeira: 'DINERS', teste: /^(30[0-5]|3095|36|38)/ },
  {
    bandeira: 'ELO',
    teste: /^(4011|4312|4389|4514|4576|5041|5066|5067|509\d|6277|6362|6363|650\d|6516|6550)/,
  },
  { bandeira: 'MASTERCARD', teste: /^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720)/ },
  { bandeira: 'VISA', teste: /^4/ },
];

/** A bandeira do número, ou null enquanto não há dígitos suficientes. */
export function detectarBandeira(numero: string): InfoDaBandeira | null {
  const d = apenasDigitos(numero);
  if (!d) return null;
  const regra = REGRAS.find((r) => r.teste.test(d));
  return regra ? BANDEIRAS[regra.bandeira] : null;
}

/**
 * Algoritmo de Luhn.
 *
 * É a conferência que todo cartão real satisfaz, e o que separa "16 dígitos
 * quaisquer" de "um número de cartão plausível". Sem ela, o formulário aceita
 * 1111 1111 1111 1111 e a validação vira enfeite.
 */
export function luhnValido(numero: string): boolean {
  const d = apenasDigitos(numero);
  if (d.length < 12) return false;
  let soma = 0;
  for (let i = 0; i < d.length; i += 1) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
  }
  return soma % 10 === 0;
}

/** Insere os espaços conforme a bandeira, para o número ficar legível. */
export function formatarNumero(valor: string): string {
  const d = apenasDigitos(valor);
  const info = detectarBandeira(d);
  const grupos = info?.grupos ?? [4, 4, 4, 4, 3];
  const partes: string[] = [];
  let i = 0;
  for (const tamanho of grupos) {
    if (i >= d.length) break;
    partes.push(d.slice(i, i + tamanho));
    i += tamanho;
  }
  if (i < d.length) partes.push(d.slice(i));
  return partes.join(' ');
}

/** Validade MM/AA que ainda não passou. */
export function validadeValida(valor: string): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(valor.trim());
  if (!m) return false;
  const mes = Number(m[1]);
  const ano = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return false;
  // Um cartão vale até o ÚLTIMO dia do mês impresso nele.
  const fim = new Date(ano, mes, 1);
  return fim > new Date();
}

export interface ErrosDoCartao {
  number?: string;
  expiry?: string;
  cvv?: string;
}

/** Confere o cartão inteiro. Devolve só o que estiver errado. */
export function validarCartao(numero: string, validade: string, cvv: string): ErrosDoCartao {
  const erros: ErrosDoCartao = {};
  const d = apenasDigitos(numero);
  const info = detectarBandeira(d);

  if (!d) erros.number = 'Informe o número do cartão.';
  else if (!info) erros.number = 'Bandeira não reconhecida. Use um dos cartões de teste listados abaixo.';
  else if (!info.tamanhos.includes(d.length)) {
    erros.number = `Um cartão ${info.nome} tem ${info.tamanhos.join(' ou ')} dígitos.`;
  } else if (!luhnValido(d)) erros.number = 'Número de cartão inválido.';

  if (!validadeValida(validade)) erros.expiry = 'Validade inválida ou vencida (use MM/AA).';

  const cvvEsperado = info?.tamanhoCvv ?? 3;
  if (!new RegExp(`^\\d{${cvvEsperado}}$`).test(cvv.trim())) {
    erros.cvv = `O código de segurança tem ${cvvEsperado} dígitos nesta bandeira.`;
  }
  return erros;
}

/**
 * Cartões de demonstração, um por bandeira.
 *
 * Todos passam no Luhn — foram conferidos antes de entrar aqui. São números
 * públicos de teste, que nenhum banco emitiu para ninguém.
 */
export const CARTOES_DE_TESTE: { bandeira: string; numero: string }[] = [
  { bandeira: 'Visa', numero: '4111 1111 1111 1111' },
  { bandeira: 'Mastercard', numero: '5555 5555 5555 4444' },
  { bandeira: 'Elo', numero: '6362 9700 0045 7013' },
  { bandeira: 'American Express', numero: '3782 822463 10005' },
  { bandeira: 'Hipercard', numero: '6062 8256 2425 4001' },
  { bandeira: 'Diners Club', numero: '3056 930902 5904' },
];
