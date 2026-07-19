import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

// El conector firma el XML con el certificado P12 y lo somete a la DGII de forma
// síncrona antes de responder — esa cadena completa puede tardar más de 15s bajo
// carga. Un timeout corto aquí no cancela el trabajo del lado del conector, solo
// nos hace perder el invoice_id/qr_link de una factura que sí quedó registrada.
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Wraps a failure from the RutiversoTech ECF Connector (or a network failure
 * reaching it) as an HttpException so Nest's default filter surfaces the real
 * message/status instead of masking it as a generic 500.
 */
export class EcfConnectorException extends HttpException {
    constructor(
        message: string,
        public readonly upstreamStatus: number,
        public readonly connectorCode?: number,
    ) {
        // 401 (key inválida/inactiva) se traduce tal cual; cualquier otra falla del
        // conector (400/500/red) se reporta como 502 Bad Gateway (falla upstream).
        super(message, upstreamStatus === 401 ? HttpStatus.UNAUTHORIZED : HttpStatus.BAD_GATEWAY);
    }
}

export interface EcfTax {
    id: number;
    name: string;
    amount: number;
    type_tax_use: string;
}

export interface EcfSendItem {
    name: string;
    quantity: number;
    price_unit: number;
    product_id?: number;
    tax_ids?: number[];
    discount?: number;
}

export interface EcfSendPayload {
    ncf: string;
    invoice_date_due: string;
    partner_id?: number;
    client_name?: string;
    client_vat?: string;
    invoice_date?: string;
    ref?: string;
    description?: string;
    items?: EcfSendItem[];
    income_type?: string;
    expense_type?: string;
    ncf_modificate?: string;
    modification_code?: string;
    base_amount?: number;
    tax_ids?: number[];
}

export interface EcfSendResponse {
    invoice_id: number;
    invoice_name: string;
    partner_id: number;
    partner_name: string;
    ncf: string;
    origin_ncf: string | null;
    ecf_status: string;
    move_type: string;
    amount_untaxed: number;
    amount_tax: number;
    amount_total: number;
    qr_link: string;
}

/**
 * Pure HTTP client for the RutiversoTech ECF Connector API. Stateless — takes
 * baseUrl/apiKey explicitly per call rather than being tied to a business, since
 * each business (tenant) configures its own connector URL + key.
 */
@Injectable()
export class EcfConnectorService {
    private async call<T>(baseUrl: string, apiKey: string, path: string, options: RequestInit = {}): Promise<T> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        let res: Response;
        try {
            res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/ecf${path}`, {
                ...options,
                headers: {
                    Authorization: apiKey,
                    "Content-Type": "application/json",
                    ...options.headers,
                },
                signal: controller.signal,
            });
        } catch (err: any) {
            throw new EcfConnectorException(
                err?.name === "AbortError" ? "Tiempo de espera agotado al contactar el conector e-CF." : `No se pudo contactar el conector e-CF: ${err?.message}`,
                0,
            );
        } finally {
            clearTimeout(timeout);
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            if (!res.ok) {
                throw new EcfConnectorException(`Error del conector e-CF (HTTP ${res.status})`, res.status);
            }
            return (await res.text()) as unknown as T;
        }

        const body = await res.json();
        if (!res.ok) {
            throw new EcfConnectorException(body?.message || `Error del conector e-CF (HTTP ${res.status})`, res.status, body?.code);
        }

        return (body?.data ?? body) as T;
    }

    verify(baseUrl: string, apiKey: string) {
        return this.call<{ client_id: number; client_name: string; state: string }>(baseUrl, apiKey, "/auth", { method: "POST" });
    }

    listTaxes(baseUrl: string, apiKey: string) {
        return this.call<EcfTax[]>(baseUrl, apiKey, "/taxes", { method: "GET" });
    }

    createClient(baseUrl: string, apiKey: string, payload: { name: string; type_client: string; rnc?: string }) {
        return this.call<{ id: number; name: string; type: string; rnc?: string }>(baseUrl, apiKey, "/new/client", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }

    send(baseUrl: string, apiKey: string, payload: EcfSendPayload) {
        return this.call<EcfSendResponse>(baseUrl, apiKey, "/send", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    }

    getStatus(baseUrl: string, apiKey: string, invoiceId: number) {
        return this.call<{ invoice_id: number; ncf: string; ecf_status: string; amount_total: number; message_dgii?: string }>(
            baseUrl,
            apiKey,
            `/invoice/${invoiceId}/status`,
            { method: "GET" },
        );
    }

    getStatusNow(baseUrl: string, apiKey: string, invoiceId: number) {
        return this.call<{ invoice_id: number; ncf: string; ecf_status: string; amount_total: number; message_dgii?: string }>(
            baseUrl,
            apiKey,
            `/get/${invoiceId}/now`,
            { method: "GET" },
        );
    }

    listInvoices(baseUrl: string, apiKey: string, params: { ecf_status?: string; limit?: number } = {}) {
        const query = new URLSearchParams();
        if (params.ecf_status) query.set("ecf_status", params.ecf_status);
        if (params.limit) query.set("limit", String(params.limit));
        const qs = query.toString();
        return this.call<any[]>(baseUrl, apiKey, `/invoices${qs ? `?${qs}` : ""}`, { method: "GET" });
    }

    getXml(baseUrl: string, apiKey: string, invoiceId: number) {
        return this.call<string>(baseUrl, apiKey, `/get/${invoiceId}/xml`, { method: "GET" });
    }
}
