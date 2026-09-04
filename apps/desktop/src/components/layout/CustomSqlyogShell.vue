<script setup lang="ts">
import { watch } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronsRight } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import AppToolbar from "@/components/layout/AppToolbar.vue";
import CustomConnectionTabBar from "@/components/layout/CustomConnectionTabBar.vue";
import AppSidebar from "@/components/layout/AppSidebar.vue";
import AppTabBar from "@/components/layout/AppTabBar.vue";
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
  isOracleManualTransaction: boolean;
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
  cancel: [];
  explain: [];
  "format-sql": [];
  "compress-sql": [];
  "toggle-sql-keyword-case": [];
  "save-sql": [];
  "open-sql": [];
  "import-result-archive": [data: any];
  "paste-sql-in-condition": [];
  "change-connection": [connectionId: string];
  "change-database": [database: string];
  "change-catalog": [catalog: string | undefined, database: string];
  "change-schema": [schema: string | undefined];
  "set-default-database": [];
  "clear-default-database": [];

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
  "format-error": [];
  reload: [sql?: string, searchText?: string, whereInput?: string, orderBy?: string, limit?: number, offset?: number, intent?: any];
  paginate: [offset: number, limit: number, whereInput?: string, orderBy?: string];
  sort: [column: string, columnIndex: number, direction: "desc" | "asc" | null, whereInput?: string, mode?: any];
  "execute-sql": [sql: string];
  "click-table": [options: any];
  "view-table-data": [options: any];
  "edit-table-structure": [options: any];
  "view-table-ddl": [options: any];
  "open-object-source": [options: any];
  "open-object-table": [target: any];
  "object-schema-change": [schema: string | undefined];
  "object-browser-viewport-change": [tabId: string, viewport: any];
  "structure-editor-saved": [commentChanged: boolean];
  "structure-editor-close": [];
  "open-connection-settings": [connectionId: string];

  // Welcome Screen Actions
  "open-connection-query": [connectionId: string];
  "open-saved-sql": [item: any];
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
  "ai-open-explain-plan": [data: any];
  "restore-history-sql": [item: any];
  "analyze-history-ai": [item: any];
}>();

const { t } = useI18n();
const connectionStore = useConnectionStore();
const queryStore = useQueryStore();
const customConnectionTabs = useCustomConnectionTabs();

// Sync active tab connection to connection tabs and remember last active tab
watch(
  () => [queryStore.activeTabId, props.activeTab?.connectionId] as const,
  ([tabId, connId]) => {
    if (tabId && connId) {
      if (!customConnectionTabs.openedConnectionIds.value.includes(connId)) {
        customConnectionTabs.openConnectionTab(connId);
      }
      customConnectionTabs.setLastActiveTab(connId, tabId);
      if (customConnectionTabs.activeConnectionId.value !== connId) {
        customConnectionTabs.activateConnectionTab(connId);
        connectionStore.activeConnectionId = connId;
      }
    }
  },
);

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

function handleOpenConnection(connId: string) {
  customConnectionTabs.openConnectionTab(connId);
  handleActivateConnection(connId);
}

function handleCloseConnection(connId: string) {
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
  emit("open-connection-query", connId);
}
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
        <!-- Level 2: Query Tabs Bar -->
        <AppTabBar
          v-if="customConnectionTabs.activeConnectionId.value"
          :ref="appTabBarRef"
          :connection-id="customConnectionTabs.activeConnectionId.value"
          :driver-store-open="false"
          :driver-store-active="false"
          :settings-page-open="false"
          :settings-page-active="false"
          :agent-driver-update-count="agentDriverUpdateCount"
          :detached-drop-target="detachedDropTargetTabId !== null"
          :can-detach-tabs="isDesktop"
          :tab-bar-width="tabBarWidth"
          :tab-bar-collapsed="tabBarCollapsed"
          @toggle-zen-mode="emit('toggle-zen-mode')"
          @activate-driver-store="emit('open-driver-store')"
          @activate-settings-page="emit('open-settings')"
          @locate-tab="emit('locate-tab', $event)"
          @activate-tab="emit('activate-tab')"
          @close-driver-store="emit('close-driver-store')"
          @close-settings-page="emit('close-settings-page')"
          @save-tab="emit('save-tab', $event)"
          @discard-tab-close="emit('discard-tab-close')"
          @save-all-tab-close="emit('save-all-tab-close')"
          @discard-all-tab-close="emit('discard-all-tab-close')"
          @cancel-tab-close="emit('cancel-tab-close')"
          @detach-tab="emit('detach-tab', $event)"
          @start-resize="emit('start-tab-bar-resize', $event)"
          @toggle-collapse="emit('toggle-tab-bar-collapse')"
        />

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
            @execute="emit('execute', $event)"
            @preview-changes="emit('preview-changes')"
            @multi-execute="emit('multi-execute')"
            @cancel="emit('cancel')"
            @explain="emit('explain')"
            @format-sql="emit('format-sql')"
            @compress-sql="emit('compress-sql')"
            @toggle-sql-keyword-case="emit('toggle-sql-keyword-case')"
            @save-sql="emit('save-sql')"
            @open-sql="emit('open-sql')"
            @import-result-archive="emit('import-result-archive', $event)"
            @paste-sql-in-condition="emit('paste-sql-in-condition')"
            @change-connection="emit('change-connection', $event)"
            @change-database="emit('change-database', $event)"
            @change-catalog="(catalog, database) => emit('change-catalog', catalog, database)"
            @change-schema="emit('change-schema', $event)"
            @set-default-database="emit('set-default-database')"
            @clear-default-database="emit('clear-default-database')"
          />
          <KeepAlive :max="4">
            <ContentArea
              :key="activeTab.id"
              :ref="contentAreaRef"
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
              @update:active-output-view="emit('update:active-output-view', $event)"
              @fix-with-ai="emit('fix-with-ai', $event)"
              @send-selection-to-ai="emit('send-selection-to-ai', $event)"
              @execute="emit('execute', $event)"
              @execute-in-new-result-tab="emit('execute-in-new-result-tab', $event)"
              @cancel="emit('cancel')"
              @explain="emit('explain')"
              @editor-update="(id, val) => emit('editor-update', id, val)"
              @editor-selection-change="(val) => emit('editor-selection-change', val)"
              @editor-cursor-change="(pos) => emit('editor-cursor-change', pos)"
              @preview-changes-available="(val) => emit('preview-changes-available', val)"
              @editor-viewport-change="(id, vp) => emit('editor-viewport-change', id, vp)"
              @editor-selection-state-change="(id, sel) => emit('editor-selection-state-change', id, sel)"
              @format-error="emit('format-error')"
              @save-sql="emit('save-sql')"
              @reload="(...args) => emit('reload', ...args)"
              @paginate="(...args) => emit('paginate', ...args)"
              @sort="(...args) => emit('sort', ...args)"
              @execute-sql="(sql) => emit('execute-sql', sql)"
              @click-table="(opts) => emit('click-table', opts)"
              @view-table-data="(opts) => emit('view-table-data', opts)"
              @edit-table-structure="(opts) => emit('edit-table-structure', opts)"
              @view-table-ddl="(opts) => emit('view-table-ddl', opts)"
              @open-object-source="(opts) => emit('open-object-source', opts)"
              @open-object-table="(target) => emit('open-object-table', target)"
              @object-schema-change="(schema) => emit('object-schema-change', schema)"
              @object-browser-viewport-change="(id, vp) => emit('object-browser-viewport-change', id, vp)"
              @structure-editor-saved="(changed) => emit('structure-editor-saved', changed)"
              @structure-editor-close="emit('structure-editor-close')"
              @open-settings="(t) => emit('open-settings', t)"
              @open-connection-settings="emit('open-connection-settings', $event)"
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
          <QueryHistory :current-connection-id="activeTab?.connectionId" :current-database="activeTab?.database" @restore="emit('restore-history-sql', $event)" @analyze-ai="emit('analyze-history-ai', $event)" @close="emit('close-right-panel', 'history')" />
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
  </div>
</template>
