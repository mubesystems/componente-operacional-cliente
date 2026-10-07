# Ligar um projeto ao Operacional da Mube

> Guia para qualquer projeto da Mube (Next.js com App Router e Supabase) que vá ter o **suporte da Mube** dentro do software: reportar problemas, acompanhar os tickets, conversar com a equipa, aceitar ou recusar correções, a Drive do projeto, as credenciais que a Mube pedir e as notificações.
>
> Pacote: `@mubesystems/componente-operacional`, publicado em [github.com/mubesystems/componente-operacional-cliente](https://github.com/mubesystems/componente-operacional-cliente) (uma tag por versão). Instala-se sem tokens.

---

## 1. Como funciona

```
Navegador ──────────► Servidor do software do projeto ──────────► Operacional da Mube
<PaginaMube />          app/api/mube/[...caminho]                   operacional.mubesystems.com
(botão "Suporte")       guarda a chave, sabe quem está                o ticket vive aqui
                        com sessão, envia os ficheiros                (estado, triagem, equipa)
                                │      ▲
                                │      └──── webhook assinado ◄──── a cada mudança
                                ▼
                        Supabase do projeto: tabelas mube_*
                        (cópia só de leitura dos tickets, avisos, acessos)
```

Regras que explicam tudo o resto:

- **O ticket vive no Operacional.** O projeto guarda só uma **cópia de leitura**, para mostrar os tickets mesmo quando a plataforma está em baixo.
- **Quem muda o estado é sempre a plataforma.** Aceitar ou recusar uma correção é um **pedido**; o estado só muda quando a plataforma confirma e avisa por webhook.
- **A chave do projeto nunca vai ao navegador.** O componente fala só com o servidor do próprio projeto; é esse servidor que fala com a plataforma.
- **Só usa o suporte quem o gestor liberou**, no separador **Acessos** do componente. Entre os liberados, o gestor escolhe também quem vê a **Drive** e quem envia as **Credenciais**.
- **O cliente nunca vê o que é interno** da Mube: comentários internos, ficheiros ocultos na Drive, o responsável.

---

## 2. Antes de começar

| Precisa de | Onde |
|---|---|
| Next.js com **App Router** e **React 19** | o projeto |
| Supabase do projeto, com a **service role key** no servidor | o projeto |
| O **cliente** e o **projeto** criados no Operacional | Operacional → Clientes / Projetos |
| O **ID do cliente**, o **ID do projeto** e uma **chave de API** (`mk_live_…`) | Operacional → projeto → Configurações → Chaves de API |

A chave mostra-se **uma vez** ao ser criada. Guarda-a já nas variáveis do projeto.

---

## 3. Instalação, passo a passo

### 3.1 O pacote

```bash
pnpm add github:mubesystems/componente-operacional-cliente#v0.2.1
```

Usa sempre a **última tag** do repositório ([lista de versões](https://github.com/mubesystems/componente-operacional-cliente/tags)). Não é preciso `.npmrc` nem token.

### 3.2 Variáveis de ambiente (só no servidor)

```env
MUBE_URL=https://operacional.mubesystems.com
MUBE_CLIENTE_ID=…        # uuid do cliente no Operacional
MUBE_PROJETO_ID=…        # uuid do projeto no Operacional
MUBE_CHAVE=mk_live_…     # chave de API do projeto

# Já costumam existir no projeto:
NEXT_PUBLIC_SUPABASE_URL=…
SUPABASE_SERVICE_ROLE_KEY=…
```

Nunca com o prefixo `NEXT_PUBLIC_`: a chave não pode ir ao navegador. Em produção (Coolify, Vercel), as mesmas variáveis no runtime.

### 3.3 As tabelas (Supabase do projeto)

Correr no **SQL Editor** do Supabase do projeto o ficheiro do pacote:

```
node_modules/@mubesystems/componente-operacional/dist/sql/componente-mube.sql
```

É **reaplicável** (só `create … if not exists` e `add column if not exists`): corre-se de novo a cada atualização do pacote, sem mexer nos dados. A estrutura está na §5.

### 3.4 A rota do servidor

Criar `app/api/mube/[...caminho]/route.ts`:

```ts
import { createClient } from "@supabase/supabase-js"
import { armazemSupabase, criarRotasMube } from "@mubesystems/componente-operacional/servidor"
import { quemEstaComSessao, listarUtilizadores } from "@/lib/auth" // as funções do próprio projeto

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export const { GET, POST, PUT, PATCH, DELETE } = criarRotasMube({
  // Onde fica a cópia: as tabelas mube_* do Supabase do projeto.
  armazem: armazemSupabase(supabase),

  // Quem está com sessão no software (null sem sessão).
  // gestor: quem gere o software e escolhe, em Acessos, quem usa o suporte.
  utilizador: async (request) => {
    const u = await quemEstaComSessao(request)
    if (!u) return null
    return { id: u.id, nome: u.nome, email: u.email, fotoUrl: u.avatar, gestor: u.eAdmin }
  },

  // A equipa do software: de onde o gestor escolhe quem tem acesso.
  equipa: async () => (await listarUtilizadores()).map((u) => ({ id: u.id, nome: u.nome, email: u.email, fotoUrl: u.avatar })),
})
```

| Campo de `utilizador()` | Obrigatório | Para quê |
|---|---|---|
| `id` | sim | o id do utilizador **no software do projeto** (é o que vai para a plataforma) |
| `nome`, `email`, `fotoUrl` | não | aparecem para a Mube e nos cartões |
| `gestor` | não | vê o separador **Acessos** |
| `liberado`, `drive`, `credenciais` | não | se o projeto já decide quem tem acesso por outra regra, sobrepõem-se a Acessos (ver §7) |

### 3.5 O componente: uma página, um item no menu e o aviso

O suporte é **uma página** do software, com o atalho **no menu** como os outros itens. Um aviso flutuante só aparece quando há **novidades** (uma resposta da equipa, uma mudança de estado, um pedido de aceite ou de credencial) e leva às Notificações.

**1. A página** (ex.: `app/(painel)/suporte/page.tsx`):

```tsx
import { PaginaMube } from "@mubesystems/componente-operacional"

export default function Suporte() {
  return <PaginaMube className="h-[calc(100dvh-8rem)]" />
}
```

**2. O item do menu**, no componente do menu do projeto (é um componente cliente):

```tsx
"use client"
import { useNovidadesMube } from "@mubesystems/componente-operacional"

const { acesso, porLer } = useNovidadesMube()
// Só aparece a quem tem acesso ao suporte (ou gere os acessos); `porLer` dá o número ao lado.
{acesso && <ItemDoMenu href="/suporte" rotulo="Suporte" contagem={porLer} />}
```

**3. O aviso e o CSS**, no layout da área com sessão:

```tsx
import { AvisoMube } from "@mubesystems/componente-operacional"
import "@mubesystems/componente-operacional/estilos.css"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AvisoMube href="/suporte" />
    </>
  )
}
```

| Peça | Opções | Para quê |
|---|---|---|
| `PaginaMube` | `base`, `rotulo`, `tema`, `moldura`, `className` | a página inteira: Tickets, Drive, Credenciais, Notificações, Acessos. Ocupa a altura do contentor (no mínimo 640 px); `className` para a dar; `moldura={false}` tira a borda e os cantos, para ocupar a área toda. Aceita `?secao=notificacoes` (ou `tickets`, `drive`, `credenciais`, `acessos`) e `?ticket=12` no endereço |
| `useNovidadesMube` | `base` | `{ acesso, porLer, ultimo, aCarregar }` para o item do menu |
| `AvisoMube` | `base`, `href`, `rotulo`, `tema`, `posicao` | o aviso no canto, só com novidades; não aparece na própria página |

`base` é o caminho da rota da §3.4 (por omissão `"/api/mube"`); `tema` é `"auto"` (segue a classe `dark` do `<html>`), `"claro"` ou `"escuro"`.

Na primeira visita, a página mostra no canto inferior direito o convite ao **tour guiado**: uma volta por cada secção, com exemplos, sem tocar em dados reais. Concluído ou dispensado, fica em `mube_tour` e o convite não volta; "Rever o tour" fica no fundo do menu. O pacote instala com ele o Remotion (a animação do convite).

O `<ComponenteMube />` da versão 0.1 (o botão "Suporte" que abria uma janela por cima de tudo) continua a funcionar, mas a forma recomendada é esta.

O CSS é isolado (prefixo `mube:` e variáveis presas a `.mube-c`): não muda nada no projeto e o CSS do projeto não o muda. A letra é a Plus Jakarta Sans se o projeto a carregar; outra, com `--mube-fonte`.

### 3.6 Deixar o webhook passar

O webhook chega **sem sessão** (vem da plataforma). Se o projeto tem `middleware.ts` / `proxy.ts` que obriga a login, **exclui** o caminho:

```ts
// no matcher do middleware, ou no início da função:
if (request.nextUrl.pathname.startsWith("/api/mube/webhook")) return NextResponse.next()
```

Sem isto, o login redireciona o webhook e a cópia nunca se atualiza. As outras rotas `/api/mube/*` precisam da sessão normal do projeto.

Se o projeto tiver **CSP**, permitir em `img-src`, `media-src` e `frame-src` o domínio do armazenamento da Mube (`*.r2.cloudflarestorage.com`): as imagens, os áudios e os PDFs abrem por URL assinada.

### 3.7 No Operacional

1. Projeto → Configurações → **URL do webhook**: `https://<domínio do projeto>/api/mube/webhook`.
2. Abrir o software como **gestor**, menu → **Suporte** → **Acessos**: escolher quem tem acesso ao suporte e, desses, quem vê a Drive e quem envia as credenciais. Guardar.

---

## 4. O que cada um faz

| Quem | O quê |
|---|---|
| **Pessoas liberadas** | reportam um problema (texto, áudio gravado, ficheiros, impacto), acompanham os tickets em kanban, conversam com a equipa, aceitam ou recusam a correção, usam a Drive (se tiverem acesso a ela), enviam as credenciais pedidas (idem) e recebem os avisos |
| **Gestor** | tudo isso, mais o separador Acessos |
| **Mube (Operacional)** | triagem, prioridade, prazo, estados, comentários (internos ou para o cliente), menções a pessoas do cliente, Drive com controlo do que o cliente vê, pedidos de credenciais |

Fluxo de uma correção, como o cliente o vê:

```
Relato → Triagem → Contenção → Correção → Em validação → Aguardando aceite → Concluída
                                                                           → Encerrado
```

- Em **Aguardando aceite**, o cliente aceita ou recusa. **Recusar** pede o motivo (e pode levar ficheiros) e devolve o ticket a Relato.
- **Aceite tácito:** a plataforma avisa uma vez por dia; ao fim de **3 avisos entregues sem resposta**, o ticket fecha como aceite. Avisos que não chegam (webhook em baixo) não contam.

---

## 5. A base de dados do projeto

Criada pelo SQL da §3.3. Todas as tabelas têm **RLS ligada e sem políticas**: nem o `anon` nem o `authenticated` leem; só a service role, através da rota do servidor.

| Tabela | Uma linha é | Colunas |
|---|---|---|
| `mube_tickets` | um ticket, como a plataforma o devolve | `numero` (PK, o número do ticket: COR-012 → 12), `estado`, `dados` (jsonb com o ticket inteiro), `atualizado_em` |
| `mube_eventos` | um evento de webhook já tratado (a plataforma pode repetir) | `id` (PK, o id do evento), `recebido_em` |
| `mube_notificacoes` | um aviso da central do componente | `id` (PK), `tipo`, `ticket_numero`, `titulo`, `corpo`, `criado_em`, `mencionados` (text[]: para estas pessoas o aviso é uma menção) |
| `mube_notificacoes_lidas` | quem já leu que aviso | `notificacao_id` → `mube_notificacoes`, `utilizador_id`, `lida_em` |
| `mube_liberados` | quem o gestor liberou para o suporte | `utilizador_id` (PK, o id do software), `liberado_em`, `drive` (vê a Drive; por omissão `true`), `credenciais` (envia as credenciais; por omissão `false`) |
| `mube_tour` | quem já fez (ou dispensou) o tour guiado | `utilizador_id` (PK), `estado` (`concluido` ou `dispensado`), `em`. Só daqui: o tour nunca vai à plataforma |
| `mube_estado` | um valor de controlo (ex.: já se fez a primeira sincronização) | `chave` (PK), `valor` (jsonb) |

### O que vem em `mube_tickets.dados`

| Campo | O que é |
|---|---|
| `id`, `numero`, `codigo` | identificadores (`codigo` = `COR-012`) |
| `titulo`, `estado`, `estado_rotulo` | o título e o estado, com o rótulo pronto |
| `prioridade` | `{ valor, rotulo }` (urgente, alta, média, baixa), definida pela Mube |
| `prazo` | data, quando a Mube o define |
| `reaberturas` | quantas vezes foi recusado |
| `relatado_por` | `{ id, nome, foto_url }` (o id é o do software do projeto) |
| `contagens` | `{ comentarios, anexos }` que o cliente vê |
| `relatos` | o relato original: `texto`, `impacto` (`impede`, `contorno`, `incomoda`, `cosmetico`), `anexos` |
| `comentarios` | só os **externos**: `autor`, `corpo`, `anexos`, `mencoes`, `editado`, `apagado` |
| `linha_do_tempo` | `[{ estado, em }]` |
| `descarte` | `{ rotulo, motivo }` neutro, quando encerrado |
| `aceite`, `aceite_tacito` | como foi aceite e, em Aguardando aceite, o contador dos avisos |
| `criado_em`, `atualizado_em` | datas |

Os URLs dos anexos **não** ficam guardados (caducam numa hora): o componente pede-os à plataforma quando abre o ticket.

### E a Drive?

**Não tem tabelas no projeto.** Os ficheiros e as pastas vivem só na plataforma da Mube; o componente lê a Drive ao vivo (`GET /api/v1/drive`) e cada ficheiro por um URL temporário, e as alterações do cliente (criar pasta, enviar, mover, mudar o nome, eliminar) vão diretamente para a plataforma. Da Drive, o projeto só guarda **quem a pode ver** (`mube_liberados.drive`).

### E as credenciais?

**Também não têm tabelas no projeto, nem passam por elas.** A Mube pede um acesso (um domínio, a Cloudflare, uma chave de API…) e quem tem as Credenciais em Acessos preenche-o no componente; também se pode enviar por iniciativa própria. O valor segue direto para a plataforma, onde fica **cifrado**; quem o enviou (e quem tem as Credenciais) pode vê-lo a pedido, editá-lo ou retirá-lo, e cada leitura fica registada para a Mube. Nunca passa pelo Supabase do projeto. Do lado do projeto fica apenas **quem as pode enviar** (`mube_liberados.credenciais`) e o aviso do pedido na central (`mube_notificacoes`, tipo `credencial`).

### Ler a cópia no próprio ERP (opcional)

Para relatórios ou "os meus tickets" fora do componente, uma vista tipada evita mexer no JSON:

```sql
create or replace view public.mube_tickets_v as
select numero,
       dados->>'codigo' as codigo, dados->>'titulo' as titulo,
       estado, dados->>'estado_rotulo' as estado_rotulo,
       dados->'prioridade'->>'valor' as prioridade, (dados->>'prazo')::date as prazo,
       dados->'relatado_por'->>'id' as relatado_por,
       (dados->'contagens'->>'comentarios')::int as comentarios,
       (dados->'contagens'->>'anexos')::int as anexos,
       (dados->>'criado_em')::timestamptz as criado_em, atualizado_em
from public.mube_tickets;
```

A cópia é **só de leitura**: nunca escrever nas `mube_*` a partir do projeto (o webhook reescreve-as).

---

## 6. O webhook

A plataforma faz `POST https://<domínio do projeto>/api/mube/webhook` a cada mudança. A rota do pacote já trata tudo; isto é a referência.

**Cabeçalhos**

```
Content-Type: application/json
X-Mube-Evento: <uuid do evento>       # o pacote ignora repetidos (mube_eventos)
X-Mube-Sequencia: <n>                 # ordem dentro do projeto
X-Mube-Tentativa: <1…3>
X-Mube-Assinatura: sha256=<HMAC-SHA256 do corpo em bruto, com a chave do projeto>
```

**Corpo**

```json
{ "id": "…", "sequencia": 42, "tipo": "estado", "projeto_id": "…", "ocorrido_em": "2026-10-06T14:23:53Z", "dados": { } }
```

| `tipo` | `dados` | O que o pacote faz |
|---|---|---|
| `estado` | `ticket`, `estado`, `estado_rotulo`, `estado_anterior` e, no encerramento, `descarte` | atualiza o ticket na cópia e cria o aviso |
| `comentario_externo` | `ticket`, `comentario: { id, corpo, autor, criado_em, anexos, mencoes }` | atualiza o ticket e cria o aviso (como **menção** para os mencionados) |
| `pedido_aceite` | `ticket`, `fase` (`entrada`, `lembrete`, `encerramento`), `envio`, `envios_necessarios` | cria o aviso "à espera do seu aceite" |
| `notificacao` | `notificacao: { tipo, titulo, corpo }` (sem ticket; ex.: `tipo: "credencial"` quando a Mube pede uma credencial) | cria o aviso; o de credencial só aparece a quem tem as Credenciais e abre essa secção |

**Entrega:** a resposta tem de ser **2xx em até 10 s**. Senão, a plataforma tenta mais duas vezes (1 min e 5 min depois) e alerta a equipa da Mube. Em Aguardando aceite, só os avisos entregues contam para o aceite tácito.

**Assinatura** (o pacote confere-a; só é preciso se se escrever um webhook à mão):

```ts
import { createHmac, timingSafeEqual } from "node:crypto"
const esperada = `sha256=${createHmac("sha256", process.env.MUBE_CHAVE!).update(corpoEmBruto).digest("hex")}`
const valida = assinatura.length === esperada.length && timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperada))
```

---

## 7. A API da plataforma (referência)

O pacote chama-a pelo servidor do projeto; não é preciso usá-la à mão. Útil para integrações próprias.

**Credencial**, em todos os pedidos:

```
Authorization: Bearer mk_live_…
X-Mube-Cliente: <MUBE_CLIENTE_ID>
X-Mube-Projeto: <MUBE_PROJETO_ID>
```

Os pedidos que escrevem levam quem age no corpo: `"utilizador": { "id": "<id no software>", "nome": "…", "email": "…", "fotoUrl": "…" }`. Erros: sempre `{ "erro": { "codigo": "…", "mensagem": "…" } }`.

| Método e caminho | Para quê |
|---|---|
| `PUT /api/v1/liberados` | a lista **completa** de liberados: `{ utilizadores: [{ id, nome?, email?, fotoUrl?, drive?, credenciais? }] }`; quem não vier deixa de estar liberado |
| `POST /api/v1/ficheiros` → `PUT url_de_envio` → `POST /api/v1/ficheiros/{id}/confirmar` | enviar um ficheiro (qualquer tipo, sem limite) e obter o `id` |
| `POST /api/v1/relatos` | relatar: `{ utilizador, texto?, impacto, ficheiros?, chaveIdempotencia? }` |
| `GET /api/v1/tickets` · `GET /api/v1/tickets/{numero}` | a lista (50 por página, `?antes=`, `?utilizador=`) e o detalhe |
| `POST /api/v1/tickets/{numero}/comentarios` | comentar: `{ utilizador, corpo, respostaA?, ficheiros? }` |
| `POST /api/v1/tickets/{numero}/aceite` · `/recusa` | aceitar `{ utilizador }`; recusar `{ utilizador, motivo, ficheiros? }` |
| `GET /api/v1/drive` | a Drive como o cliente a vê |
| `POST /api/v1/drive/pastas` · `PATCH`/`DELETE /api/v1/drive/pastas/{id}` | pastas do cliente |
| `POST /api/v1/drive/itens` · `PATCH`/`DELETE /api/v1/drive/itens/{id}` · `GET …/{id}/url` | ficheiros da Drive |
| `GET /api/v1/credenciais` | os pedidos da Mube por responder e o que o cliente já enviou (só nomes; o valor vê-se em `/revelar`) |
| `POST /api/v1/credenciais` | enviar: `{ utilizador, modelo, nome?, url?, campos: { utilizador?, senha?, notas?, registador?, texto? }, pedidoId? }` |
| `POST /api/v1/credenciais/{id}/revelar` | ver o que o cliente enviou (decifrado; fica registado) |
| `PUT`/`DELETE /api/v1/credenciais/{id}` | editar `{ utilizador, nome?, url?, campos }` ou retirar `{ utilizador }` o que o cliente enviou |

Se o projeto já decide quem tem acesso por outra regra, devolve `liberado` (e `drive`) em `utilizador()` e mantém a plataforma a par:

```ts
import { sincronizarLiberados } from "@mubesystems/componente-operacional/servidor"
await sincronizarLiberados([{ id: "…", nome: "Marina Costa", email: "marina@cliente.pt", drive: false }])
```

---

## 8. Atualizar

1. Ver a última versão nas [tags do repositório](https://github.com/mubesystems/componente-operacional-cliente/tags).
2. `pnpm add github:mubesystems/componente-operacional-cliente#v<versão>`.
3. Se a versão trouxer SQL novo (a Mube diz), **voltar a correr** o `componente-mube.sql` (§3.3). Correr sempre também não faz mal.
4. Deploy.

### Da 0.1 para a 0.2

- **SQL novo:** reaplicar o `componente-mube.sql` (acrescenta `mube_liberados.credenciais` e a tabela `mube_tour`). Sem isto continua a funcionar, mas sem as Credenciais e com o convite ao tour sempre à vista.
- **O suporte passa a ser uma página** (§3.5): trocar o `<ComponenteMube />` do layout pelo `<AvisoMube href="/suporte" />`, criar a página com o `<PaginaMube />` e pôr o item "Suporte" no menu com `useNovidadesMube()`. O `<ComponenteMube />` antigo continua a funcionar, se se quiser adiar.
- **Credenciais:** o gestor liga, em Acessos, quem as pode enviar (por omissão ninguém).
- **Dependências:** o pacote passa a instalar o `remotion` e o `@remotion/player` (a animação do convite e do tour).

---

## 9. Quando algo não funciona

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| O botão Suporte não aparece | sem sessão (`utilizador()` devolve `null`) | confirmar a sessão do projeto na rota |
| "Sem acesso ao suporte" | a pessoa não está liberada (`nao_liberado`) | o gestor liberta-a em Acessos |
| O separador Acessos não aparece | `gestor` não vem `true` | devolver `gestor: true` para quem gere |
| Acessos dá `equipa_por_configurar` | falta a opção `equipa` na rota | acrescentá-la (§3.4) |
| `mube_por_configurar` | falta uma variável `MUBE_*` | ver §3.2 e fazer redeploy |
| `401 credencial_invalida` | chave errada, revogada, ou IDs trocados | gerar a chave de novo no Operacional e confirmar os IDs |
| `plataforma_indisponivel` | o Operacional não respondeu | os tickets continuam a aparecer pela cópia; tentar de novo |
| Os tickets não mudam de estado | o webhook não chega | URL do webhook no Operacional (§3.7) e o middleware (§3.6); no Operacional, o histórico do ticket mostra cada envio e o erro |
| Webhook responde `401 assinatura_invalida` | a `MUBE_CHAVE` do projeto não é a do Operacional | usar a chave ativa do projeto |
| Drive dá `sem_drive` | a pessoa não tem a Drive em Acessos | o gestor liga-a |
| Credenciais dão `sem_credenciais` ou o separador não aparece | a pessoa não tem as Credenciais em Acessos | o gestor liga-as (por omissão ninguém as tem) |
| Imagens ou áudio não abrem | CSP do projeto | §3.6 |

---

## 10. Lista para conferir

- [ ] Pacote instalado com a última tag
- [ ] `MUBE_URL`, `MUBE_CLIENTE_ID`, `MUBE_PROJETO_ID`, `MUBE_CHAVE` no servidor (local e produção)
- [ ] SQL corrido no Supabase do projeto
- [ ] Rota `app/api/mube/[...caminho]/route.ts` com `utilizador` e `equipa`
- [ ] A página com o `<PaginaMube />`, o item "Suporte" no menu (`useNovidadesMube`) e o `<AvisoMube />` com o CSS no layout com sessão
- [ ] `/api/mube/webhook` fora do login no middleware
- [ ] URL do webhook guardado no Operacional
- [ ] Acessos escolhidos pelo gestor
- [ ] Teste: um relato com um ficheiro, um comentário da Mube a chegar ao componente, um aceite
