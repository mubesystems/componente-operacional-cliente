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

revoke all on public.mube_tickets, public.mube_eventos, public.mube_notificacoes,
              public.mube_notificacoes_lidas, public.mube_estado, public.mube_liberados
  from anon, authenticated;
