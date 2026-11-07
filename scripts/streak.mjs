// Gera assets do cartão de sequência de contribuições (mesmo visual do github-readme-streak-stats),
// direto da API do GitHub, para atualizar a cada 30 min sem o cache de horas do serviço externo.
//   GITHUB_TOKEN=... node scripts/streak.mjs <usuário> <arquivo.svg>
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const [user = 'Kesh-2k', out = 'dist/streak.svg'] = process.argv.slice(2);
const TZ = 'America/Sao_Paulo';

async function gql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await res.json();
  if (!res.ok || j.errors) throw new Error(JSON.stringify(j.errors || j));
  return j.data;
}

const { user: u } = await gql('query($l:String!){user(login:$l){createdAt}}', { l: user });
const days = new Map();
// A API devolve no máximo 1 ano por consulta: anda de ano em ano desde a criação da conta.
const now = new Date();
for (let from = new Date(u.createdAt); from < now; ) {
  const to = new Date(Math.min(now.getTime(), from.getTime() + 365 * 86400_000));
  const d = await gql(
    'query($l:String!,$f:DateTime!,$t:DateTime!){user(login:$l){contributionsCollection(from:$f,to:$t){contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}',
    { l: user, f: from.toISOString(), t: to.toISOString() },
  );
  for (const w of d.user.contributionsCollection.contributionCalendar.weeks) for (const c of w.contributionDays) days.set(c.date, c.contributionCount);
  from = to;
}

const list = [...days].sort(([a], [b]) => a.localeCompare(b));
const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const firstDate = list.find(([, n]) => n > 0)?.[0] ?? today;
const total = list.reduce((s, [, n]) => s + n, 0);

// Sequências: dias seguidos com contribuição. Hoje sem contribuição ainda não quebra a sequência.
let longest = { len: 0, start: today, end: today };
let run = { len: 0, start: null, end: null };
for (const [date, n] of list) {
  if (date > today) break;
  if (n > 0) {
    run = run.len ? { ...run, len: run.len + 1, end: date } : { len: 1, start: date, end: date };
    if (run.len >= longest.len) longest = { ...run };
  } else if (date !== today) run = { len: 0, start: null, end: null };
}
const current = run.len ? run : { len: 0, start: today, end: today };

const fmt = (iso, year) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' }).format(d);
};
const range = (r) => (r.start === r.end ? fmt(r.start) : `${fmt(r.start)} - ${fmt(r.end)}`);
const n = (x) => x.toLocaleString('pt-BR');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const stamp = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: TZ }).format(new Date());

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="195" viewBox="0 0 495 195" font-family="Segoe UI, Ubuntu, sans-serif">
  <style>@keyframes f{from{opacity:0}to{opacity:1}} .a{animation:f .6s ease-in-out forwards;opacity:0}</style>
  <rect width="495" height="195" rx="4.5" fill="#0a0d12"/>
  <line x1="165" y1="28" x2="165" y2="170" stroke="#e4e2e2" stroke-width="1" vector-effect="non-scaling-stroke"/>
  <line x1="330" y1="28" x2="330" y2="170" stroke="#e4e2e2" stroke-width="1" vector-effect="non-scaling-stroke"/>
  <g text-anchor="middle">
    <text class="a" x="82.5" y="79" fill="#fefefe" font-size="28" font-weight="700" style="animation-delay:.6s">${n(total)}</text>
    <text class="a" x="82.5" y="115" fill="#fefefe" font-size="14" style="animation-delay:.7s">Total de Contribuições</text>
    <text class="a" x="82.5" y="142" fill="#9e9e9e" font-size="12" style="animation-delay:.8s">${esc(fmt(firstDate, true))}</text>
    <text class="a" x="82.5" y="158" fill="#9e9e9e" font-size="12" style="animation-delay:.8s">- Presente</text>

    <circle cx="247.5" cy="71" r="40" fill="none" stroke="#34d399" stroke-width="5"/>
    <g transform="translate(247.5 19.5)"><rect x="-12" y="-2" width="24" height="26" fill="#0a0d12"/>
      <path transform="translate(-8 0) scale(.66)" fill="#22d3ee" d="M11.8 1.2C11 4.5 8.8 6.4 6.9 8.7 4.9 11 3.5 13.5 3.5 16.4c0 4.5 3.7 8.1 8.5 8.1s8.5-3.6 8.5-8.1c0-3.4-1.6-6-3.6-8.3-.3 2.1-1.3 3.6-2.8 4.5.4-4.1-.7-8.5-2.3-11.4zM12 21.5c-2 0-3.5-1.4-3.5-3.2 0-1.4.8-2.5 2.2-3.8.2 1.1.8 1.8 1.6 2.2.1-1 .4-1.9 1-2.7 1.4 1.4 2.2 2.8 2.2 4.3 0 1.8-1.5 3.2-3.5 3.2z"/></g>
    <text class="a" x="247.5" y="80" fill="#fefefe" font-size="28" font-weight="700" style="animation-delay:.6s">${n(current.len)}</text>
    <text class="a" x="247.5" y="140" fill="#34d399" font-size="14" font-weight="700" style="animation-delay:.9s">Sequência Atual</text>
    <text class="a" x="247.5" y="162" fill="#9e9e9e" font-size="12" style="animation-delay:.9s">${esc(range(current))}</text>

    <text class="a" x="412.5" y="79" fill="#fefefe" font-size="28" font-weight="700" style="animation-delay:1.2s">${n(longest.len)}</text>
    <text class="a" x="412.5" y="115" fill="#fefefe" font-size="14" style="animation-delay:1.3s">Maior Sequência</text>
    <text class="a" x="412.5" y="142" fill="#9e9e9e" font-size="12" style="animation-delay:1.4s">${esc(range(longest))}</text>
  </g>
  <text x="487" y="188" text-anchor="end" fill="#4b5563" font-size="8">atualizado ${esc(stamp)}</text>
</svg>
`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, svg);
console.log(`total ${total}, atual ${current.len} (${range(current)}), maior ${longest.len} (${range(longest)})`);
