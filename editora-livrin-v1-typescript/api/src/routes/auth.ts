import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { z } from "zod";
import { findUserByEmail, findUserById, toPublicUser, users } from "../data/store";
import { requireAuth, signToken } from "../middleware/auth";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2, "Nome muito curto."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres."),
  role: z.enum(["autor", "leitor"]).default("leitor"),
});

const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

// POST /api/auth/register — "Cadastre-se como autor ou leitor"
authRouter.post("/register", (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." });
  }
  const { name, email, password, role } = parsed.data;

  if (findUserByEmail(email)) {
    return res.status(409).json({ error: "Já existe uma conta com este e-mail." });
  }

  const user = {
    id: randomUUID(),
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 8),
    role,
    createdAt: new Date().toISOString(),
  };
  users.push(user);

  const token = signToken({ sub: user.id, role: user.role });
  res.status(201).json({ token, user: toPublicUser(user) });
});

// POST /api/auth/login — tela "Entrar na Plataforma"
authRouter.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." });
  }
  const { email, password } = parsed.data;

  const user = findUserByEmail(email);
  const valid = user ? bcrypt.compareSync(password, user.passwordHash) : false;

  if (!user || !valid) {
    // Mesma mensagem do protótipo: "E-mail ou senha incorretos."
    return res.status(401).json({
      error: "E-mail ou senha incorretos. Verifique seus dados cadastrais ou recupere o acesso.",
    });
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.json({ token, user: toPublicUser(user) });
});

// GET /api/auth/me — usuário autenticado atual
authRouter.get("/me", requireAuth, (req, res) => {
  const user = findUserById(req.auth!.sub);
  if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
  res.json({ user: toPublicUser(user) });
});
