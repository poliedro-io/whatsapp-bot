<template>
  <div class="flex flex-col gap-5 w-full max-w-md py-4">
    <div class="flex flex-col items-center gap-2">
      <FileDown
        class="size-10 text-primary"
        :class="{ 'animate-pulse': task.status === 1 }"
      />
      <h5 class="text-sm font-semibold text-foreground">
        {{ completed ? "Proceso completado" : "Obteniendo datos" }}
      </h5>
    </div>

    <!-- Progress bar -->
    <div class="flex items-center gap-3">
      <div class="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          class="h-full rounded-full bg-primary transition-all duration-300"
          :style="{ width: value.toFixed(1) + '%' }"
        />
      </div>
      <span class="text-xs text-muted-foreground w-12 text-right tabular-nums">
        {{ value.toFixed(1) }}%
      </span>
    </div>

    <!-- Log -->
    <div class="h-24 overflow-y-auto rounded-lg bg-muted/60 border border-border px-3 py-2">
      <div class="text-xs text-foreground/80">{{ logs }}</div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-2">
      <template v-if="completed">
        <button
          class="px-4 py-1.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
          @click="clean"
        >
          Cerrar
        </button>
        <button
          class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          @click="downloadFile"
        >
          <Download class="size-4" /> Descargar archivo
        </button>
      </template>
      <button
        v-else
        class="text-sm text-destructive hover:text-destructive/80 transition-colors"
        @click="cancel"
      >
        Cancelar proceso
      </button>
    </div>
  </div>
</template>

<script>
import { FileDown, Download } from 'lucide-vue-next'

export default {
  components: { FileDown, Download },
  props: ["task"],
  emits: ['clean'],
  data() {
    return {
      logs: "",
    }
  },
  watch: {
    task(val) {
      this.logs = val.message
    },
  },
  computed: {
    completed() {
      return this.task.status === 2
    },
    value() {
      return this.task.progress * 100
    },
  },
  methods: {
    cancel() {
      if (confirm("¿Seguro que quieres interrumpir la operación?")) {
        this.clean()
      }
    },
    clean() {
      this.$emit("clean")
    },
    downloadFile() {
      const a = document.createElement("a")
      a.href = "http://localhost:3001/scraped-data.xlsx"
      a.click()
    },
  },
}
</script>
