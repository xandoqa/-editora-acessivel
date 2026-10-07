import { db } from './db';
import { users, books } from './schema';
const [u] = await db.insert(users).values({ name: 'Marina Bastos', email: 'autor@email.com', password: '123456' })
  .onConflictDoNothing().returning();
if (u) await db.insert(books).values([
  { title: 'O Último Mapa', genre: 'Fantasia Épica', pages: 208, synopsis: 'Navegadores cegos desvendam rotas.', status: 'publicado', authorId: u.id },
  { title: 'Além das Estrelas', genre: 'HQ Sci-Fi', pages: 189, synopsis: 'Webcomic com audiodescrição.', status: 'publicado', authorId: u.id },
  { title: 'Raízes', genre: 'Ficção Histórica', pages: 310, synopsis: 'Três gerações no sertão baiano.', status: 'publicado', authorId: u.id }]);
process.exit(0);
