import { ref, watch } from "vue";
import { useConnectionStore } from "@/stores/connectionStore";
import { safeLocalStorageGet, safeLocalStorageSet } from "@/lib/backend/safeStorage";

const OPENED_CONNECTIONS_STORAGE_KEY = "dbx-custom-opened-connection-ids";
const ACTIVE_CONNECTION_STORAGE_KEY = "dbx-custom-active-connection-id";
const LAST_ACTIVE_TABS_STORAGE_KEY = "dbx-custom-last-active-tab-ids";

export function useCustomConnectionTabs() {
  const connectionStore = useConnectionStore();

  const openedConnectionIds = ref<string[]>([]);
  const activeConnectionId = ref<string | null>(null);
  const lastActiveTabByConnection = ref<Record<string, string | null>>({});

  // Load persisted state
  function loadPersistedState() {
    try {
      const savedIdsRaw = safeLocalStorageGet(OPENED_CONNECTIONS_STORAGE_KEY);
      const savedActiveRaw = safeLocalStorageGet(ACTIVE_CONNECTION_STORAGE_KEY);
      const savedTabsRaw = safeLocalStorageGet(LAST_ACTIVE_TABS_STORAGE_KEY);

      if (savedIdsRaw) {
        const parsed = JSON.parse(savedIdsRaw);
        if (Array.isArray(parsed)) {
          openedConnectionIds.value = parsed.filter((id) => typeof id === "string");
        }
      }

      if (savedTabsRaw) {
        const parsedTabs = JSON.parse(savedTabsRaw);
        if (parsedTabs && typeof parsedTabs === "object") {
          lastActiveTabByConnection.value = parsedTabs;
        }
      }

      if (savedActiveRaw) {
        activeConnectionId.value = savedActiveRaw;
      } else if (openedConnectionIds.value.length > 0) {
        activeConnectionId.value = openedConnectionIds.value[0] ?? null;
      } else {
        activeConnectionId.value = null;
      }
    } catch {
      openedConnectionIds.value = [];
      activeConnectionId.value = null;
      lastActiveTabByConnection.value = {};
    }
  }

  function persistState() {
    safeLocalStorageSet(OPENED_CONNECTIONS_STORAGE_KEY, JSON.stringify(openedConnectionIds.value));
    safeLocalStorageSet(LAST_ACTIVE_TABS_STORAGE_KEY, JSON.stringify(lastActiveTabByConnection.value));
    if (activeConnectionId.value) {
      safeLocalStorageSet(ACTIVE_CONNECTION_STORAGE_KEY, activeConnectionId.value);
    } else {
      safeLocalStorageSet(ACTIVE_CONNECTION_STORAGE_KEY, "");
    }
  }

  function getLastActiveTab(connectionId: string): string | null {
    return lastActiveTabByConnection.value[connectionId] ?? null;
  }

  function setLastActiveTab(connectionId: string, tabId: string | null) {
    if (!connectionId) return;
    lastActiveTabByConnection.value[connectionId] = tabId;
    persistState();
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
    delete lastActiveTabByConnection.value[connectionId];

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

  // Watch for connection loading and deletion from store
  watch(
    () => connectionStore.connections.map((c) => c.id),
    (currentIds) => {
      if (currentIds.length === 0) return;
      const validSet = new Set(currentIds);

      // Filter out any connection tabs that no longer exist in connectionStore
      const validOpened = openedConnectionIds.value.filter((id) => validSet.has(id));

      // If no connection tabs are open (e.g. initial run or deleted), open the first one
      if (validOpened.length === 0 && currentIds[0]) {
        validOpened.push(currentIds[0]);
      }

      openedConnectionIds.value = validOpened;

      if (!activeConnectionId.value || !validSet.has(activeConnectionId.value) || !validOpened.includes(activeConnectionId.value)) {
        activeConnectionId.value = validOpened[0] ?? null;
      }

      for (const connId of Object.keys(lastActiveTabByConnection.value)) {
        if (!validSet.has(connId)) {
          delete lastActiveTabByConnection.value[connId];
        }
      }

      persistState();
    },
    { deep: true, immediate: true },
  );

  loadPersistedState();

  return {
    openedConnectionIds,
    activeConnectionId,
    lastActiveTabByConnection,
    getLastActiveTab,
    setLastActiveTab,
    openConnectionTab,
    closeConnectionTab,
    activateConnectionTab,
  };
}
