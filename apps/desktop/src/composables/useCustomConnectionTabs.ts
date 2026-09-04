import { ref, watch, onMounted } from "vue";
import { useConnectionStore } from "@/stores/connectionStore";
import { safeLocalStorageGet, safeLocalStorageSet } from "@/lib/backend/safeStorage";

const OPENED_CONNECTIONS_STORAGE_KEY = "dbx-custom-opened-connection-ids";
const ACTIVE_CONNECTION_STORAGE_KEY = "dbx-custom-active-connection-id";

export function useCustomConnectionTabs() {
  const connectionStore = useConnectionStore();

  const openedConnectionIds = ref<string[]>([]);
  const activeConnectionId = ref<string | null>(null);

  // Load persisted state
  function loadPersistedState() {
    try {
      const savedIdsRaw = safeLocalStorageGet(OPENED_CONNECTIONS_STORAGE_KEY);
      const savedActiveRaw = safeLocalStorageGet(ACTIVE_CONNECTION_STORAGE_KEY);

      if (savedIdsRaw) {
        const parsed = JSON.parse(savedIdsRaw);
        if (Array.isArray(parsed)) {
          // Filter out any connection IDs that no longer exist
          const existingIds = new Set(connectionStore.connections.map((c) => c.id));
          openedConnectionIds.value = parsed.filter((id) => typeof id === "string" && existingIds.has(id));
        }
      }

      if (savedActiveRaw && openedConnectionIds.value.includes(savedActiveRaw)) {
        activeConnectionId.value = savedActiveRaw;
      } else if (openedConnectionIds.value.length > 0) {
        activeConnectionId.value = openedConnectionIds.value[0] ?? null;
      } else {
        activeConnectionId.value = null;
      }
    } catch {
      openedConnectionIds.value = [];
      activeConnectionId.value = null;
    }
  }

  function persistState() {
    safeLocalStorageSet(OPENED_CONNECTIONS_STORAGE_KEY, JSON.stringify(openedConnectionIds.value));
    if (activeConnectionId.value) {
      safeLocalStorageSet(ACTIVE_CONNECTION_STORAGE_KEY, activeConnectionId.value);
    } else {
      safeLocalStorageSet(ACTIVE_CONNECTION_STORAGE_KEY, "");
    }
  }

  function openConnectionTab(connectionId: string) {
    if (!connectionId) return;
    if (!openedConnectionIds.value.includes(connectionId)) {
      openedConnectionIds.value.push(connectionId);
    }
    activeConnectionId.value = connectionId;
    persistState();
  }

  function closeConnectionTab(connectionId: string) {
    const index = openedConnectionIds.value.indexOf(connectionId);
    if (index === -1) return;

    openedConnectionIds.value.splice(index, 1);

    if (activeConnectionId.value === connectionId) {
      if (openedConnectionIds.value.length > 0) {
        const nextIndex = Math.min(index, openedConnectionIds.value.length - 1);
        activeConnectionId.value = openedConnectionIds.value[nextIndex] ?? null;
      } else {
        activeConnectionId.value = null;
      }
    }
    persistState();
  }

  function activateConnectionTab(connectionId: string) {
    if (openedConnectionIds.value.includes(connectionId)) {
      activeConnectionId.value = connectionId;
      persistState();
    }
  }

  // Watch for connection deletion from store
  watch(
    () => connectionStore.connections.map((c) => c.id),
    (currentIds) => {
      const validSet = new Set(currentIds);
      const filtered = openedConnectionIds.value.filter((id) => validSet.has(id));
      if (filtered.length !== openedConnectionIds.value.length) {
        openedConnectionIds.value = filtered;
        if (activeConnectionId.value && !validSet.has(activeConnectionId.value)) {
          activeConnectionId.value = filtered[0] ?? null;
        }
        persistState();
      }
    },
    { deep: true },
  );

  onMounted(() => {
    loadPersistedState();
  });

  return {
    openedConnectionIds,
    activeConnectionId,
    openConnectionTab,
    closeConnectionTab,
    activateConnectionTab,
  };
}
