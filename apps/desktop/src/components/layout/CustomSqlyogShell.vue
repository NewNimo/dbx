<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronsRight, AlertTriangle, Table2, FileCode, Plus } from "@lucide/vue";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import AppToolbar from "@/components/layout/AppToolbar.vue";
import CustomConnectionTabBar from "@/components/layout/CustomConnectionTabBar.vue";
import AppSidebar from "@/components/layout/AppSidebar.vue";
import EditorGroupTabBar from "@/components/layout/EditorGroupTabBar.vue";
import EditorToolbar from "@/components/layout/EditorToolbar.vue";
import ContentArea from "@/components/layout/ContentArea.vue";
import WelcomeScreen from "@/components/layout/WelcomeScreen.vue";
import AiAssistant from "@/components/editor/AiAssistant.vue";
import QueryHistory from "@/components/editor/QueryHistory.vue";
import SqlLibraryPanel from "@/components/layout/SqlLibraryPanel.vue";
import SqlFilePanel from "@/components/layout/SqlFilePanel.vue";
import { useCustomConnectionTabs } from "@/composables/useCustomConnectionTabs";
import { useConnectionStore } from "@/stores/connectionStore";
import { useQueryStore } from "@/stores/queryStore";
import { hasDataGridPendingChangesForTab } from "@/composables/useDataGridEditor";
import { tabDisplayTitle } from "@/lib/tabs/tabPresentation";
import { effectiveDatabaseTypeForConnection } from "@/lib/database/jdbcDialect";
import type { AppThemeMode } from "@/lib/app/appTheme";
import type { QueryTab, TreeNode } from "@/types/database";

const props = defineProps<{
  // Toolbar Props
  isDark: boolean;
  themeMode: AppThemeMode;
  showAiPanel: boolean;
  activeAiRunCount: number;
  awaitingAiRunCount: number;
  showHistory: boolean;
  showSqlLibrary: boolean;
  sqlLibrarySaveFeedbackId: number;
  showSqlFilePanel: boolean;
  showDriverStore: boolean;
  showSettingsPage: boolean;
  checkingUpdates: boolean;
  hasUpdateAvailable: boolean;
  isDownloadingUpdate: boolean;
  downloadProgress: number | null;
  updateReadyToInstall: boolean;
  updateReady: boolean;
  agentDriverUpdateCount: number;
  hasMcpUpdateAvailable: boolean;
  hasConnections: boolean;
  hasSqlFileConnections: boolean;

  // Layout / Sidebar / Panels
  sidebarOpen: boolean;
  sidebarWidth: number;
  isClassicLayout: boolean;
  isZenMode: boolean;
  isAiPanelMaximized: boolean;
  aiPanelWidth: number;
  aiPanelReady: boolean;
  historyWidth: number;
  sqlLibraryWidth: number;
  sqlFilePanelWidth: number;

  // Tabs / Content
  driverStoreTabOpen: boolean;
  driverStoreActive: boolean;
  driverStoreActiveTab: "agent" | "jdbc" | "storage" | "runtime";
  driverStoreFocus?: any;
  settingsPageTabOpen: boolean;
  settingsStore: any;
  settingsInitialTab: string;
  settingsInitialSection?: string;
  settingsNavigationRequestId: number;
  settingsAiConfigDraft?: any;
  settingsAiConfigRequestId: number;
  appVersion: string;
  detachedDropTargetTabId: string | null;
  isDesktop: boolean;
  tabBarWidth: number;
  tabBarCollapsed: boolean;
  activeTab?: QueryTab | null;
  activeConnection: any;
  executableSql: string;
  previewChangesAvailable: boolean;
  explainMode: "explain" | "autotrace";
  blockDangerousRedisCommands: boolean;
  databaseRequiredTabId: string | null;
  databaseRequiredSignal: number;
  activeOutputView: any;
  formatSqlRequest?: { id: number; tabId: string } | null;
  compressSqlRequest?: { id: number; tabId: string } | null;
  selectedSql: string;
  cursorPos: number;
  contentAreaRef: any;
  appSidebarRef: any;
  appTabBarRef: any;
  aiAssistantRef: any;
  connectionStats: any;
  recentConnections: any;
  savedSqlHistoryItems: any;
  updateNotificationsEnabled: boolean;
}>();

const emit = defineEmits<{
  // Toolbar Actions
  "new-connection": [];
  "new-query": [];
  "set-theme-mode": [mode: AppThemeMode];
  "toggle-ai": [];
  "toggle-history": [];
  "toggle-sql-library": [];
  "toggle-sql-file-panel": [];
  "open-github": [];
  "open-settings": [initialTab?: string];
  "open-driver-store": [focus?: string];
  "check-updates": [];
  "open-transfer": [];
  "open-sql-file": [];
  "open-schema-diff": [];
  "open-data-compare": [];

  // Sidebar Actions
  import: [source: "dbx" | "navicat" | "dbeaver" | "datagrip"];
  export: [];
  "start-sidebar-resize": [event: MouseEvent];
  "set-sidebar-open": [open: boolean];
  "add-to-ai": [nodes: TreeNode | TreeNode[]];

  // Tab Bar Actions
  "toggle-zen-mode": [];
  "activate-settings-page": [];
  "close-settings-page": [];
  "activate-driver-store": [];
  "close-driver-store": [];
  "locate-tab": [tab: QueryTab];
  "activate-tab": [];
  "save-tab": [tabId: string];
  "discard-tab-close": [];
  "save-all-tab-close": [];
  "discard-all-tab-close": [];
  "cancel-tab-close": [];
  "detach-tab": [tab: QueryTab];
  "start-tab-bar-resize": [event: MouseEvent];
  "toggle-tab-bar-collapse": [];

  // Surface updates
  "update:driver-store-active-tab": [tab: "agent" | "jdbc" | "storage" | "runtime"];
  "update-agent-driver-update-count": [count: number];

  // Editor Toolbar Actions
  "update:explain-mode": [mode: "explain" | "autotrace"];
  "update:block-dangerous-redis-commands": [value: boolean];
  "update:auto-commit": [value: boolean];
  commit: [];
  rollback: [];
  "dismiss-txn-rolled-back": [];
  "execute-pointer-down": [];
  execute: [options: any];
  "preview-changes": [];
  "multi-execute": [];
  cancel: [tabId?: string];
  explain: [tabId?: string];
  "format-sql": [tabId?: string];
  "compress-sql": [tabId?: string];
  "toggle-sql-keyword-case": [];
  "save-sql": [tabId?: string];
  "open-sql": [];
  "import-result-archive": [];
  "paste-sql-in-condition": [];
  "change-connection": [tabId: string, connectionId: string];
  "change-database": [tabId: string, database: string];
  "change-catalog": [tabId: string, catalog: string | undefined, database: string];
  "change-schema": [tabId: string, schema: string | undefined];
  "set-default-database": [tabId?: string];
  "clear-default-database": [tabId?: string];

  // Content Area Actions
  "update:active-output-view": [view: any];
  "fix-with-ai": [data: any];
  "send-selection-to-ai": [sql: string];
  "execute-in-new-result-tab": [options: any];
  "editor-update": [tabId: string, val: string];
  "editor-selection-change": [val: string];
  "editor-cursor-change": [pos: number];
  "preview-changes-available": [val: boolean];
  "editor-viewport-change": [tabId: string, viewport: any];
  "editor-selection-state-change": [tabId: string, selection: any];
  "editor-state-flushed": [tabId: string];
  "format-error": [];
  reload: [tabId: string, sql?: string, searchText?: string, whereInput?: string, orderBy?: string, limit?: number, offset?: number, intent?: any];
  paginate: [tabId: string, offset: number, limit: number, whereInput?: string, orderBy?: string];
  sort: [tabId: string, column: string, columnIndex: number, direction: "desc" | "asc" | null, whereInput?: string, mode?: any];
  "execute-sql": [tabId: string, sql: string];
  "click-table": [tabId: string, options: any];
  "view-table-data": [tabId: string, options: any];
  "edit-table-structure": [tabId: string, options: any];
  "view-table-ddl": [tabId: string, options: any];
  "open-object-source": [tabId: string, options: any, initialEditing?: boolean];
  "open-object-table": [tabId: string, target: any];
  "object-schema-change": [tabId: string, schema: string | undefined];
  "object-browser-viewport-change": [tabId: string, viewport: any];
  "object-browser-search-change": [tabId: string, query: string];
  "structure-editor-saved": [tabId: string, commentChanged: boolean];
  "structure-editor-close": [tabId: string];
  "open-connection-settings": [connectionId: string];
  "preview-statement": [tabId: string, range: any];
  "focus-statement": [tabId: string, range: any];

  // Welcome Screen Actions
  "open-connection-query": [connectionId: string];
  "open-saved-sql": [fileId: string];
  "open-mcp-guide": [];

  // Auxiliary Panels Resizes & Actions
  "start-ai-panel-resize": [event: MouseEvent];
  "start-history-resize": [event: MouseEvent];
  "start-sql-library-resize": [event: MouseEvent];
  "start-sql-file-panel-resize": [event: MouseEvent];
  "toggle-ai-maximize": [];
  "close-right-panel": [panelId: "ai" | "history" | "sqlLibrary" | "sqlFile"];
  "ai-append-sql": [sql: string];
  "ai-execute-sql": [sql: string];
  "ai-temp-run-sql": [sql: string];
  "ai-request-auto-execute-sql": [sql: string];
  "ai-route-redis-command": [command: string, execute: boolean];
  "ai-open-explain-plan": [data?: any];
  "restore-history-sql": [sql: string, entry: any];
  "analyze-history-ai": [item: any];
  "open-explain-plan": [];
}>();

const { t } = useI18n();
const connectionStore = useConnectionStore();
const queryStore = useQueryStore();
const customConnectionTabs = useCustomConnectionTabs();

const isOracleManualTransaction = computed(() => effectiveDatabaseTypeForConnection(props.activeConnection) === "oracle" && (props.activeTab?.autoCommit ?? true) === false);

const currentConnectionTabs = computed(() => {
  const connId = customConnectionTabs.activeConnectionId.value;
  if (!connId) return [];
  return queryStore.tabs.filter((t) => t.connectionId === connId);
});

const currentGroupId = computed(() => {
  return queryStore.focusedGroupId || "main";
});

function handleActivateTab(tabId: string) {
  if (!queryStore.activateTab(tabId)) {
    queryStore.activeTabId = tabId;
  }
  const currentConnId = customConnectionTabs.activeConnectionId.value;
  if (currentConnId) {
    customConnectionTabs.setLastActiveTab(currentConnId, tabId);
  }
  emit("activate-tab");
}

// Keep connectionStore.activeConnectionId in sync with custom active connection
watch(
  () => customConnectionTabs.activeConnectionId.value,
  (connId) => {
    if (connId && connectionStore.activeConnectionId !== connId) {
      connectionStore.activeConnectionId = connId;
    }
  },
  { immediate: true },
);

let previousTabsCount = queryStore.tabs.length;

// Sync active tab connection to connection tabs and remember last active tab
watch(
  () => [queryStore.activeTabId, props.activeTab?.connectionId, queryStore.tabs.length] as const,
  ([tabId, connId, currentTabsCount]) => {
    const wasTabClosed = currentTabsCount < previousTabsCount;
    previousTabsCount = currentTabsCount;

    const currentConnId = customConnectionTabs.activeConnectionId.value;

    if (tabId && connId) {
      if (currentConnId === connId) {
        // Active tab is within the current connection
        customConnectionTabs.setLastActiveTab(connId, tabId);
      } else {
        // Active tab belongs to a different connection
        if (wasTabClosed && currentConnId) {
          // A tab in current connection was closed, and queryStore fell back to a tab in another connection.
          // Stay in the current connection workspace:
          const remainingInCurrent = queryStore.tabs.filter((t) => t.connectionId === currentConnId);
          if (remainingInCurrent.length > 0) {
            const nextTab = remainingInCurrent[remainingInCurrent.length - 1]!;
            queryStore.activeTabId = nextTab.id;
            customConnectionTabs.setLastActiveTab(currentConnId, nextTab.id);
          } else {
            queryStore.activeTabId = null;
            customConnectionTabs.setLastActiveTab(currentConnId, null);
          }
          return;
        }

        // Explicit navigation to a tab in another connection (e.g. QuickOpen / TabSwitcher)
        if (!customConnectionTabs.openedConnectionIds.value.includes(connId)) {
          customConnectionTabs.openConnectionTab(connId);
        }
        customConnectionTabs.setLastActiveTab(connId, tabId);
        customConnectionTabs.activateConnectionTab(connId);
        connectionStore.activeConnectionId = connId;
      }
    } else if (!tabId && currentConnId) {
      customConnectionTabs.setLastActiveTab(currentConnId, null);
    }
  },
);

onMounted(() => {
  const activeConnId = customConnectionTabs.activeConnectionId.value;
  if (activeConnId) {
    connectionStore.activeConnectionId = activeConnId;
    const lastTabId = customConnectionTabs.getLastActiveTab(activeConnId);
    const matchingTab = (lastTabId ? queryStore.tabs.find((t) => t.id === lastTabId && t.connectionId === activeConnId) : null) || queryStore.tabs.find((t) => t.connectionId === activeConnId);

    if (matchingTab) {
      queryStore.activeTabId = matchingTab.id;
    } else if (props.activeTab && props.activeTab.connectionId !== activeConnId) {
      queryStore.activeTabId = null;
    }
  }
});

// When active connection changes, set active connection in store and pick last active or first matching tab
function handleActivateConnection(connId: string) {
  customConnectionTabs.activateConnectionTab(connId);
  connectionStore.activeConnectionId = connId;

  // Look for last active tab for this connection or first tab
  const lastTabId = customConnectionTabs.getLastActiveTab(connId);
  const matchingTab = (lastTabId ? queryStore.tabs.find((t) => t.id === lastTabId && t.connectionId === connId) : null) || queryStore.tabs.find((t) => t.connectionId === connId);

  if (matchingTab) {
    queryStore.activeTabId = matchingTab.id;
    customConnectionTabs.setLastActiveTab(connId, matchingTab.id);
  } else {
    queryStore.activeTabId = null;
  }
}

function findConnectionNode(nodes: TreeNode[], connectionId: string): TreeNode | null {
  for (const node of nodes) {
    if (node.type === "connection" && (node.connectionId === connectionId || node.id === connectionId)) return node;
    if (node.children) {
      const found = findConnectionNode(node.children, connectionId);
      if (found) return found;
    }
  }
  return null;
}

async function expandConnectionTree(connId: string) {
  try {
    let node = findConnectionNode(connectionStore.treeNodes, connId);
    if (!node) {
      await connectionStore.loadDatabases(connId);
      node = findConnectionNode(connectionStore.treeNodes, connId);
    }
    if (node) {
      node.isExpanded = true;
      await connectionStore.loadTreeNodeChildren(node);
    } else {
      await connectionStore.loadDatabases(connId);
    }
  } catch (e: any) {
    console.warn("[DBX] Failed to auto-expand connection tree:", e);
  }
}

function handleOpenConnection(connId: string) {
  const isNewTab = !customConnectionTabs.openedConnectionIds.value.includes(connId);
  customConnectionTabs.openConnectionTab(connId);
  handleActivateConnection(connId);

  if (isNewTab) {
    const existingTabs = queryStore.tabs.filter((t) => t.connectionId === connId);
    if (existingTabs.length === 0) {
      emit("open-connection-query", connId);
    }
    void expandConnectionTree(connId);
  }
}

const showCloseConnectionConfirm = ref(false);
const pendingCloseConnectionId = ref<string | null>(null);
const dirtyConnectionTabs = ref<QueryTab[]>([]);
const pendingCloseConnectionName = computed(() => {
  if (!pendingCloseConnectionId.value) return "";
  return connectionStore.getConfig(pendingCloseConnectionId.value)?.name || pendingCloseConnectionId.value;
});

function isConnectionTabDirty(tab: QueryTab): boolean {
  if (queryStore.isTabDirty(tab)) return true;
  if (tab.pendingDataChangeCount && tab.pendingDataChangeCount > 0) return true;
  if (tab.hasPendingDataEditorDraft) return true;
  if (tab.txnSessionId) return true;
  if (hasDataGridPendingChangesForTab(tab.id)) return true;
  return false;
}

function dirtyReasonDescription(tab: QueryTab): string {
  if (tab.txnSessionId) {
    return t("toolbar.manualTransaction") || "事务未提交";
  }
  if ((tab.pendingDataChangeCount && tab.pendingDataChangeCount > 0) || tab.hasPendingDataEditorDraft || hasDataGridPendingChangesForTab(tab.id)) {
    return t("grid.pendingChanges", { count: tab.pendingDataChangeCount || 1 }) || "数据未提交";
  }
  if (tab.mode === "structure") {
    return "表结构未保存";
  }
  return t("editor.unsavedChangesTitle") || "未保存更改";
}

function getDirtyTabsForConnection(connId: string): QueryTab[] {
  return queryStore.tabs.filter((t) => t.connectionId === connId && isConnectionTabDirty(t));
}

function handleCloseConnection(connId: string) {
  const dirtyTabs = getDirtyTabsForConnection(connId);
  if (dirtyTabs.length > 0) {
    pendingCloseConnectionId.value = connId;
    dirtyConnectionTabs.value = dirtyTabs;
    showCloseConnectionConfirm.value = true;
    return;
  }
  executeCloseConnection(connId);
}

function confirmDiscardAndCloseConnection() {
  if (!pendingCloseConnectionId.value) return;
  const connId = pendingCloseConnectionId.value;
  showCloseConnectionConfirm.value = false;
  pendingCloseConnectionId.value = null;
  dirtyConnectionTabs.value = [];
  executeCloseConnection(connId);
}

function cancelCloseConnection() {
  showCloseConnectionConfirm.value = false;
  pendingCloseConnectionId.value = null;
  dirtyConnectionTabs.value = [];
}

function executeCloseConnection(connId: string) {
  queryStore.closeConnectionTabs(connId, { force: true });
  customConnectionTabs.closeConnectionTab(connId);
  if (customConnectionTabs.activeConnectionId.value) {
    handleActivateConnection(customConnectionTabs.activeConnectionId.value);
  } else {
    connectionStore.activeConnectionId = null;
    queryStore.activeTabId = null;
  }
}

function handleNewConnection() {
  emit("new-connection");
}

function handleOpenConnectionFromWelcome(connId: string) {
  customConnectionTabs.openConnectionTab(connId);
  handleActivateConnection(connId);
  emit("open-connection-query", connId);
  void expandConnectionTree(connId);
}

// Single tab & batch close confirm state
const closeConfirmDirtyCount = computed(() => queryStore.closeConfirmDirtyTabIds.length);
const showCloseConfirmBulkActions = computed(() => closeConfirmDirtyCount.value > 1);
const closeConfirmDirtyTabs = computed(() => queryStore.closeConfirmDirtyTabIds.map((id) => queryStore.tabs.find((tab) => tab.id === id)).filter((tab): tab is NonNullable<ReturnType<typeof queryStore.tabs.find>> => !!tab));
const closeConfirmCurrentTitle = computed(() => {
  const focusedTab = closeConfirmDirtyTabs.value.find((tab) => tab.id === queryStore.pendingCloseTabId) ?? closeConfirmDirtyTabs.value[0];
  return focusedTab ? tabDisplayTitle(focusedTab, t) : "";
});
const closeConfirmMessage = computed(() => {
  const params = {
    count: closeConfirmDirtyCount.value,
    title: closeConfirmCurrentTitle.value,
  };
  if (closeConfirmDirtyCount.value > 1) {
    if (queryStore.closeConfirmContext === "app") {
      return t("editor.unsavedChangesAppCloseMultipleMessage", params);
    }
    return t("editor.unsavedChangesBatchCloseMultipleMessage", params);
  }
  if (queryStore.closeConfirmContext === "app") {
    return t("editor.unsavedChangesAppCloseMessage", params);
  }
  return t("editor.unsavedChangesMessage", params);
});
const closeConfirmListOpen = ref(false);
let closeConfirmListCloseTimer: ReturnType<typeof setTimeout> | null = null;
function openCloseConfirmList() {
  if (closeConfirmListCloseTimer) {
    clearTimeout(closeConfirmListCloseTimer);
    closeConfirmListCloseTimer = null;
  }
  closeConfirmListOpen.value = true;
}

function scheduleCloseConfirmListClose() {
  if (closeConfirmListCloseTimer) {
    clearTimeout(closeConfirmListCloseTimer);
  }
  closeConfirmListCloseTimer = setTimeout(() => {
    closeConfirmListOpen.value = false;
    closeConfirmListCloseTimer = null;
  }, 120);
}

onUnmounted(() => {
  if (closeConfirmListCloseTimer) {
    clearTimeout(closeConfirmListCloseTimer);
    closeConfirmListCloseTimer = null;
  }
});

watch(
  () => queryStore.showCloseConfirm,
  (open) => {
    if (!open) {
      closeConfirmListOpen.value = false;
    }
  },
);

function handleSaveAndClose() {
  const id = queryStore.saveAndClosePendingTab();
  if (id) {
    emit("save-tab", id);
  }
}

function handleDiscardAndClose() {
  queryStore.forceClosePendingTab();
  emit("discard-tab-close");
}

function handleSaveAllAndClose() {
  emit("save-all-tab-close");
}

function handleDiscardAllAndClose() {
  queryStore.forceCloseAllPendingTabs();
  emit("discard-all-tab-close");
}

function handleCancelClose() {
  queryStore.cancelClosePendingTab();
  emit("cancel-tab-close");
}

function closeOtherActiveTabs() {
  const activeTabId = queryStore.activeTabId;
  if (!activeTabId) return;
  const currentConnId = customConnectionTabs.activeConnectionId.value;
  if (currentConnId) {
    const tabsToClose = queryStore.tabs.filter((t) => t.connectionId === currentConnId && t.id !== activeTabId).map((t) => t.id);
    if (tabsToClose.length > 0) {
      queryStore.closeTabsByIds(tabsToClose, activeTabId);
    }
  } else {
    queryStore.closeOtherTabs(activeTabId);
  }
}

onMounted(() => {
  if (props.appTabBarRef && typeof props.appTabBarRef === "object" && "value" in props.appTabBarRef) {
    props.appTabBarRef.value = { closeOtherActiveTabs };
  }
});

defineExpose({ closeOtherActiveTabs });
</script>

<template>
  <div class="custom-sqlyog-layout h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
    <!-- Top Toolbar -->
    <AppToolbar
      :is-dark="isDark"
      :theme-mode="themeMode"
      :show-ai-panel="showAiPanel"
      :active-ai-run-count="activeAiRunCount"
      :awaiting-ai-run-count="awaitingAiRunCount"
      :show-history="showHistory"
      :show-sql-library="showSqlLibrary"
      :sql-library-save-feedback-id="sqlLibrarySaveFeedbackId"
      :show-sql-file-panel="showSqlFilePanel"
      :show-driver-store="showDriverStore"
      :show-settings-page="showSettingsPage"
      :checking-updates="checkingUpdates"
      :has-update-available="hasUpdateAvailable"
      :is-downloading-update="isDownloadingUpdate"
      :download-progress="downloadProgress"
      :update-ready-to-install="updateReadyToInstall"
      :update-ready="updateReady"
      :agent-driver-update-count="agentDriverUpdateCount"
      :has-mcp-update-available="hasMcpUpdateAvailable"
      :has-connections="hasConnections"
      :has-sql-file-connections="hasSqlFileConnections"
      @new-connection="emit('new-connection')"
      @new-query="emit('new-query')"
      @set-theme-mode="emit('set-theme-mode', $event)"
      @toggle-ai="emit('toggle-ai')"
      @toggle-history="emit('toggle-history')"
      @toggle-sql-library="emit('toggle-sql-library')"
      @toggle-sql-file-panel="emit('toggle-sql-file-panel')"
      @open-github="emit('open-github')"
      @open-settings="emit('open-settings', $event)"
      @open-driver-store="emit('open-driver-store', $event)"
      @check-updates="emit('check-updates')"
      @open-transfer="emit('open-transfer')"
      @open-sql-file="emit('open-sql-file')"
      @open-schema-diff="emit('open-schema-diff')"
      @open-data-compare="emit('open-data-compare')"
    />

    <!-- SQLyog Level 1: Connection Tabs Bar -->
    <CustomConnectionTabBar
      :opened-connection-ids="customConnectionTabs.openedConnectionIds.value"
      :active-connection-id="customConnectionTabs.activeConnectionId.value"
      @activate-connection="handleActivateConnection"
      @close-connection="handleCloseConnection"
      @open-connection="handleOpenConnection"
      @new-connection="handleNewConnection"
    />

    <!-- Main Workspace -->
    <div class="flex-1 flex min-h-0 relative overflow-hidden bg-background">
      <!-- Left: Connection Object Tree Sidebar -->
      <AppSidebar
        v-if="customConnectionTabs.activeConnectionId.value"
        v-show="sidebarOpen && !isZenMode"
        :ref="appSidebarRef"
        :sidebar-width="sidebarWidth"
        :classic-layout="true"
        :focused-connection-id="customConnectionTabs.activeConnectionId.value"
        @import="emit('import', $event)"
        @export="emit('export')"
        @start-resize="emit('start-sidebar-resize', $event)"
        @collapse="emit('set-sidebar-open', false)"
        @open-settings="(tab) => emit('open-settings', tab)"
        @add-to-ai="(nodes) => emit('add-to-ai', nodes)"
      />

      <!-- Collapsed Sidebar Strip -->
      <div v-if="customConnectionTabs.activeConnectionId.value" v-show="!sidebarOpen && !isZenMode" class="flex h-full w-8 shrink-0 items-start justify-center border-r bg-background/80 pt-2">
        <Button variant="ghost" size="icon" class="h-7 w-7" :title="t('sidebar.expand')" :aria-label="t('sidebar.expand')" @click="emit('set-sidebar-open', true)">
          <ChevronsRight class="h-4 w-4" />
        </Button>
      </div>

      <!-- Center: Main Workspace / Tabs / Welcome -->
      <div v-show="!isAiPanelMaximized || isZenMode" class="flex-1 min-w-0 flex flex-col overflow-hidden bg-background">
        <!-- Level 2: Query & Table Tabs Bar -->
        <div v-if="customConnectionTabs.activeConnectionId.value && currentConnectionTabs.length > 0" class="flex items-center w-full min-w-0 border-b border-border/70 bg-muted/40">
          <div class="flex-1 min-w-0">
            <EditorGroupTabBar
              :group-id="currentGroupId"
              :tabs="currentConnectionTabs"
              :active-tab-id="props.activeTab?.id ?? null"
              :can-detach-tabs="isDesktop"
              :detached-drop-target="detachedDropTargetTabId !== null"
              :tab-bar-width="tabBarWidth"
              :tab-bar-collapsed="tabBarCollapsed"
              @activate-tab="handleActivateTab"
              @locate-tab="emit('locate-tab', $event)"
              @toggle-zen-mode="emit('toggle-zen-mode')"
              @start-resize="emit('start-tab-bar-resize', $event)"
              @toggle-collapse="emit('toggle-tab-bar-collapse')"
              @detach-tab="emit('detach-tab', $event)"
            >
              <template #after-tabs>
                <button
                  type="button"
                  class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground self-center ml-1 cursor-pointer transition-colors"
                  :title="t('toolbar.newQuery')"
                  :aria-label="t('toolbar.newQuery')"
                  @pointerdown.stop
                  @click="emit('new-query')"
                >
                  <Plus class="h-3.5 w-3.5" />
                </button>
              </template>
            </EditorGroupTabBar>
          </div>
        </div>

        <!-- Query Workspace (when activeTab is open) -->
        <div v-if="activeTab" class="flex flex-col flex-1 min-h-0">
          <EditorToolbar
            v-if="activeTab.mode === 'query'"
            :active-tab="activeTab"
            :active-connection="activeConnection"
            :executable-sql="executableSql"
            :can-preview-changes="previewChangesAvailable"
            :explain-mode="explainMode"
            :block-dangerous-redis-commands="blockDangerousRedisCommands"
            :sql-keyword-case="settingsStore.editorSettings.sqlFormatter.keywordCase"
            :database-required-signal="databaseRequiredTabId === activeTab.id ? databaseRequiredSignal : 0"
            :auto-commit="activeTab.autoCommit ?? true"
            :txn-session-id="activeTab?.txnSessionId"
            :txn-auto-rolled-back="activeTab?.txnAutoRolledBack"
            :oracle-txn-possibly-dirty="activeTab?.oracleTxnPossiblyDirty"
            :is-oracle-manual-transaction="isOracleManualTransaction"
            @update:explain-mode="emit('update:explain-mode', $event)"
            @update:block-dangerous-redis-commands="emit('update:block-dangerous-redis-commands', $event)"
            @update:auto-commit="emit('update:auto-commit', $event)"
            @commit="emit('commit')"
            @rollback="emit('rollback')"
            @dismiss-txn-rolled-back="emit('dismiss-txn-rolled-back')"
            @execute-pointer-down="emit('execute-pointer-down')"
            @toolbar-execute="emit('execute', $event)"
            @preview-changes="emit('preview-changes')"
            @multi-execute="emit('multi-execute')"
            @cancel="activeTab && emit('cancel', activeTab.id)"
            @explain="activeTab && emit('explain', activeTab.id)"
            @format-sql="activeTab && emit('format-sql', activeTab.id)"
            @compress-sql="activeTab && emit('compress-sql', activeTab.id)"
            @toggle-sql-keyword-case="emit('toggle-sql-keyword-case')"
            @save-sql="(tabId) => emit('save-sql', tabId)"
            @open-sql="emit('open-sql')"
            @import-result-archive="emit('import-result-archive')"
            @paste-sql-in-condition="emit('paste-sql-in-condition')"
            @change-connection="(connId) => activeTab && emit('change-connection', activeTab.id, connId)"
            @change-database="(db) => activeTab && emit('change-database', activeTab.id, db)"
            @change-catalog="(catalog, database) => activeTab && emit('change-catalog', activeTab.id, catalog, database)"
            @change-schema="(schema) => activeTab && emit('change-schema', activeTab.id, schema)"
            @set-default-database="activeTab && emit('set-default-database', activeTab.id)"
            @clear-default-database="activeTab && emit('clear-default-database', activeTab.id)"
          />
          <KeepAlive :max="4">
            <ContentArea
              :key="activeTab.id"
              :ref="
                (el: any) => {
                  if (contentAreaRef && typeof contentAreaRef === 'object' && 'value' in contentAreaRef) contentAreaRef.value = el;
                }
              "
              :active-tab="activeTab"
              :active-connection="activeConnection"
              :executable-sql="executableSql"
              :active-output-view="activeOutputView"
              :format-sql-request="formatSqlRequest ?? null"
              :compress-sql-request="compressSqlRequest ?? null"
              :selected-sql="selectedSql"
              :cursor-pos="cursorPos"
              :block-dangerous-redis-commands="blockDangerousRedisCommands"
              :zen-mode="isZenMode"
              @update:active-output-view="(_tabId, view) => emit('update:active-output-view', view)"
              @fix-with-ai="(_tabId, err) => emit('fix-with-ai', err)"
              @send-selection-to-ai="(_tabId, sql) => emit('send-selection-to-ai', sql)"
              @execute="(_tabId, opts) => emit('execute', opts)"
              @execute-in-new-result-tab="(_tabId, opts) => emit('execute-in-new-result-tab', opts)"
              @cancel="(tabId) => emit('cancel', tabId)"
              @explain="(tabId) => emit('explain', tabId)"
              @editor-update="(id, val) => emit('editor-update', id, val)"
              @editor-selection-change="(_tabId, val) => emit('editor-selection-change', val)"
              @editor-cursor-change="(_tabId, pos) => emit('editor-cursor-change', pos)"
              @preview-changes-available="(_tabId, val) => emit('preview-changes-available', val)"
              @editor-viewport-change="(id, vp) => emit('editor-viewport-change', id, vp)"
              @editor-selection-state-change="(id, sel) => emit('editor-selection-state-change', id, sel)"
              @editor-state-flushed="(id) => emit('editor-state-flushed', id)"
              @format-error="(_tabId) => emit('format-error')"
              @save-sql="(tabId) => emit('save-sql', tabId)"
              @reload="(tabId, ...args) => emit('reload', tabId, ...args)"
              @paginate="(tabId, ...args) => emit('paginate', tabId, ...args)"
              @sort="(tabId, ...args) => emit('sort', tabId, ...args)"
              @execute-sql="(tabId, sql) => emit('execute-sql', tabId, sql)"
              @click-table="(tabId, opts) => emit('click-table', tabId, opts)"
              @view-table-data="(tabId, opts) => emit('view-table-data', tabId, opts)"
              @edit-table-structure="(tabId, opts) => emit('edit-table-structure', tabId, opts)"
              @view-table-ddl="(tabId, opts) => emit('view-table-ddl', tabId, opts)"
              @open-object-source="(tabId, opts, init) => emit('open-object-source', tabId, opts, init)"
              @open-object-table="(tabId, target) => emit('open-object-table', tabId, target)"
              @object-schema-change="(tabId, schema) => emit('object-schema-change', tabId, schema)"
              @object-browser-viewport-change="(tabId, vp) => emit('object-browser-viewport-change', tabId, vp)"
              @object-browser-search-change="(tabId, query) => emit('object-browser-search-change', tabId, query)"
              @structure-editor-saved="(tabId, changed) => emit('structure-editor-saved', tabId, changed)"
              @structure-editor-close="(tabId) => emit('structure-editor-close', tabId)"
              @preview-statement="(tabId, range) => emit('preview-statement', tabId, range)"
              @focus-statement="(tabId, range) => emit('focus-statement', tabId, range)"
              @open-settings="(t) => emit('open-settings', t)"
              @open-connection-settings="(connId) => emit('open-connection-settings', connId)"
              @toggle-zen-mode="emit('toggle-zen-mode')"
            />
          </KeepAlive>
        </div>

        <!-- WelcomeScreen (when no tabs open) -->
        <WelcomeScreen
          v-else
          :connection-stats="connectionStats"
          :recent-connections="recentConnections"
          :saved-sql-history-items="savedSqlHistoryItems"
          :app-version="appVersion"
          :has-connections="hasConnections"
          @open-connection-query="handleOpenConnectionFromWelcome"
          @open-saved-sql="emit('open-saved-sql', $event)"
          @new-connection="emit('new-connection')"
          @new-query="emit('new-query')"
          @show-history="emit('toggle-history')"
          @import-config="emit('import', 'dbx')"
          @open-github="emit('open-github')"
          @open-mcp-guide="emit('open-mcp-guide')"
        />
      </div>

      <!-- Right Side Auxiliary Panels -->
      <!-- AI Assistant -->
      <div v-if="showAiPanel" v-show="!isZenMode" class="h-full relative z-30 isolate bg-background border-l border-border/80" :class="isAiPanelMaximized ? 'min-w-0 flex-1' : 'min-w-[180px] max-w-full'" :style="isAiPanelMaximized ? {} : { width: aiPanelWidth + 'px' }">
        <div v-if="!isAiPanelMaximized" class="panel-resize-handle panel-resize-handle--left" @mousedown="emit('start-ai-panel-resize', $event)" />
        <div class="h-full min-h-0 overflow-hidden">
          <AiAssistant
            v-if="aiPanelReady"
            :ref="aiAssistantRef"
            :tab="activeTab ?? undefined"
            :connection="activeConnection"
            :maximized="isAiPanelMaximized"
            @append-sql="emit('ai-append-sql', $event)"
            @execute-sql="emit('ai-execute-sql', $event)"
            @temp-run-sql="emit('ai-temp-run-sql', $event)"
            @request-auto-execute-sql="emit('ai-request-auto-execute-sql', $event)"
            @insert-redis-command="(cmd) => emit('ai-route-redis-command', cmd, false)"
            @execute-redis-command="(cmd) => emit('ai-route-redis-command', cmd, true)"
            @open-explain-plan="emit('ai-open-explain-plan', $event)"
            @toggle-maximize="emit('toggle-ai-maximize')"
            @close="emit('close-right-panel', 'ai')"
          />
        </div>
      </div>

      <!-- History -->
      <div v-if="showHistory" v-show="!isAiPanelMaximized && !isZenMode" class="h-full shrink-0 relative z-30 isolate bg-background border-l border-border/80" :style="{ width: historyWidth + 'px' }">
        <div class="panel-resize-handle panel-resize-handle--left" @mousedown="emit('start-history-resize', $event)" />
        <div class="h-full min-h-0 overflow-hidden">
          <QueryHistory :current-connection-id="activeTab?.connectionId" :current-database="activeTab?.database" @restore="(sql, entry) => emit('restore-history-sql', sql, entry)" @analyze-ai="emit('analyze-history-ai', $event)" @close="emit('close-right-panel', 'history')" />
        </div>
      </div>

      <!-- SQL Library -->
      <div v-if="showSqlLibrary" v-show="!isAiPanelMaximized && !isZenMode" class="h-full shrink-0 relative z-30 isolate bg-background border-l border-border/80" :style="{ width: sqlLibraryWidth + 'px' }">
        <div class="panel-resize-handle panel-resize-handle--left" @mousedown="emit('start-sql-library-resize', $event)" />
        <div class="h-full min-h-0 overflow-hidden">
          <SqlLibraryPanel @close="emit('close-right-panel', 'sqlLibrary')" />
        </div>
      </div>

      <!-- SQL Files -->
      <div v-if="showSqlFilePanel" v-show="!isAiPanelMaximized && !isZenMode" class="h-full shrink-0 relative z-30 isolate bg-background border-l border-border/80" :style="{ width: sqlFilePanelWidth + 'px' }">
        <div class="panel-resize-handle panel-resize-handle--left" @mousedown="emit('start-sql-file-panel-resize', $event)" />
        <div class="h-full min-h-0 overflow-hidden">
          <SqlFilePanel @close="emit('close-right-panel', 'sqlFile')" />
        </div>
      </div>
    </div>

    <!-- Confirm Dialog for Closing Connection with Dirty Tabs -->
    <Dialog
      :open="showCloseConnectionConfirm"
      @update:open="
        (open) => {
          if (!open) cancelCloseConnection();
        }
      "
    >
      <DialogContent class="min-w-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 text-base font-semibold">
            <AlertTriangle class="h-5 w-5 text-amber-500 shrink-0" />
            <span>{{ t("editor.unsavedChangesTitle") || "未保存更改" }}</span>
          </DialogTitle>
        </DialogHeader>

        <div class="space-y-3 py-1">
          <p class="text-sm text-muted-foreground leading-relaxed">
            连接 <span class="font-semibold text-foreground">「{{ pendingCloseConnectionName }}」</span> 下存在 <span class="font-semibold text-destructive">{{ dirtyConnectionTabs.length }}</span> 个未保存或未提交的页面。关闭连接将丢弃所有未保存的内容并回滚事务。确定要关闭吗？
          </p>

          <div class="max-h-52 min-h-0 overflow-y-auto rounded-md border border-border/60 bg-muted/30 p-2 space-y-1">
            <div v-for="tab in dirtyConnectionTabs" :key="tab.id" class="flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded-md bg-background/80 border border-border/40">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <Table2 v-if="tab.mode === 'data' || tab.mode === 'structure'" class="h-4 w-4 shrink-0 text-muted-foreground" />
                <FileCode v-else class="h-4 w-4 shrink-0 text-muted-foreground" />
                <span class="truncate font-medium text-foreground">{{ tabDisplayTitle(tab, t) }}</span>
              </div>
              <span class="shrink-0 text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                {{ dirtyReasonDescription(tab) }}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter class="gap-2 sm:gap-0">
          <Button variant="outline" @click="cancelCloseConnection">
            {{ t("common.cancel") || "取消" }}
          </Button>
          <Button variant="destructive" @click="confirmDiscardAndCloseConnection"> 放弃更改并关闭 </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Confirm Dialog for Closing Unsaved Tab -->
    <Dialog
      :open="queryStore.showCloseConfirm"
      @update:open="
        (open) => {
          if (!open) queryStore.cancelClosePendingTab();
        }
      "
    >
      <DialogContent class="min-w-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <AlertTriangle class="h-5 w-5 text-amber-500" />
            {{ t("editor.unsavedChangesTitle") }}
          </DialogTitle>
        </DialogHeader>
        <div class="max-h-120 min-h-0 min-w-0 overflow-y-auto space-y-2">
          <p class="wrap-anywhere text-sm text-muted-foreground">{{ closeConfirmMessage }}</p>
          <Popover v-if="showCloseConfirmBulkActions" :open="closeConfirmListOpen" @update:open="closeConfirmListOpen = $event">
            <PopoverTrigger as-child>
              <button
                type="button"
                class="inline-flex items-center text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                @mouseenter="openCloseConfirmList"
                @mouseleave="scheduleCloseConfirmListClose"
              >
                {{ t("editor.unsavedChangesViewList", { count: closeConfirmDirtyCount }) }}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" side="bottom" class="w-72 max-w-[calc(100vw-2rem)] gap-1 p-2" @mouseenter="openCloseConfirmList" @mouseleave="scheduleCloseConfirmListClose" @pointerdown.stop @click.stop @keydown.stop>
              <div class="px-2 pb-1 text-xs font-medium text-muted-foreground">
                {{ t("editor.unsavedChangesListTitle", { count: closeConfirmDirtyCount }) }}
              </div>
              <div class="max-h-48 overflow-y-auto">
                <div v-for="tab in closeConfirmDirtyTabs" :key="tab.id" class="flex min-w-0 items-center gap-2 rounded-[6px] px-2 py-1.5 text-sm" :class="tab.id === queryStore.pendingCloseTabId ? 'bg-muted text-foreground' : 'text-muted-foreground'">
                  <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="tab.id === queryStore.pendingCloseTabId ? 'bg-foreground' : 'bg-muted-foreground/50'" />
                  <span class="min-w-0 truncate">
                    {{ tabDisplayTitle(tab, t) }}
                  </span>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <DialogFooter class="min-w-0 sm:flex-wrap">
          <Button variant="outline" @click="handleCancelClose">{{ t("common.cancel") }}</Button>
          <Button v-if="showCloseConfirmBulkActions" variant="secondary" class="border-border" @click="handleDiscardAllAndClose">{{ t("editor.discardAllChanges") }}</Button>
          <Button v-if="showCloseConfirmBulkActions" @click="handleSaveAllAndClose">{{ t("editor.saveAllChanges") }}</Button>
          <Button variant="secondary" class="border-border" @click="handleDiscardAndClose">{{ t("editor.discardChanges") }}</Button>
          <Button @click="handleSaveAndClose">{{ t("savedSql.save") }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
