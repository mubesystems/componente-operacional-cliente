export class ErroDoSuporte extends Error {
    codigo;
    estado;
    constructor(mensagem, codigo, estado) {
        super(mensagem);
        this.codigo = codigo;
        this.estado = estado;
    }
}
/** O navegador só fala com a parte servidor do software do cliente (nunca com a plataforma). */
export function criarApi(base) {
    const raiz = base.replace(/\/$/, "");
    async function pedir(metodo, caminho, corpo) {
        let r;
        try {
            r = await fetch(`${raiz}/${caminho}`, {
                method: metodo,
                headers: corpo === undefined ? undefined : { "Content-Type": "application/json" },
                body: corpo === undefined ? undefined : JSON.stringify(corpo),
                credentials: "same-origin",
                cache: "no-store",
            });
        }
        catch {
            throw new ErroDoSuporte("Sem ligação. Verifique a internet e tente de novo.", "sem_ligacao", 0);
        }
        const dados = (await r.json().catch(() => null));
        if (!r.ok)
            throw new ErroDoSuporte(dados?.erro?.mensagem ?? "Não foi possível concluir. Tente de novo.", dados?.erro?.codigo ?? "erro", r.status);
        return dados;
    }
    /** Envia o ficheiro pela parte servidor, que o passa ao armazenamento. Com progresso. */
    function enviar(ficheiro, nome, aoProgresso, sinal) {
        return new Promise((resolver, rejeitar) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", `${raiz}/ficheiros`);
            xhr.setRequestHeader("Content-Type", ficheiro.type || "application/octet-stream");
            xhr.setRequestHeader("X-Nome", encodeURIComponent(nome));
            xhr.upload.onprogress = (e) => e.lengthComputable && aoProgresso?.(e.loaded / e.total);
            xhr.onload = () => {
                const dados = (() => {
                    try {
                        return JSON.parse(xhr.responseText);
                    }
                    catch {
                        return null;
                    }
                })();
                if (xhr.status >= 200 && xhr.status < 300)
                    resolver(dados);
                else
                    rejeitar(new ErroDoSuporte(dados?.erro?.mensagem ?? "O envio falhou.", dados?.erro?.codigo ?? "envio_falhou", xhr.status));
            };
            xhr.onerror = () => rejeitar(new ErroDoSuporte("O envio falhou. Verifique a ligação.", "sem_ligacao", 0));
            xhr.onabort = () => rejeitar(new ErroDoSuporte("Envio cancelado.", "cancelado", 0));
            sinal?.addEventListener("abort", () => xhr.abort());
            xhr.send(ficheiro);
        });
    }
    return {
        sessao: () => pedir("GET", "sessao"),
        tickets: () => pedir("GET", "tickets"),
        ticket: (numero) => pedir("GET", `tickets/${numero}`),
        relatar: (corpo) => pedir("POST", "relatos", corpo),
        comentar: (numero, corpo, respostaA, ficheiros = []) => pedir("POST", `tickets/${numero}/comentarios`, { corpo, respostaA: respostaA ?? undefined, ficheiros }),
        aceitar: (numero) => pedir("POST", `tickets/${numero}/aceite`, {}),
        recusar: (numero, motivo, ficheiros) => pedir("POST", `tickets/${numero}/recusa`, { motivo, ficheiros }),
        drive: () => pedir("GET", "drive"),
        criarPasta: (nome, pastaId) => pedir("POST", "drive/pastas", { nome, pastaId }),
        porNaDrive: (ficheiroId, pastaId) => pedir("POST", "drive/itens", { ficheiroId, pastaId }),
        mudar: (tipo, id, mudanca) => pedir("PATCH", `drive/${tipo === "pasta" ? "pastas" : "itens"}/${id}`, mudanca),
        apagar: (tipo, id) => pedir("DELETE", `drive/${tipo === "pasta" ? "pastas" : "itens"}/${id}`, {}),
        urlDoItem: (id, descarregar = false) => pedir("GET", `drive/itens/${id}/url${descarregar ? "?descarregar=1" : ""}`),
        notificacoes: () => pedir("GET", "notificacoes"),
        marcarLidas: (ids) => pedir("POST", "notificacoes/lidas", { ids }),
        acessos: () => pedir("GET", "acessos"),
        definirAcessos: (acessos) => pedir("PUT", "acessos", { acessos }),
        credenciais: () => pedir("GET", "credenciais"),
        marcarTour: (estado) => pedir("POST", "tour", { estado }),
        enviarCredencial: (corpo) => pedir("POST", "credenciais", corpo),
        editarCredencial: (id, corpo) => pedir("PUT", `credenciais/${id}`, corpo),
        revelarCredencial: (id) => pedir("POST", `credenciais/${id}/revelar`, {}),
        retirarCredencial: (id) => pedir("DELETE", `credenciais/${id}`, {}),
        enviar,
    };
}
