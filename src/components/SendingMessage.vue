<template>
  <div class="flex flex-col items-center gap-5 py-2 w-full">
    <!-- QR (no logueado) -->
    <div v-if="!loggedIn" class="flex flex-col items-center gap-4">
      <h5 class="text-sm font-semibold text-foreground">Permiso de WhatsApp</h5>
      <vue-qr
        v-if="token != null"
        :text="token"
        :margin="10"
        :size="280"
        class="rounded-xl border border-border shadow-sm"
      />
      <div v-else class="flex flex-col items-center gap-3 py-8">
        <div class="size-8 rounded-full border-2 border-border border-t-primary animate-spin" />
        <p class="text-sm text-muted-foreground">Iniciando sesión...</p>
      </div>
    </div>

    <!-- Enviando (logueado) -->
    <Transition
      enter-active-class="transition-opacity duration-500"
      enter-from-class="opacity-0"
    >
      <div v-if="loggedIn" class="w-full flex flex-col gap-4">
        <div class="flex flex-col items-center gap-2">
          <Mail
            class="size-10 text-primary"
            :class="{ 'animate-pulse': task.status === 1 }"
          />
          <h5 class="text-sm font-semibold text-foreground">
            {{ completed ? "Mensajes enviados" : "Enviando mensajes" }}
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

        <!-- Logs -->
        <div class="h-44 overflow-y-auto rounded-lg bg-muted/60 border border-border px-3 py-2">
          <div v-for="(log, i) in logs" :key="i" class="text-xs text-foreground/80 py-0.5">
            {{ log }}
          </div>
        </div>
      </div>
    </Transition>

    <!-- Actions -->
    <div class="w-full flex justify-end">
      <button
        v-if="completed"
        class="px-4 py-1.5 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
        @click="clean"
      >
        Cerrar
      </button>
      <button
        v-else
        class="text-sm text-destructive hover:text-destructive/80 transition-colors"
        @click="cancel"
      >
        {{ loggedIn ? "Detener envio" : "Cancelar" }}
      </button>
    </div>
  </div>
</template>

<script>
import { Mail } from 'lucide-vue-next'
import VueQr from "vue-qr"

export default {
  components: { VueQr, Mail },
  props: ["task"],
  emits: ['clean'],
  data() {
    return {
      logs: [],
      token: null,
    }
  },
  watch: {
    task(val) {
      if (val.message.includes("TOKEN")) {
        this.token = val.message.split(" ")[1]
        return
      }
      this.logs.push(val.message)
      this.$nextTick(() => {
        const el = this.$el.querySelector(".overflow-y-auto")
        if (el) el.scrollTop = el.scrollHeight
      })
    },
  },
  computed: {
    loggedIn() {
      return this.task.status > 0
    },
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
  },
}
</script>
