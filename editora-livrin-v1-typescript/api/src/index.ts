import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { worksRouter } from "./routes/works";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3333;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "livrin-api", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/works", worksRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Rota não encontrada." });
});

app.listen(PORT, () => {
  console.log(`Livrin API rodando em http://localhost:${PORT}`);
});
