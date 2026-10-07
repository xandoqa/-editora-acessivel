import { useEffect, useState, FormEvent } from 'react';
import { api, Book } from './api';

type Screen = 'login' | 'main' | 'publish' | 'analysis' | 'dash' | 'read';
type User = { id: number; name: string };
const form = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); return Object.fromEntries(new FormData(e.currentTarget)); };
const GENRES = ['Ficção Científica', 'Fantasia Épica', 'Drama', 'Ficção Histórica', 'Poesia'];

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [user, setUser] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('');
  const [sel, setSel] = useState<Book | null>(null);
  const [reg, setReg] = useState(false);
  const [hc, setHc] = useState(false);
  const [fs, setFs] = useState(16);

  const load = () => api<Book[]>('/books').then(setBooks);
  useEffect(() => { if (user) load(); }, [user, screen]);
  useEffect(() => { document.body.classList.toggle('hc', hc); }, [hc]);
  const run = async (fn: () => Promise<void>) => { try { setErr(''); await fn(); } catch (x) { setErr((x as Error).message); } };
  const contrast = <button className="ghost" onClick={() => setHc(!hc)}>◐ Alto Contraste</button>;

  if (!user) return (
    <main className="card">
      <h1>Editora Livrin</h1>
      <p>Publique sua história independente com acessibilidade universal</p>
      {err && <div className="err" role="alert"><b>Falha</b><br />{err}</div>}
      <form onSubmit={e => run(async () => { setUser(await api<User>(reg ? '/register' : '/login', form(e))); setScreen('main'); })}>
        {reg && <label>Nome<input name="name" required /></label>}
        <label>E-mail<input name="email" type="email" required /></label>
        <label>Senha<input name="password" type="password" required /></label>
        <button>{reg ? 'Cadastrar' : 'Entrar na Plataforma →'}</button>
      </form>
      <p><a href="#" onClick={e => { e.preventDefault(); setReg(!reg); setErr(''); }}>{reg ? 'Já tenho conta' : 'Cadastre-se como autor ou leitor'}</a></p>
      {contrast}
    </main>
  );

  const nav = (s: Screen, t: string) => <button className={screen === s ? 'on' : ''} onClick={() => setScreen(s)}>{t}</button>;
  const pending = books.filter(b => b.status === 'analise');
  const published = books.filter(b => b.status === 'publicado');
  const mine = books.filter(b => b.authorId === user.id);
  const shown = published.filter(b => (!genre || b.genre === genre) && b.title.toLowerCase().includes(q.toLowerCase()));
  const open = (b: Book) => run(async () => { setSel(await api<Book>(`/books/${b.id}/read`, {})); setScreen('read'); });
  const speak = (t: string) => { const u = new SpeechSynthesisUtterance(t); u.lang = 'pt-BR'; speechSynthesis.cancel(); speechSynthesis.speak(u); };

  return (
    <div className="app">
      <aside>
        <h2>Livrin</h2>
        {nav('main', 'Início / Catálogo')}
        {nav('publish', 'Publicar Obra')}
        {nav('analysis', `Em Análise (${pending.length})`)}
        {nav('dash', 'Meu Painel')}
        {contrast}
        <button onClick={() => { setUser(null); setScreen('login'); }}>Sair ({user.name})</button>
      </aside>
      <section>
        {err && <div className="err" role="alert">{err}</div>}

        {screen === 'main' && <>
          <h1>Leituras em destaque</h1>
          <input placeholder="Buscar obras..." value={q} onChange={e => setQ(e.target.value)} />
          <div className="chips">
            <button className={!genre ? 'on' : ''} onClick={() => setGenre('')}>Todos</button>
            {[...new Set(published.map(b => b.genre))].map(g =>
              <button key={g} className={genre === g ? 'on' : ''} onClick={() => setGenre(g)}>{g}</button>)}
          </div>
          <p>Exibindo {shown.length} de {published.length} obras</p>
          <div className="grid">{shown.map(b =>
            <article key={b.id}><small>{b.genre} · {b.pages}p · {b.reads} leituras</small><h3>{b.title}</h3>
              <p>{b.synopsis}</p><button onClick={() => open(b)}>Ler agora</button></article>)}</div>
        </>}

        {screen === 'read' && sel && <>
          <button className="ghost" onClick={() => setScreen('main')}>← Voltar</button>
          <h1>{sel.title}</h1>
          <small>{sel.genre} · {sel.pages}p · {sel.reads} leituras</small>
          <div className="chips">
            <button onClick={() => setFs(fs - 2)}>A-</button><button onClick={() => setFs(fs + 2)}>A+</button>
            <button onClick={() => speak(`${sel.title}. ${sel.synopsis}`)}>🔊 Ouvir</button>
          </div>
          <p style={{ fontSize: fs, lineHeight: 1.7, maxWidth: 640 }}>{sel.synopsis}</p>
        </>}

        {screen === 'publish' && <>
          <h1>Publicar meu livro ou quadrinho</h1>
          <form onSubmit={e => run(async () => { await api('/books', { ...form(e), authorId: user.id }); setScreen('analysis'); })}>
            <label>Título<input name="title" required maxLength={120} /></label>
            <label>Gênero<select name="genre" required>{GENRES.map(g => <option key={g}>{g}</option>)}</select></label>
            <label>Nº de páginas<input name="pages" type="number" defaultValue={240} required /></label>
            <label>Sinopse<textarea name="synopsis" required minLength={20} /></label>
            <button>Enviar para análise</button>
          </form>
        </>}

        {screen === 'analysis' && <>
          <h1>Seu livro em processo editorial</h1>
          {pending.length === 0 && <p>Nada em análise.</p>}
          {pending.map(b => <article key={b.id}><h3>{b.title}</h3>
            <p>✔ Etapa 1: Recebimento · ⏳ Etapa 2: Testes de acessibilidade · ○ Etapa 3: Aprovação final</p>
            <button onClick={() => run(async () => { await api(`/books/${b.id}/approve`, {}); setScreen('main'); })}>Simular aprovação</button></article>)}
        </>}

        {screen === 'dash' && <>
          <h1>Olá, {user.name}</h1>
          <div className="grid">
            <article><small>Obras</small><h2>{mine.length}</h2></article>
            <article><small>Publicadas</small><h2>{mine.filter(b => b.status === 'publicado').length}</h2></article>
            <article><small>Leituras totais</small><h2>{mine.reduce((s, b) => s + b.reads, 0)}</h2></article>
          </div>
          <h3>Acervo & Produções</h3>
          {mine.map(b => <article key={b.id}><b>{b.title}</b> <span className="badge">{b.status === 'publicado' ? 'Publicado' : 'Em análise'}</span>
            <p>{b.genre} · {b.pages}p · {b.reads} leituras</p>
            <button onClick={() => run(async () => { await api(`/books/${b.id}`, undefined, 'DELETE'); await load(); })}>Excluir</button></article>)}
        </>}
      </section>
    </div>
  );
}
