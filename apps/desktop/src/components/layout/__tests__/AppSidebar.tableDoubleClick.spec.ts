// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import AppSidebar from "@/components/layout/AppSidebar.vue";

const mocks = vi.hoisted(() => ({
  connectionStore: null as any,
  queryStore: null as any,
  toast: vi.fn(),
  insertTextIntoActiveQueryEditor: vi.fn(),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("@/stores/connectionStore", () => ({
  useConnectionStore: () => mocks.connectionStore,
}));

vi.mock("@/stores/queryStore", () => ({
  useQueryStore: () => mocks.queryStore,
}));

vi.mock("@/composables/useToast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/lib/editor/queryEditorTextEdits", () => ({
  insertTextIntoActiveQueryEditor: mocks.insertTextIntoActiveQueryEditor,
}));

vi.mock("@/components/sidebar/ConnectionTree.vue", () => ({
  default: defineComponent({
    name: "ConnectionTree",
    setup() {
      return () =>
        h("div", { class: "connection-tree-mock" }, [
          h("div", { class: "tree-row group/sidebar-row", "data-node-id": "tbl-1" }, [h("span", { class: "tree-object-label" }, "users")]),
          h("div", { class: "tree-row group/sidebar-row", "data-node-id": "view-1" }, [h("span", { class: "tree-object-label" }, "v_users")]),
        ]);
    },
  }),
}));

vi.mock("@/components/ui/button", async () => {
  const { defineComponent, h } = await import("vue");
  return {
    Button: defineComponent({
      setup(_, { slots }) {
        return () => h("button", {}, slots.default?.());
      },
    }),
  };
});

vi.mock("@/components/ui/dialog", async () => {
  const { defineComponent, h } = await import("vue");
  return {
    Dialog: defineComponent({
      props: { open: Boolean },
      setup(props, { slots }) {
        return () => (props.open ? h("div", {}, slots.default?.()) : null);
      },
    }),
    DialogContent: defineComponent({
      setup(_, { slots }) {
        return () => h("div", {}, slots.default?.());
      },
    }),
    DialogFooter: defineComponent({
      setup(_, { slots }) {
        return () => h("div", {}, slots.default?.());
      },
    }),
    DialogHeader: defineComponent({
      setup(_, { slots }) {
        return () => h("div", {}, slots.default?.());
      },
    }),
    DialogTitle: defineComponent({
      setup(_, { slots }) {
        return () => h("div", {}, slots.default?.());
      },
    }),
  };
});

vi.mock("@/components/ui/input", async () => {
  const { defineComponent, h } = await import("vue");
  return {
    Input: defineComponent({
      setup() {
        return () => h("input");
      },
    }),
  };
});

vi.mock("@/components/ui/LightDropdown.vue", () => ({
  default: defineComponent({
    name: "LightDropdown",
    setup() {
      return () => h("div", { class: "light-dropdown-mock" });
    },
  }),
}));

vi.mock("@/components/ui/LightTooltip.vue", () => ({
  default: defineComponent({
    name: "LightTooltip",
    setup(_, { slots }) {
      return () => h("div", {}, slots.default?.());
    },
  }),
}));

describe("AppSidebar table double click", () => {
  let container: HTMLDivElement;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    mocks.insertTextIntoActiveQueryEditor.mockReset();
    mocks.insertTextIntoActiveQueryEditor.mockReturnValue(true);

    mocks.connectionStore = reactive({
      selectedTreeNodeId: "tbl-1",
      treeNodes: [
        {
          id: "conn-1",
          type: "connection",
          label: "Local MySQL",
          children: [
            {
              id: "db-1",
              type: "database",
              label: "testdb",
              children: [
                {
                  id: "tbl-1",
                  type: "table",
                  label: "users",
                  tableName: "users",
                },
                {
                  id: "view-1",
                  type: "view",
                  label: "v_users",
                },
              ],
            },
          ],
        },
      ],
      selectedTreeNodeIds: ["tbl-1"],
      connectedIds: new Set(["conn-1"]),
      connectionMultiSelectActive: false,
    });

    mocks.queryStore = reactive({
      activeTabId: "tab-query-1",
      tabs: [
        {
          id: "tab-query-1",
          mode: "query",
          sql: "SELECT * FROM ",
        },
        {
          id: "tab-data-1",
          mode: "data",
          tableName: "orders",
        },
      ],
      updateSql: vi.fn(),
    });
  });

  afterEach(() => {
    app?.unmount();
    container.remove();
  });

  function mountSidebar() {
    app = createApp(AppSidebar, {
      sidebarWidth: 260,
      classicLayout: true,
      focusedConnectionId: null,
    });
    return app.mount(container);
  }

  it("intercepts double-click and inserts table name into query editor when query tab is active", async () => {
    mountSidebar();
    await nextTick();

    const tableRow = container.querySelector<HTMLElement>('[data-node-id="tbl-1"]')!;
    expect(tableRow).not.toBeNull();

    mocks.connectionStore.selectedTreeNodeId = "tbl-1";

    const dblClickEvent = new MouseEvent("dblclick", {
      bubbles: true,
      cancelable: true,
    });
    const dispatchResult = tableRow.dispatchEvent(dblClickEvent);

    expect(mocks.insertTextIntoActiveQueryEditor).toHaveBeenCalledWith("users");
    expect(dispatchResult).toBe(false); // preventDefault was called
    expect(dblClickEvent.defaultPrevented).toBe(true);
  });

  it("does NOT intercept double-click when active tab is not query mode (e.g. data tab)", async () => {
    mocks.queryStore.activeTabId = "tab-data-1";
    mountSidebar();
    await nextTick();

    const tableRow = container.querySelector<HTMLElement>('[data-node-id="tbl-1"]')!;
    mocks.connectionStore.selectedTreeNodeId = "tbl-1";

    const dblClickEvent = new MouseEvent("dblclick", {
      bubbles: true,
      cancelable: true,
    });
    const dispatchResult = tableRow.dispatchEvent(dblClickEvent);

    expect(mocks.insertTextIntoActiveQueryEditor).not.toHaveBeenCalled();
    expect(dispatchResult).toBe(true);
    expect(dblClickEvent.defaultPrevented).toBe(false);
  });

  it("does NOT intercept double-click when the clicked node is a view", async () => {
    mocks.queryStore.activeTabId = "tab-query-1";
    mocks.connectionStore.selectedTreeNodeId = "view-1";
    mountSidebar();
    await nextTick();

    const viewRow = container.querySelector<HTMLElement>('[data-node-id="view-1"]')!;
    const dblClickEvent = new MouseEvent("dblclick", {
      bubbles: true,
      cancelable: true,
    });
    const dispatchResult = viewRow.dispatchEvent(dblClickEvent);

    expect(mocks.insertTextIntoActiveQueryEditor).not.toHaveBeenCalled();
    expect(dispatchResult).toBe(true);
    expect(dblClickEvent.defaultPrevented).toBe(false);
  });
});
