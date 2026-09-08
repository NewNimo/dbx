<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SqlInsertMode, SqlInsertExportOptions } from "@/lib/export/sqlInsertMode";

const { t } = useI18n();

const props = defineProps<{
  columns?: string[];
}>();

const open = defineModel<boolean>("open", { default: false });
const selected = ref<SqlInsertMode>("batch");
const selectedColumns = ref<string[]>(props.columns ? [...props.columns] : []);
let outcomeEmitted = false;

watch(
  () => props.columns,
  (newCols) => {
    if (newCols && newCols.length > 0) {
      selectedColumns.value = [...newCols];
    }
  },
  { immediate: true },
);

function selectAll() {
  if (props.columns) {
    selectedColumns.value = [...props.columns];
  }
}

function deselectAll() {
  selectedColumns.value = [];
}

const canConfirm = computed(() => {
  if (!props.columns || props.columns.length === 0) return true;
  return selectedColumns.value.length > 0;
});

const emit = defineEmits<{
  confirm: [options: SqlInsertExportOptions];
  cancel: [];
}>();

function onConfirm() {
  if (!canConfirm.value) return;
  outcomeEmitted = true;
  open.value = false;
  emit("confirm", {
    insertMode: selected.value,
    selectedColumns: props.columns && props.columns.length > 0 ? [...selectedColumns.value] : undefined,
  });
}

function onCancel() {
  if (outcomeEmitted) return;
  outcomeEmitted = true;
  open.value = false;
  emit("cancel");
}

function onOpenChange(value: boolean) {
  if (!value) onCancel();
}
</script>

<template>
  <Dialog v-model:open="open" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-md" @interact-outside.prevent>
      <DialogHeader>
        <DialogTitle>{{ t("grid.sqlInsertModeTitle") }}</DialogTitle>
      </DialogHeader>
      <div class="space-y-4 py-2">
        <div>
          <p class="mb-2 text-sm text-muted-foreground">{{ t("grid.sqlInsertModePrompt") }}</p>
          <div class="space-y-2">
            <label class="flex cursor-pointer items-start gap-3 rounded-md border p-2.5 transition-colors hover:bg-accent/50">
              <input v-model="selected" type="radio" value="batch" class="mt-0.5 h-4 w-4 shrink-0" data-sql-insert-mode="batch" />
              <span class="min-w-0">
                <span class="block text-sm font-medium">{{ t("grid.sqlInsertModeBatch") }}</span>
                <span class="mt-0.5 block text-xs text-muted-foreground">{{ t("grid.sqlInsertModeBatchDescription") }}</span>
              </span>
            </label>
            <label class="flex cursor-pointer items-start gap-3 rounded-md border p-2.5 transition-colors hover:bg-accent/50">
              <input v-model="selected" type="radio" value="single" class="mt-0.5 h-4 w-4 shrink-0" data-sql-insert-mode="single" />
              <span class="min-w-0">
                <span class="block text-sm font-medium">{{ t("grid.sqlInsertModeSingle") }}</span>
                <span class="mt-0.5 block text-xs text-muted-foreground">{{ t("grid.sqlInsertModeSingleDescription") }}</span>
              </span>
            </label>
          </div>
        </div>

        <div v-if="props.columns && props.columns.length > 0" class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">
              {{ t("grid.sqlInsertColumnsTitle", { selected: selectedColumns.length, total: props.columns.length }) }}
            </span>
            <div class="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" class="h-6 px-2 text-xs text-muted-foreground hover:text-foreground" data-sql-insert-select-all @click="selectAll">
                {{ t("grid.selectAll") }}
              </Button>
              <Button type="button" variant="ghost" size="sm" class="h-6 px-2 text-xs text-muted-foreground hover:text-foreground" data-sql-insert-deselect-all @click="deselectAll">
                {{ t("grid.deselectAll") }}
              </Button>
            </div>
          </div>
          <div class="max-h-44 overflow-y-auto rounded-md border border-border/70 bg-muted/20 p-1.5 space-y-0.5" data-sql-insert-column-list>
            <label v-for="column in props.columns" :key="column" class="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-accent/50 cursor-pointer text-xs">
              <input v-model="selectedColumns" type="checkbox" :value="column" class="h-3.5 w-3.5 rounded border-border/80" :data-sql-insert-column="column" />
              <span class="min-w-0 truncate font-mono text-foreground">{{ column }}</span>
            </label>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="onCancel">{{ t("common.cancel") }}</Button>
        <Button :disabled="!canConfirm" data-sql-insert-mode-confirm @click="onConfirm">{{ t("common.confirm") }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
