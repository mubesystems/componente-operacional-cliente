const juntar = (antes, novo) => ({ ...(antes ?? {}), ...novo });
/** Os URLs assinados caducam numa hora: não se guardam na cópia. */
function semUrlsNaMensagem(m) {
    return { ...m, anexos: (m.anexos ?? []).map(({ url: _url, ...f }) => (void _url, f)) };
}
/**
 * Os eventos podem chegar fora de ordem: uma mensagem apagada não volta, e
 * uma editada não volta ao texto original.
 */
export function juntarMensagem(antes, nova) {
    const limpa = semUrlsNaMensagem(nova);
    if (!antes)
        return limpa;
    if (antes.apagada && !limpa.apagada)
        return antes;
    if (antes.editada && !limpa.editada && !limpa.apagada)
        return antes;
    return limpa;
}
// Pela hora, não pelo texto: "…00Z" e "…00.000Z" são a mesma hora.
const naoLidaPor = (m, utilizadorId, lidaAte) => !m.apagada && !(m.autor.tipo === "cliente" && m.autor.id === utilizadorId) && (!lidaAte || Date.parse(m.criada_em) > Date.parse(lidaAte));
/** Em memória: para desenvolvimento e testes. Perde-se ao reiniciar o servidor. */
export function armazemEmMemoria() {
    const tickets = new Map();
    const eventos = new Set();
    const notificacoes = new Map();
    const lidas = new Set();
    let liberados = [];
    let sincronizado = false;
    const tours = new Map();
    const conversas = new Map();
    const mensagens = new Map();
    const leituras = new Map();
    return {
        async guardarConversas(lista) {
            for (const c of lista) {
                const { por_ler: _p, ...resto } = c;
                void _p;
                conversas.set(c.id, { ...(conversas.get(c.id) ?? {}), ...resto });
            }
        },
        async conversa(id) {
            return conversas.get(id) ?? null;
        },
        async conversasDe(utilizadorId) {
            return [...conversas.values()].filter((c) => !c.arquivada && c.participantes.some((p) => p.id === utilizadorId));
        },
        async participantesDe(conversaId) {
            return (conversas.get(conversaId)?.participantes ?? []).map((p) => p.id);
        },
        async guardarMensagens(lista) {
            for (const m of lista)
                mensagens.set(m.id, juntarMensagem(mensagens.get(m.id), m));
        },
        async mensagens(conversaId, { antes, limite = 50 } = {}) {
            return [...mensagens.values()]
                .filter((m) => m.conversa_id === conversaId && (!antes || m.criada_em < antes))
                .sort((a, b) => b.criada_em.localeCompare(a.criada_em))
                .slice(0, limite)
                .reverse();
        },
        async marcarConversaLida(conversaId, utilizadorId, ate) {
            leituras.set(`${conversaId}:${utilizadorId}`, ate);
        },
        async porLer(utilizadorId, ids) {
            const mapa = new Map();
            for (const id of ids) {
                const lida = leituras.get(`${id}:${utilizadorId}`);
                mapa.set(id, [...mensagens.values()].filter((m) => m.conversa_id === id && naoLidaPor(m, utilizadorId, lida)).length);
            }
            return mapa;
        },
        async tickets() {
            return [...tickets.values()].sort((a, b) => b.numero - a.numero);
        },
        async ticket(numero) {
            return tickets.get(numero) ?? null;
        },
        async guardarTickets(lista) {
            for (const t of lista)
                tickets.set(t.numero, juntar(tickets.get(t.numero), t));
        },
        async sincronizado() {
            return sincronizado;
        },
        async marcarSincronizado() {
            sincronizado = true;
        },
        async eventoNovo(id) {
            if (eventos.has(id))
                return false;
            eventos.add(id);
            return true;
        },
        async guardarNotificacao(n) {
            if (!notificacoes.has(n.id))
                notificacoes.set(n.id, n);
        },
        async notificacoes(utilizadorId, limite = 100) {
            return [...notificacoes.values()]
                .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
                .slice(0, limite)
                .map((n) => ({ ...n, lida: lidas.has(`${n.id}:${utilizadorId}`) }));
        },
        async marcarLidas(utilizadorId, ids) {
            for (const id of ids === "todas" ? notificacoes.keys() : ids)
                lidas.add(`${id}:${utilizadorId}`);
        },
        async liberados() {
            return liberados.map((l) => ({ ...l }));
        },
        async definirLiberados(lista) {
            liberados = [...new Map(lista.map((l) => [l.id, { id: l.id, drive: l.drive, credenciais: l.credenciais }])).values()];
        },
        async tour(utilizadorId) {
            return tours.get(utilizadorId) ?? null;
        },
        async marcarTour(utilizadorId, estado) {
            tours.set(utilizadorId, estado);
        },
    };
}
/**
 * No Supabase do cliente, nas tabelas de `sql/componente-mube.sql`. Use o
 * cliente com a service role: as tabelas têm RLS ligada e nenhuma política.
 */
/** A coluna ainda não existe (o SQL do pacote não foi reaplicado depois de atualizar). */
const semColuna = (error) => ["42703", "PGRST204"].includes(error?.code ?? "");
/** A tabela ainda não existe (idem). */
const semTabela = (error) => ["42P01", "PGRST205"].includes(error?.code ?? "");
export function armazemSupabase(supabase, opcoes = {}) {
    const t = (nome) => `${opcoes.prefixo ?? "mube_"}${nome}`;
    const falhou = (error) => {
        if (error)
            throw error;
    };
    return {
        async tickets() {
            const { data, error } = await supabase.from(t("tickets")).select("dados").order("numero", { ascending: false });
            falhou(error);
            return (data ?? []).map((l) => l.dados);
        },
        async ticket(numero) {
            const { data, error } = await supabase.from(t("tickets")).select("dados").eq("numero", numero).maybeSingle();
            falhou(error);
            return data?.dados ?? null;
        },
        async guardarTickets(lista) {
            if (!lista.length)
                return;
            const { data, error } = await supabase
                .from(t("tickets"))
                .select("numero, dados")
                .in("numero", lista.map((x) => x.numero));
            falhou(error);
            const antes = new Map((data ?? []).map((l) => [l.numero, l.dados]));
            const { error: e } = await supabase.from(t("tickets")).upsert(lista.map((x) => {
                const dados = juntar(antes.get(x.numero), x);
                return { numero: x.numero, estado: dados.estado, dados, atualizado_em: new Date().toISOString() };
            }));
            falhou(e);
        },
        async sincronizado() {
            const { data, error } = await supabase.from(t("estado")).select("valor").eq("chave", "sincronizado").maybeSingle();
            falhou(error);
            return Boolean(data?.valor);
        },
        async marcarSincronizado() {
            const { error } = await supabase.from(t("estado")).upsert({ chave: "sincronizado", valor: true });
            falhou(error);
        },
        async eventoNovo(id) {
            const { error } = await supabase.from(t("eventos")).insert({ id });
            if (error?.code === "23505")
                return false;
            falhou(error);
            return true;
        },
        async guardarNotificacao(n) {
            const { error } = await supabase.from(t("notificacoes")).upsert(n, { onConflict: "id", ignoreDuplicates: true });
            falhou(error);
        },
        async notificacoes(utilizadorId, limite = 100) {
            const [{ data, error }, { data: lidas, error: e2 }] = await Promise.all([
                supabase.from(t("notificacoes")).select("id, tipo, ticket_numero, titulo, corpo, criado_em, mencionados").order("criado_em", { ascending: false }).limit(limite),
                supabase.from(t("notificacoes_lidas")).select("notificacao_id").eq("utilizador_id", utilizadorId),
            ]);
            falhou(error);
            falhou(e2);
            const vistas = new Set((lidas ?? []).map((l) => l.notificacao_id));
            return (data ?? []).map((n) => ({ ...n, lida: vistas.has(n.id) }));
        },
        async marcarLidas(utilizadorId, ids) {
            let lista = ids;
            if (ids === "todas") {
                const { data, error } = await supabase.from(t("notificacoes")).select("id").order("criado_em", { ascending: false }).limit(500);
                falhou(error);
                lista = (data ?? []).map((n) => n.id);
            }
            if (!lista.length)
                return;
            const { error } = await supabase
                .from(t("notificacoes_lidas"))
                .upsert(lista.map((id) => ({ notificacao_id: id, utilizador_id: utilizadorId })), { ignoreDuplicates: true });
            falhou(error);
        },
        async liberados() {
            let { data, error } = await supabase.from(t("liberados")).select("utilizador_id, drive, credenciais");
            // Sem o SQL da versão com credenciais (S63) reaplicado: lê-se sem a coluna.
            if (semColuna(error))
                ({ data, error } = await supabase.from(t("liberados")).select("utilizador_id, drive"));
            falhou(error);
            return (data ?? []).map((l) => ({
                id: l.utilizador_id,
                drive: l.drive !== false,
                credenciais: l.credenciais === true,
            }));
        },
        async definirLiberados(lista) {
            const novos = new Map(lista.map((l) => [l.id, l]));
            const { data, error: e0 } = await supabase.from(t("liberados")).select("utilizador_id");
            falhou(e0);
            const atuais = (data ?? []).map((l) => l.utilizador_id);
            const sair = atuais.filter((id) => !novos.has(id));
            if (sair.length) {
                const { error } = await supabase.from(t("liberados")).delete().in("utilizador_id", sair);
                falhou(error);
            }
            if (novos.size) {
                const linhas = [...novos.values()].map((l) => ({ utilizador_id: l.id, drive: l.drive, credenciais: l.credenciais }));
                let { error } = await supabase.from(t("liberados")).upsert(linhas, { onConflict: "utilizador_id" });
                if (semColuna(error))
                    ({ error } = await supabase.from(t("liberados")).upsert(linhas.map(({ credenciais: _c, ...l }) => (void _c, l)), { onConflict: "utilizador_id" }));
                falhou(error);
            }
        },
        // ─── Conversas com a Mube (v0.6.0) ───────────────────────────────────────
        async guardarConversas(lista) {
            if (!lista.length)
                return;
            const unicas = [...new Map(lista.map((c) => [c.id, c])).values()];
            const { error } = await supabase.from(t("conversas")).upsert(unicas.map((c) => {
                const { por_ler: _p, ...dados } = c;
                void _p;
                return { id: c.id, tipo: c.tipo, arquivada: c.arquivada, dados, ultima_mensagem_em: c.ultima_mensagem_em, atualizado_em: new Date().toISOString() };
            }), { onConflict: "id" });
            falhou(error);
            // A lista de participantes troca-se inteira: quem saiu deixa de ver a conversa.
            const { error: e1 } = await supabase.from(t("conversa_participantes")).delete().in("conversa_id", unicas.map((c) => c.id));
            falhou(e1);
            const linhas = unicas.flatMap((c) => [...new Set(c.participantes.map((p) => p.id))].map((id) => ({ conversa_id: c.id, utilizador_id: id })));
            if (linhas.length) {
                const { error: e2 } = await supabase.from(t("conversa_participantes")).insert(linhas);
                falhou(e2);
            }
        },
        async conversa(id) {
            const { data, error } = await supabase.from(t("conversas")).select("dados").eq("id", id).maybeSingle();
            falhou(error);
            return data?.dados ?? null;
        },
        async conversasDe(utilizadorId) {
            const { data: minhas, error } = await supabase.from(t("conversa_participantes")).select("conversa_id").eq("utilizador_id", utilizadorId);
            falhou(error);
            const ids = (minhas ?? []).map((l) => l.conversa_id);
            if (!ids.length)
                return [];
            const { data, error: e } = await supabase.from(t("conversas")).select("dados").in("id", ids).eq("arquivada", false);
            falhou(e);
            return (data ?? []).map((l) => l.dados);
        },
        async participantesDe(conversaId) {
            const { data, error } = await supabase.from(t("conversa_participantes")).select("utilizador_id").eq("conversa_id", conversaId);
            falhou(error);
            return (data ?? []).map((l) => l.utilizador_id);
        },
        async guardarMensagens(lista) {
            if (!lista.length)
                return;
            const { data, error } = await supabase.from(t("mensagens")).select("id, dados").in("id", lista.map((m) => m.id));
            falhou(error);
            const antes = new Map((data ?? []).map((l) => [l.id, l.dados]));
            const juntas = new Map();
            for (const m of lista)
                juntas.set(m.id, juntarMensagem(juntas.get(m.id) ?? antes.get(m.id), m));
            const { error: e } = await supabase.from(t("mensagens")).upsert([...juntas.values()].map((m) => ({
                id: m.id,
                conversa_id: m.conversa_id,
                autor_tipo: m.autor.tipo,
                autor_id: m.autor.id,
                apagada: m.apagada,
                editada: m.editada,
                dados: m,
                criada_em: m.criada_em,
                atualizado_em: new Date().toISOString(),
            })), { onConflict: "id" });
            falhou(e);
        },
        async mensagens(conversaId, { antes, limite = 50 } = {}) {
            let q = supabase.from(t("mensagens")).select("dados").eq("conversa_id", conversaId).order("criada_em", { ascending: false }).limit(limite);
            if (antes)
                q = q.lt("criada_em", antes);
            const { data, error } = await q;
            falhou(error);
            return (data ?? []).map((l) => l.dados).reverse();
        },
        async marcarConversaLida(conversaId, utilizadorId, ate) {
            const { error } = await supabase.from(t("conversa_leituras")).upsert({ conversa_id: conversaId, utilizador_id: utilizadorId, lida_ate: ate }, { onConflict: "conversa_id,utilizador_id" });
            falhou(error);
        },
        async porLer(utilizadorId, ids) {
            const mapa = new Map();
            if (!ids.length)
                return mapa;
            const { data: lidas, error } = await supabase.from(t("conversa_leituras")).select("conversa_id, lida_ate").eq("utilizador_id", utilizadorId).in("conversa_id", ids);
            falhou(error);
            const ate = new Map((lidas ?? []).map((l) => [l.conversa_id, l.lida_ate]));
            await Promise.all(ids.map(async (id) => {
                let q = supabase
                    .from(t("mensagens"))
                    .select("id", { count: "exact", head: true })
                    .eq("conversa_id", id)
                    .eq("apagada", false)
                    // O id vem do software do cliente: entre aspas, para o filtro não se partir.
                    .or(`autor_tipo.eq.mube,autor_id.neq."${utilizadorId.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`);
                const lida = ate.get(id);
                if (lida)
                    q = q.gt("criada_em", lida);
                const { count } = await q;
                mapa.set(id, count ?? 0);
            }));
            return mapa;
        },
        async tour(utilizadorId) {
            const { data, error } = await supabase.from(t("tour")).select("estado").eq("utilizador_id", utilizadorId).maybeSingle();
            // Sem a tabela (SQL por reaplicar), o banner aparece: não se parte nada.
            if (semTabela(error))
                return null;
            falhou(error);
            return data?.estado ?? null;
        },
        async marcarTour(utilizadorId, estado) {
            const { error } = await supabase.from(t("tour")).upsert({ utilizador_id: utilizadorId, estado, em: new Date().toISOString() }, { onConflict: "utilizador_id" });
            if (semTabela(error))
                return;
            falhou(error);
        },
    };
}
