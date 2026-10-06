# Componente da Mube (`@mubesystems/componente-operacional`)

O suporte da Mube dentro do software do cliente (Figma: Embed 5.1 a 5.6):
reportar um problema com texto, áudio e ficheiros; acompanhar os tickets;
conversar com a equipa; aceitar ou recusar a correção; a Drive do projeto; e
a central de notificações.

Duas partes:

- **Interface** (`@mubesystems/componente-operacional`): `<ComponenteMube />`, React 19, CSS próprio.
- **Servidor** (`@mubesystems/componente-operacional/servidor`): um Route Handler do Next.js que guarda a chave, fala com a plataforma, recebe o webhook e mantém a cópia do estado no Supabase do cliente.

O navegador nunca vê a chave do projeto: fala só com o servidor do próprio software.

## Instalação (Next.js App Router)

### 1. O pacote

Está no repositório público [`mubesystems/componente-operacional-cliente`](https://github.com/mubesystems/componente-operacional-cliente), já construído, com uma tag por versão. Instala-se direto do GitHub, **sem tokens** nem `.npmrc`:

```bash
pnpm add github:mubesystems/componente-operacional-cliente#v0.1.0
```

Para atualizar, troca a tag pela versão nova (as versões estão nas tags do repositório). Quando a versão nova traz colunas novas, corre outra vez o SQL do passo 3.

### 2. Variáveis de ambiente (só no servidor)

```env
MUBE_URL=https://operacional.mubesystems.com
MUBE_CLIENTE_ID=…   # Operacional → Clientes → o cliente
MUBE_PROJETO_ID=…   # Operacional → projeto → Configurações
MUBE_CHAVE=mk_live_…   # Operacional → projeto → Configurações → Chaves de API
```

### 3. As tabelas da cópia

Correr no SQL Editor do Supabase do cliente o ficheiro
`node_modules/@mubesystems/componente-operacional/dist/sql/componente-mube.sql`.
Cria `mube_tickets`, `mube_eventos`, `mube_notificacoes`,
`mube_notificacoes_lidas`, `mube_liberados` e `mube_estado`, com RLS ligada e
sem políticas (só a service role lê e escreve).

### 4. A rota do servidor

`app/api/mube/[...caminho]/route.ts`:

```ts
import { createClient } from "@supabase/supabase-js"
import { armazemSupabase, criarRotasMube } from "@mubesystems/componente-operacional/servidor"
import { quemEstaComSessao } from "@/lib/auth" // a sessão do software do cliente

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export const { GET, POST, PUT, PATCH, DELETE } = criarRotasMube({
  armazem: armazemSupabase(supabase),
  // Quem está com sessão. `gestor`: quem gere o software e escolhe os acessos ao suporte.
  utilizador: async () => {
    const u = await quemEstaComSessao()
    if (!u) return null
    return { id: u.id, nome: u.nome, email: u.email, fotoUrl: u.avatar, gestor: u.eAdmin }
  },
  // A equipa do software, de onde o gestor escolhe quem tem acesso.
  equipa: async () => (await listarUtilizadores()).map((u) => ({ id: u.id, nome: u.nome, email: u.email, fotoUrl: u.avatar })),
})
```

No Operacional, o **URL do webhook** do projeto é `https://<software do cliente>/api/mube/webhook`.

### 5. Quem tem acesso ao suporte

O gestor (`gestor: true`) vê no componente o separador **Acessos**, com a
equipa do software, e liga ou desliga quem pode reportar, acompanhar,
aceitar as correções e receber os avisos (S14, S18), e, para quem tem esse
acesso, quem vê a **Drive**. Dar o suporte dá também a Drive; tira-se a seguir.
A escolha fica em `mube_liberados` (coluna `drive`) e segue para a plataforma
ao guardar; se a plataforma não responder, nada muda. Quem não tem acesso vê
"Sem acesso ao suporte"; quem não tem a Drive não vê o separador Drive, e a
rota recusa-lhe a Drive (`403 sem_drive`). O gestor sem acesso vê só o
separador Acessos (pode dar acesso a si próprio).

Ao atualizar o pacote, corra outra vez o SQL do passo 3: acrescenta as colunas
novas sem mexer no resto (`mube_liberados.drive`: quem já tinha acesso fica com
a Drive; `mube_notificacoes.mencionados`: quem a equipa mencionou num
comentário, que vê esse aviso como menção).

Se o software já decide isto de outra forma, devolva `liberado` (e `drive`) em
`utilizador()` (sobrepõem-se à escolha) e sincronize com a plataforma:

```ts
import { sincronizarLiberados } from "@mubesystems/componente-operacional/servidor"
await sincronizarLiberados([{ id: "…", nome: "Marina Costa", email: "marina@cliente.pt", drive: false }])
```

### 6. O componente

No layout da área com sessão:

```tsx
import { ComponenteMube } from "@mubesystems/componente-operacional"
import "@mubesystems/componente-operacional/estilos.css"

<ComponenteMube />
```

Opções: `base` (por omissão `/api/mube`), `rotulo` (`"Suporte"`), `tema`
(`"auto"` segue a classe `dark` do `<html>`; ou `"claro"`/`"escuro"`) e
`posicao` (`"direita"` ou `"esquerda"`).

A letra é a Plus Jakarta Sans se o software a tiver carregada; senão, a do
sistema. Para outra: `--mube-fonte` no CSS do software.

## Como funciona

- **Ficheiros:** o navegador envia ao servidor do software, que os passa em stream ao armazenamento por URL assinada. Não é preciso CORS no bucket.
- **Estado:** a plataforma avisa por webhook (assinado com a chave; eventos repetidos ignorados), e o servidor atualiza a cópia. O componente lê da cópia: os tickets aparecem mesmo com a plataforma em baixo (com o aviso de que podem estar atrasados).
- **Aceite e recusa** são pedidos: o estado só muda quando a plataforma confirma.
- **Isolamento:** classes com o prefixo `mube:` e variáveis presas a `.mube-c`. O CSS do software não muda o componente, e o do componente não toca no software.

Referência da API da plataforma: `apps/operacional/docs/v1/api-do-componente.md`.

## Desenvolvimento

O código vive em `apps/operacional/componente` (fora do workspace do pnpm,
para não mexer nos Dockerfiles das outras apps) e usa as ferramentas do
Operacional.

```bash
cd apps/operacional/componente
pnpm construir      # tokens e ícones do Operacional → dist/ (JS, .d.ts, estilos.css, sql)
```

Em `pnpm dev:operacional`, `http://localhost:3004/exemplo-componente` mostra o
componente numa página de exemplo, ligado ao "Projeto de Teste" (só em
desenvolvimento; a cópia fica em memória).

Publicar: subir a versão em `package.json`, `pnpm construir` e
`npm publish` (com um token do GitHub com `write:packages`).
