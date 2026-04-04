<template>
  <div>
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <h2 class="text-base font-semibold text-foreground">Historial de envios</h2>
      <div class="flex items-center gap-2">
        <button
          class="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
          @click="loadSends"
          title="Actualizar"
        >
          <RefreshCw class="size-4" />
        </button>
        <button
          class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          @click="$emit('newSend')"
        >
          <Plus class="size-4" /> Nuevo envio
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="flex items-center gap-1 bg-muted rounded-lg p-0.5">
        <button
          v-for="opt in statusOpts"
          :key="opt.value"
          class="px-3 py-1 rounded-md text-xs font-medium transition-colors"
          :class="statusFilter === opt.value
            ? 'bg-white text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'"
          @click="statusFilter = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
      <span class="text-sm text-muted-foreground shrink-0">{{ filtered.length }} envios</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="size-8 rounded-full border-2 border-border border-t-primary animate-spin" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!sends.length" class="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
      <Inbox class="size-12" />
      <p class="text-sm">No hay envios registrados</p>
    </div>

    <!-- No results -->
    <div v-else-if="!filtered.length" class="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
      <Inbox class="size-10" />
      <p class="text-sm">Sin resultados para el filtro seleccionado</p>
    </div>

    <!-- Cards -->
    <div v-else class="flex flex-col gap-3">
      <div
        v-for="send in filtered"
        :key="send.id"
        class="rounded-xl border border-border bg-white p-4 hover:shadow-sm transition-shadow"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <!-- Status + fecha -->
            <div class="flex items-center gap-2 mb-2">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                :class="statusClass(send.status)"
              >
                {{ statusLabel(send.status) }}
              </span>
              <span class="text-xs text-muted-foreground">{{ formatDate(send.created_at) }}</span>
            </div>

            <!-- Mensaje (truncado) -->
            <p class="text-sm text-foreground line-clamp-2 mb-2">{{ send.message }}</p>

            <!-- Stats -->
            <div class="flex items-center gap-4 text-xs text-muted-foreground">
              <span class="flex items-center gap-1">
                <Users class="size-3.5" />
                {{ send.sent_count }}/{{ send.total }} enviados
              </span>
              <span v-if="send.image_url" class="flex items-center gap-1">
                <ImageIcon class="size-3.5" />
                Con imagen
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 shrink-0">
            <button
              class="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              @click="$emit('repeatSend', send)"
              title="Repetir envío"
            >
              <Repeat2 class="size-3.5" />
            </button>
            <button
              class="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              @click="deleteSend(send)"
              title="Eliminar"
            >
              <Trash2 class="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { sendsService } from '@/services/sends'
import { RefreshCw, Trash2, Plus, Inbox, Users, ImageIcon, Repeat2 } from 'lucide-vue-next'

export default {
  components: { RefreshCw, Trash2, Plus, Inbox, Users, ImageIcon, Repeat2 },
  emits: ['newSend', 'repeatSend'],

  data() {
    return {
      sends: [],
      loading: true,
      statusFilter: 'all',
      statusOpts: [
        { label: 'Todos', value: 'all' },
        { label: 'Completados', value: 'fulfilled' },
        { label: 'En progreso', value: 'in_progress' },
        { label: 'Borradores', value: 'draft' },
      ],
    }
  },

  computed: {
    filtered() {
      if (this.statusFilter === 'all') return this.sends
      return this.sends.filter((s) => s.status === this.statusFilter)
    },
  },

  mounted() {
    this.loadSends()
  },

  methods: {
    async loadSends() {
      this.loading = true
      try {
        this.sends = await sendsService.getAll()
      } catch {
        this.sends = []
      }
      this.loading = false
    },

    async deleteSend(send) {
      if (!confirm('¿Eliminar este envío?')) return
      try {
        await sendsService.remove(send.id)
        this.sends = this.sends.filter((s) => s.id !== send.id)
      } catch {
        /* silencioso */
      }
    },

    statusClass(status) {
      const map = {
        draft: 'bg-muted text-muted-foreground',
        in_progress: 'bg-yellow-100 text-yellow-700',
        fulfilled: 'bg-primary/10 text-primary',
      }
      return map[status] || 'bg-muted text-muted-foreground'
    },

    statusLabel(status) {
      const map = {
        draft: 'Borrador',
        in_progress: 'En progreso',
        fulfilled: 'Completado',
      }
      return map[status] || status
    },

    formatDate(iso) {
      if (!iso) return '—'
      return new Date(iso).toLocaleString('es-CL')
    },
  },
}
</script>
