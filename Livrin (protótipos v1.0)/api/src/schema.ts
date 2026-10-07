import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';
export const users = pgTable('users', {
  id: serial('id').primaryKey(), name: text('name').notNull(),
  email: text('email').notNull().unique(), password: text('password').notNull() });
export const books = pgTable('books', {
  id: serial('id').primaryKey(), title: text('title').notNull(), genre: text('genre').notNull(),
  pages: integer('pages').notNull(), synopsis: text('synopsis').notNull(),
  reads: integer('reads').notNull().default(0),
  status: text('status').notNull().default('analise'), // analise | publicado
  authorId: integer('author_id').references(() => users.id) });
