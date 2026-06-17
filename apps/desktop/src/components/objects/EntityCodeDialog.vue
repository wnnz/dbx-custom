<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Clipboard, Download, Loader2 } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { copyToClipboard } from "@/lib/clipboard";
import { DEFAULT_ENTITY_CODE_PRESET, ENTITY_CODE_LANGUAGES, entityCodePreset, entityOrmOptionsForLanguage, generateEntityCode, type EntityCodeLanguage, type EntityCodeOrm, type EntityTableModel } from "@/lib/entityCodeGenerator";
import { isTauriRuntime } from "@/lib/tauriRuntime";
import { useToast } from "@/composables/useToast";

const props = defineProps<{
  open: boolean;
  title: string;
  tables: EntityTableModel[];
  loading?: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const { t } = useI18n();
const { toast } = useToast();
const selectedLanguage = ref<EntityCodeLanguage>(DEFAULT_ENTITY_CODE_PRESET.language);
const selectedOrm = ref<EntityCodeOrm>(DEFAULT_ENTITY_CODE_PRESET.orm);

const entityLanguageOptions = ENTITY_CODE_LANGUAGES;
const entityOrmOptions = computed(() => entityOrmOptionsForLanguage(selectedLanguage.value));
const selectedPreset = computed(() => entityCodePreset(selectedLanguage.value, selectedOrm.value) || DEFAULT_ENTITY_CODE_PRESET);
const generatedCode = computed(() => {
  if (!props.tables.length || props.loading || props.error) return "";
  return generateEntityCode({
    language: selectedPreset.value.language,
    orm: selectedPreset.value.orm,
    tables: props.tables,
  });
});
const defaultFileName = computed(() => {
  if (props.tables.length === 1) return `${props.tables[0]!.tableName}.${selectedPreset.value.fileExtension}`;
  return `entities.${selectedPreset.value.fileExtension}`;
});

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit("update:open", value),
});

watch(selectedLanguage, (language) => {
  const options = entityOrmOptionsForLanguage(language);
  if (!options.some((item) => item.orm === selectedOrm.value)) {
    selectedOrm.value = options[0]?.orm ?? DEFAULT_ENTITY_CODE_PRESET.orm;
  }
});

async function saveFileContent(content: string, defaultName: string, filterName: string, filterExt: string) {
  if (isTauriRuntime()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({
      defaultPath: defaultName,
      filters: [{ name: filterName, extensions: [filterExt] }],
    });
    if (path) await writeTextFile(path, content);
    return;
  }

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultName;
  a.click();
  URL.revokeObjectURL(url);
}

async function copyEntityCode() {
  if (!generatedCode.value) return;
  try {
    await copyToClipboard(generatedCode.value);
    toast(t("contextMenu.entityCodeCopied"), 2000);
  } catch (e: any) {
    toast(t("grid.copyFailed", { message: e?.message || String(e) }), 5000);
  }
}

async function saveEntityCode() {
  if (!generatedCode.value) return;
  await saveFileContent(generatedCode.value, defaultFileName.value, selectedPreset.value.languageLabel, selectedPreset.value.fileExtension);
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-[860px]">
      <DialogHeader>
        <DialogTitle>{{ title || t("contextMenu.generateEntityCode") }}</DialogTitle>
      </DialogHeader>
      <div class="grid gap-3">
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="grid gap-1.5">
            <label class="text-xs font-medium text-muted-foreground">{{ t("contextMenu.entityCodeLanguage") }}</label>
            <Select v-model="selectedLanguage">
              <SelectTrigger class="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="item in entityLanguageOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-1.5">
            <label class="text-xs font-medium text-muted-foreground">{{ t("contextMenu.entityCodeOrm") }}</label>
            <Select v-model="selectedOrm">
              <SelectTrigger class="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="item in entityOrmOptions" :key="item.orm" :value="item.orm">
                  {{ item.ormLabel }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div v-if="loading" class="flex min-h-64 items-center justify-center gap-2 rounded bg-muted text-sm text-muted-foreground">
          <Loader2 class="h-4 w-4 animate-spin" />
          <span>{{ t("contextMenu.entityCodeLoading") }}</span>
        </div>
        <p v-else-if="error" class="rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{{ error }}</p>
        <textarea v-else readonly class="max-h-[56vh] min-h-64 resize-y overflow-auto rounded bg-muted p-3 font-mono text-xs whitespace-pre" :value="generatedCode"></textarea>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="isOpen = false">{{ t("dangerDialog.cancel") }}</Button>
        <Button variant="outline" :disabled="loading || !generatedCode" @click="copyEntityCode">
          <Clipboard class="h-4 w-4" />
          {{ t("contextMenu.copyEntityCode") }}
        </Button>
        <Button :disabled="loading || !generatedCode" @click="saveEntityCode">
          <Download class="h-4 w-4" />
          {{ t("contextMenu.saveEntityCode") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
