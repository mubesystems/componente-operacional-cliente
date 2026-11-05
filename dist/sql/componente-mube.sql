-- Componente da Mube: a cópia só de leitura do estado, no Supabase do software
-- do cliente (requisito 13 do mapa do v1). Escrita pelo webhook, lida pelo
-- componente, sempre através da parte servidor (service role).
--
-- Reaplicável. RLS ligada sem políticas: nem o anon nem o authenticated leem.

create table if not exists public.mube_tickets (
  numero        integer primary key,
  estado        text not null,
  -- O ticket como a plataforma o devolve (GET /api/v1/tickets/{numero}).
  dados         jsonb not null,
  atualizado_em timestamptz not null default now()
);

-- Os eventos de webhook já tratados: a plataforma pode repetir um envio.
create table if not exists public.mube_eventos (
  id          uuid primary key,
  recebido_em timestamptz not null default now()
);

-- A central de notificações do componente (S19).
create table if not exists public.mube_notificacoes (
  id            text primary key,
  tipo          text not null,
  ticket_numero integer,
  titulo        text not null,
  corpo         text,
  criado_em     timestamptz not null default now()
);
create index if not exists mube_notificacoes_criado_idx on public.mube_notificacoes (criado_em desc);

-- Quem foi mencionado num comentário da equipa (ids do software do cliente):
-- para essas pessoas, o aviso aparece como menção.
alter table public.mube_notificacoes add column if not exists mencionados text[];

-- Quem já leu o quê (o id do utilizador é o do software do cliente).
create table if not exists public.mube_notificacoes_lidas (
  notificacao_id text not null references public.mube_notificacoes (id) on delete cascade,
  utilizador_id  text not null,
  lida_em        timestamptz not null default now(),
  primary key (notificacao_id, utilizador_id)
);

-- Quem o gestor liberou para o suporte (S14, S18). A verdade é esta tabela;
-- a plataforma recebe uma cópia sempre que muda.
create table if not exists public.mube_liberados (
  utilizador_id text primary key,
  liberado_em   timestamptz not null default now()
);

-- Se a pessoa vê a Drive (só vale com acesso ao suporte). Por omissão, sim.
alter table public.mube_liberados add column if not exists drive boolean not null default true;

-- Se a pessoa vê e envia as credenciais (domínios, acessos, chaves). Por omissão, não.
alter table public.mube_liberados add column if not exists credenciais boolean not null default false;

-- O tour guiado do componente: quem já o fez (ou o dispensou), para o banner
-- não voltar a aparecer. Só aqui; nunca vai à plataforma.
create table if not exists public.mube_tour (
  utilizador_id text primary key,
  estado        text not null check (estado in ('concluido', 'dispensado')),
  em            timestamptz not null default now()
);

create table if not exists public.mube_estado (
  chave text primary key,
  valor jsonb
);

alter table public.mube_tickets            enable row level security;
alter table public.mube_eventos            enable row level security;
alter table public.mube_notificacoes       enable row level security;
alter table public.mube_notificacoes_lidas enable row level security;
alter table public.mube_estado             enable row level security;
alter table public.mube_liberados          enable row level security;
alter table public.mube_tour               enable row level security;

revoke all on public.mube_tickets, public.mube_eventos, public.mube_notificacoes,
              public.mube_notificacoes_lidas, public.mube_estado, public.mube_liberados, public.mube_tour
  from anon, authenticated;


-- ─── Conversas com a Mube (v0.6.0) ──────────────────────────────────────────
-- Só se usam com `conversas: true` em `criarRotasMube`; sem a opção, ficam
-- vazias. A cópia guarda TODAS as conversas do projeto, também as individuais
-- de outras pessoas com a Mube: quem lê a base de dados diretamente vê-as (o
-- mesmo que hoje com os tickets). O componente só mostra a cada pessoa as
-- conversas em que ela participa.

create table if not exists public.mube_conversas (
  id                 uuid primary key,
  tipo               text not null check (tipo in ('geral', 'taskforce', 'individual')),
  arquivada          boolean not null default false,
  -- A conversa como a plataforma a envia (título, membros da Mube, a última mensagem).
  dados              jsonb not null,
  ultima_mensagem_em timestamptz,
  atualizado_em      timestamptz not null default now()
);

-- Quem do software do cliente participa em cada conversa (ids do software):
-- é daqui que sai o que cada pessoa vê.
create table if not exists public.mube_conversa_participantes (
  conversa_id   uuid not null references public.mube_conversas (id) on delete cascade,
  utilizador_id text not null,
  primary key (conversa_id, utilizador_id)
);
create index if not exists mube_conversa_participantes_utilizador_idx on public.mube_conversa_participantes (utilizador_id);

-- As mensagens, uma linha por mensagem (o mesmo evento duas vezes não duplica).
create table if not exists public.mube_mensagens (
  id            uuid primary key,
  conversa_id   uuid not null references public.mube_conversas (id) on delete cascade,
  autor_tipo    text not null check (autor_tipo in ('mube', 'cliente')),
  autor_id      text not null,
  apagada       boolean not null default false,
  editada       boolean not null default false,
  -- A mensagem como a plataforma a envia, sem os URLs dos anexos (caducam numa hora).
  dados         jsonb not null,
  criada_em     timestamptz not null,
  atualizado_em timestamptz not null default now()
);
create index if not exists mube_mensagens_conversa_idx on public.mube_mensagens (conversa_id, criada_em desc);

-- Até onde cada pessoa leu cada conversa (para os por ler com a plataforma em baixo).
create table if not exists public.mube_conversa_leituras (
  conversa_id   uuid not null references public.mube_conversas (id) on delete cascade,
  utilizador_id text not null,
  lida_ate      timestamptz not null,
  primary key (conversa_id, utilizador_id)
);

alter table public.mube_conversas              enable row level security;
alter table public.mube_conversa_participantes enable row level security;
alter table public.mube_mensagens              enable row level security;
alter table public.mube_conversa_leituras      enable row level security;

revoke all on public.mube_conversas, public.mube_conversa_participantes, public.mube_mensagens, public.mube_conversa_leituras
  from anon, authenticated;
