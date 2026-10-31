import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Limita tentativas de login/cadastro por IP (proteção básica contra força bruta).
 *
 * `skipSuccessfulRequests` é o que torna este limite defensável: **só tentativa
 * que falha consome a cota.** Força bruta é feita de erros, então contar os
 * acertos protege contra nada e pune o uso legítimo.
 *
 * A diferença aparece quando várias pessoas compartilham um IP — uma sala de
 * aula atrás do mesmo Wi-Fi, por exemplo. Antes, o grupo e quem estivesse
 * avaliando somavam no mesmo balde e esgotavam a cota entrando normalmente, com
 * a senha certa. Agora só erro conta, e trinta erros em quinze minutos continua
 * sendo um teto estreito para quem está adivinhando senha.
 *
 * Este limitador vale só para login e cadastro. As rotas que abrem cobrança
 * usam o `cobrancaLimiter`, abaixo, onde o sucesso **precisa** contar.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 30,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' } },
});

/**
 * Rotas que abrem cobrança: apoio, compra de obra e assinatura do plano.
 *
 * É o caminho que cria registro financeiro, e aqui o oposto do limitador acima
 * é verdade: **o sucesso é justamente o que precisa ser contado**, porque o
 * abuso tem a forma de muitas cobranças abertas, não de muitas recusadas.
 *
 * Era o `authLimiter` que freava estas rotas. Separar os dois foi necessário
 * quando o login passou a ignorar tentativas bem-sucedidas: a mesma
 * configuração não pode servir a um caminho onde o erro é o problema e a outro
 * onde o problema é o acerto repetido.
 */
export const cobrancaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas cobranças abertas em pouco tempo. Aguarde alguns minutos.' } },
});

/**
 * Abertura de sessões de leitura. A rota aceita visitantes anônimos, então sem
 * um limite próprio daria para criar milhares de sessões e inflar as métricas
 * dos painéis. 60 por minuto cobre com folga qualquer leitura real.
 */
export const sessionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.isTest ? 10_000 : 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas sessões de leitura abertas. Aguarde um instante.' } },
});

/** Limite geral da API, generoso, apenas para conter abusos. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.isTest ? 10_000 : 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas requisições. Tente novamente em instantes.' } },
});
