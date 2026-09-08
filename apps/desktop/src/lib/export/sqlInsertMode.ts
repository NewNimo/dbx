import { createApp } from "vue";
import SqlInsertModeDialog from "@/components/export/SqlInsertModeDialog.vue";
import i18n from "@/i18n";

export type SqlInsertMode = "batch" | "single";

export interface SqlInsertExportOptions {
  insertMode: SqlInsertMode;
  selectedColumns?: string[];
}

export const DEFAULT_SQL_INSERT_MODE: SqlInsertMode = "batch";

export function showSqlInsertModeDialog(options?: { columns?: string[] }): Promise<SqlInsertExportOptions | null> {
  if (typeof document === "undefined") {
    return Promise.resolve({
      insertMode: DEFAULT_SQL_INSERT_MODE,
      selectedColumns: options?.columns ? [...options.columns] : undefined,
    });
  }

  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.append(container);
    let settled = false;
    let app: ReturnType<typeof createApp> | null = null;
    const finish = (value: SqlInsertExportOptions | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
      app?.unmount();
      container.remove();
    };
    app = createApp(SqlInsertModeDialog, {
      open: true,
      columns: options?.columns,
      onConfirm: (exportOptions: SqlInsertExportOptions) => finish(exportOptions),
      onCancel: () => finish(null),
    });
    app.use(i18n);
    app.mount(container);
  });
}
