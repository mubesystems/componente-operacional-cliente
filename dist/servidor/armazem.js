const juntar = (antes, novo) => ({ ...(antes ?? {}), ...novo });
/** Em memória: para desenvolvimento e testes. Perde-se ao reiniciar o servidor. */
export function armazemEmMemoria() {
    const tickets = new Map();
    const eventos = new Set();
    const notificacoes = new Map();
    const lidas = new Set();
    let liberados = [];
    let sincronizado = false;
    return {
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
            liberados = [...new Map(lista.map((l) => [l.id, { id: l.id, drive: l.drive }])).values()];
        },
    };
}
/**
 * No Supabase do cliente, nas tabelas de `sql/componente-mube.sql`. Use o
 * cliente com a service role: as tabelas têm RLS ligada e nenhuma política.
 */
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
            const { data, error } = await supabase.from(t("liberados")).select("utilizador_id, drive");
            falhou(error);
            return (data ?? []).map((l) => ({ id: l.utilizador_id, drive: l.drive !== false }));
        },
        async definirLiberados(lista) {
            const novos = new Map(lista.map((l) => [l.id, l.drive]));
            const { data, error: e0 } = await supabase.from(t("liberados")).select("utilizador_id");
            falhou(e0);
            const atuais = (data ?? []).map((l) => l.utilizador_id);
            const sair = atuais.filter((id) => !novos.has(id));
            if (sair.length) {
                const { error } = await supabase.from(t("liberados")).delete().in("utilizador_id", sair);
                falhou(error);
            }
            if (novos.size) {
                const { error } = await supabase
                    .from(t("liberados"))
                    .upsert([...novos].map(([id, drive]) => ({ utilizador_id: id, drive })), { onConflict: "utilizador_id" });
                falhou(error);
            }
        },
    };
}
