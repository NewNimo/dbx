<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Plus, X, Server, Database, PlusCircle } from "@lucide/vue";
import DatabaseIcon from "@/components/icons/DatabaseIcon.vue";
import { useConnectionStore } from "@/stores/connectionStore";
import LightDropdown from "@/components/ui/LightDropdown.vue";
import type { ConnectionConfig } from "@/types/database";

const props = defineProps<{
  openedConnectionIds: string[];
  activeConnectionId: string | null;
}>();

const emit = defineEmits<{
  "activate-connection": [id: string];
  "close-connection": [id: string];
  "open-connection": [id: string];
  "new-connection": [];
}>();

const { t } = useI18n();
const connectionStore = useConnectionStore();

const connectionMap = computed(() => {
  const map = new Map<string, ConnectionConfig>();
  for (const conn of connectionStore.connections) {
    map.set(conn.id, conn);
  }
  return map;
});

const openedConnections = computed(() => {
  return props.openedConnectionIds.map((id) => connectionMap.value.get(id)).filter((c): c is ConnectionConfig => !!c);
});

const unopenedConnections = computed(() => {
  const openedSet = new Set(props.openedConnectionIds);
  return connectionStore.connections.filter((c) => !openedSet.has(c.id));
});

const addConnectionMenuItems = computed(() => {
  const items: Array<{ value: string; label: string; icon?: any; separatorBefore?: boolean }> = [];

  if (unopenedConnections.value.length > 0) {
    for (const conn of unopenedConnections.value) {
      items.push({
        value: `open:${conn.id}`,
        label: conn.name || `${conn.host}:${conn.port}`,
        icon: Database,
      });
    }
  }

  items.push({
    value: "action:new",
    label: t("toolbar.newConnection") || "新建连接",
    icon: PlusCircle,
    separatorBefore: unopenedConnections.value.length > 0,
  });

  return items;
});

function handleMenuSelect(val: string) {
  if (val.startsWith("open:")) {
    const id = val.slice(5);
    emit("open-connection", id);
  } else if (val === "action:new") {
    emit("new-connection");
  }
}
</script>

<template>
  <div class="custom-connection-tab-bar h-9 flex items-stretch border-b border-border/80 bg-muted/30 select-none overflow-x-auto overflow-y-hidden" data-tauri-drag-region>
    <!-- Left App Badge -->
    <div class="flex items-center px-3 gap-1.5 border-r border-border/60 shrink-0 font-semibold text-xs text-foreground/90" data-tauri-drag-region>
      <Server class="h-3.5 w-3.5 text-primary" />
      <span>{{ t("sidebar.connections") || "连接" }}</span>
    </div>

    <!-- Connection Tabs List -->
    <div class="flex items-stretch flex-1 min-w-0 overflow-x-auto gap-0.5 px-1 py-0.5" data-tauri-drag-region>
      <div
        v-for="conn in openedConnections"
        :key="conn.id"
        class="custom-conn-tab group relative flex items-center gap-1.5 px-3 py-1 text-xs rounded-t-sm border border-b-0 cursor-pointer transition-colors max-w-[200px]"
        :class="[activeConnectionId === conn.id ? 'active bg-background border-border/90 text-foreground font-medium shadow-xs shadow-black/5' : 'bg-muted/40 hover:bg-muted/80 border-transparent text-muted-foreground hover:text-foreground']"
        @click="emit('activate-connection', conn.id)"
      >
        <!-- Connected Status Indicator -->
        <span class="h-1.5 w-1.5 rounded-full shrink-0" :class="connectionStore.connectedIds.has(conn.id) ? 'bg-emerald-500' : 'bg-muted-foreground/30'" />

        <!-- Database Type Icon -->
        <DatabaseIcon :db-type="conn.driver_profile || conn.db_type" class="h-3.5 w-3.5 shrink-0" />

        <!-- Connection Name -->
        <span class="truncate flex-1" :title="conn.name">{{ conn.name }}</span>

        <!-- Close Button -->
        <button type="button" class="h-3.5 w-3.5 flex items-center justify-center rounded-xs opacity-60 hover:opacity-100 hover:bg-muted-foreground/20 text-muted-foreground" :title="t('common.close') || '关闭'" @click.stop="emit('close-connection', conn.id)">
          <X class="h-2.5 w-2.5" />
        </button>
      </div>

      <!-- + Button to open or add connections -->
      <div class="flex items-center px-1">
        <LightDropdown
          model-value=""
          :items="addConnectionMenuItems"
          :show-trigger-label="false"
          :show-chevron="false"
          check-position="none"
          :trigger-icon="Plus"
          trigger-class="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted outline-none"
          trigger-icon-class="h-3.5 w-3.5"
          content-class="w-52"
          align="start"
          @update:model-value="handleMenuSelect"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-conn-tab.active::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--primary, #2563eb);
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
}
</style>
