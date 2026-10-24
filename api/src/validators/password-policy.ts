import { z } from 'zod';

/**
 * Política de senha ÚNICA do sistema.
 *
 * Este arquivo existe separado de propósito: ele é usado tanto pelos formulários
 * (cadastro, troca de senha, criação de usuário pela administração) quanto pela
 * validação das variáveis de ambiente. Antes, o seed aceitava qualquer senha de
 * administrador com 8 caracteres enquanto os formulários exigiam letras e
 * números — e o `.env.example` distribuía uma senha que o próprio sistema
 * recusaria se fosse digitada na tela.
 *
 * Depende apenas do zod, para poder ser importado por `config/env.ts` sem criar
 * ciclo de importação.
 */
export const passwordSchema = z
  .string({ required_error: 'Senha é obrigatória' })
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .max(72, 'A senha deve ter no máximo 72 caracteres') // limite do bcrypt
  .regex(/[A-Za-z]/, 'A senha deve conter letras')
  .regex(/[0-9]/, 'A senha deve conter números');

/** Resumo legível da política, para mensagens de erro e textos de ajuda. */
export const PASSWORD_RULE_TEXT = 'mínimo de 8 caracteres, com letras e números';

/** Valida uma senha vinda de variável de ambiente. Devolve o erro em texto, ou null. */
export function checkEnvPassword(value: string): string | null {
  const result = passwordSchema.safeParse(value);
  return result.success ? null : (result.error.issues[0]?.message ?? `senha inválida (${PASSWORD_RULE_TEXT})`);
}
