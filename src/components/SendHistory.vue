<template>
  <div>
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <h2 class="text-base font-semibold text-foreground">Historial de envios</h2>
      <div class="flex items-center gap-2">
        <button
          class="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
          @click="loadMessages"
          title="Actualizar"
        >
          <RefreshCw class="size-4" />
        </button>
        <button
          v-if="messages.length"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-sm hover:bg-destructive/5 transition-colors"
          @click="clearAll"
        >
          <Trash2 class="size-3.5" /> Limpiar
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
      <div class="relative flex-1 min-w-40 max-w-xs">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          class="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Buscar teléfono..."
          v-model="search"
        />
      </div>
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
      <span class="text-sm text-muted-foreground shrink-0">{{ filtered.length }} registros</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="size-8 rounded-full border-2 border-border border-t-primary animate-spin" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!messages.length" class="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
      <Inbox class="size-12" />
      <p class="text-sm">No hay envios registrados</p>
    </div>

    <!-- No results -->
    <div v-else-if="!filtered.length" class="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
      <SearchX class="size-10" />
      <p class="text-sm">Sin resultados para "{{ search }}"</p>
    </div>

    <!-- Table -->
    <div v-else class="rounded-xl border border-border overflow-hidden bg-white">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-muted/50">
              <th class="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-8">#</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Teléfono</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Fecha</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Estado</th>
              <th class="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(msg, i) in filtered"
              :key="msg.id"
              class="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td class="px-4 py-3 text-muted-foreground text-xs">{{ i + 1 }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5">
                  <Phone class="size-3.5 text-muted-foreground shrink-0" />
                  {{ msg.phone }}
                </div>
              </td>
              <td class="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                {{ formatDate(msg.sent_at) }}
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                  :class="msg.status === 'error'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-primary/10 text-primary'"
                >
                  {{ msg.status === 'error' ? 'Error' : 'Enviado' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <button
                  class="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  @click="deleteMessage(msg)"
                  title="Eliminar"
                >
                  <Trash2 class="size-3.5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { messagesService } from '@/services/messages'
import { RefreshCw, Trash2, Plus, Inbox, Phone, Search, SearchX } from 'lucide-vue-next'

export default {
  components: { RefreshCw, Trash2, Plus, Inbox, Phone, Search, SearchX },
  emits: ['newSend', 'cleanLogs'],

  data() {
    return {
      messages: [],
      loading: true,
      search: '',
      statusFilter: 'all',
      statusOpts: [
        { label: 'Todos', value: 'all' },
        { label: 'Enviados', value: 'sent' },
        { label: 'Errores', value: 'error' },
      ],
    }
  },

  computed: {
    filtered() {
      return this.messages.filter((m) => {
        const matchSearch = !this.search || m.phone?.includes(this.search)
        const matchStatus = this.statusFilter === 'all' || m.status === this.statusFilter
        return matchSearch && matchStatus
      })
    },
  },

  mounted() {
    this.loadMessages()
  },

  methods: {
    async loadMessages() {
      this.loading = true
      try {
        this.messages = await messagesService.getAll()
      } catch {
        // tabla vacía hasta que el backend escriba en Supabase
        this.messages = []
      }
      this.loading = false
    },

    async deleteMessage(msg) {
      try {
        await messagesService.remove(msg.id)
        this.messages = this.messages.filter((m) => m.id !== msg.id)
      } catch {
        /* silencioso */
      }
    },

    async clearAll() {
      if (!confirm('¿Limpiar todo el historial de envios?')) return
      try {
        // Limpia en Supabase
        await messagesService.removeWhere('id', 'neq', '00000000-0000-0000-0000-000000000000')
        this.messages = []
        // Notifica al servidor para que limpie su copia local también
        this.$emit('cleanLogs')
      } catch {
        /* silencioso */
      }
    },

    formatDate(iso) {
      if (!iso) return '—'
      return new Date(iso).toLocaleString('es-CL')
    },
  },
}
</script>
