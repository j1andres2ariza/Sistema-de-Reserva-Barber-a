// Local development adapter. The production build always uses the real Supabase client.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/types";
type Row = Record<string, unknown>;
type Reply = { data: unknown; error: LocalApiError | null };
class LocalApiError extends Error {
  constructor(
    message: string,
    public context?: Response,
  ) {
    super(message);
  }
}
async function api(path: string, body?: unknown) {
  try {
    const response = await fetch(`/__demo-api/${path}`, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.clone().json();
    return {
      data,
      error: response.ok
        ? null
        : new LocalApiError(data.error ?? "LOCAL_SERVER_ERROR", response),
    };
  } catch {
    return {
      data: null,
      error: new LocalApiError(
        "No se pudo conectar al servidor local. Inicia el proyecto con npm run dev.",
      ),
    };
  }
}
const listeners = new Set<{ table: string; callback: () => void }>();
function emit(table?: string) {
  for (const listener of listeners)
    if (!table || listener.table === table) listener.callback();
}
let revision: number | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
function startPolling() {
  if (timer) return;
  timer = setInterval(async () => {
    if (document.hidden) return;
    const { data, error } = await api("revision");
    if (error) return;
    if (revision !== undefined && revision !== data.revision) emit();
    revision = data.revision;
  }, 1500);
}
class LocalChannel {
  entries: { table: string; callback: () => void }[] = [];
  on(_event: string, filter: { table: string }, callback: () => void) {
    this.entries.push({ table: filter.table, callback });
    return this;
  }
  subscribe() {
    this.entries.forEach((e) => listeners.add(e));
    startPolling();
    return this;
  }
  stop() {
    this.entries.forEach((e) => listeners.delete(e));
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
      revision = undefined;
    }
  }
}
class LocalQuery implements PromiseLike<Reply> {
  private operation = "select";
  private columns = "*";
  private values: unknown;
  private filters: { key: string; value: unknown }[] = [];
  private orders: { key: string; ascending: boolean }[] = [];
  private maxRows: number | undefined;
  private singleMode: "single" | "maybeSingle" | undefined;
  constructor(private table: string) {}
  select(columns = "*") {
    this.columns = columns;
    return this;
  }
  insert(values: unknown) {
    this.operation = "insert";
    this.values = values;
    return this;
  }
  update(values: unknown) {
    this.operation = "update";
    this.values = values;
    return this;
  }
  delete() {
    this.operation = "delete";
    return this;
  }
  eq(key: string, value: unknown) {
    this.filters.push({ key, value });
    return this;
  }
  order(key: string, options?: { ascending?: boolean }) {
    this.orders.push({ key, ascending: options?.ascending ?? true });
    return this;
  }
  limit(count: number) {
    this.maxRows = count;
    return this;
  }
  single() {
    this.singleMode = "single";
    return this;
  }
  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this;
  }
  private async execute(): Promise<Reply> {
    const { data, error } = await api("query", {
      table: this.table,
      op: this.operation,
      columns: this.columns,
      values: this.values,
      filters: this.filters,
      orders: this.orders,
      limit: this.maxRows,
      single: this.singleMode,
    });
    if (!error && this.operation !== "select") emit(this.table);
    return { data: data?.data ?? null, error };
  }
  then<TResult1 = Reply, TResult2 = never>(
    onfulfilled?: ((value: Reply) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}
const authListeners = new Set<(event: string, session: unknown) => void>();
export function createDemoClient(): SupabaseClient<Database> {
  const client = {
    from: (table: string) => new LocalQuery(table),
    rpc: async (name: string, args?: Row) => {
      const { data, error } = await api("rpc", { name, args });
      return { data: data?.data ?? null, error };
    },
    channel: () => new LocalChannel(),
    removeChannel: async (channel: LocalChannel) => {
      channel.stop();
      return "ok";
    },
    functions: {
      invoke: async (name: string, options: { body: unknown }) => {
        if (name !== "create-booking")
          return {
            data: null,
            error: new LocalApiError("LOCAL_FUNCTION_NOT_FOUND"),
          };
        const result = await api("create-booking", options.body);
        if (!result.error) {
          emit("bookings");
          emit("whatsapp_notifications");
        }
        return result;
      },
    },
    auth: {
      getSession: async () => {
        const { data, error } = await api("session");
        return { data: { session: data?.session ?? null }, error };
      },
      onAuthStateChange: (
        callback: (event: string, session: unknown) => void,
      ) => {
        authListeners.add(callback);
        return {
          data: {
            subscription: { unsubscribe: () => authListeners.delete(callback) },
          },
        };
      },
      signInWithPassword: async () => {
        const { data, error } = await api("login", {});
        if (!error)
          authListeners.forEach((cb) => cb("SIGNED_IN", data.session));
        return { data, error };
      },
      signOut: async () => {
        const { error } = await api("logout", {});
        if (!error) authListeners.forEach((cb) => cb("SIGNED_OUT", null));
        return { error };
      },
    },
    storage: {
      from: () => ({
        upload: async (path: string, file: File) => {
          const encoded = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          return api("upload", { path, base64: encoded });
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `/__demo-api/files/${encodeURIComponent(path)}` },
        }),
      }),
    },
  };
  return client as unknown as SupabaseClient<Database>;
}
