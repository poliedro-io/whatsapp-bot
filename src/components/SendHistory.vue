<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="mb-0 text-dark">Historial de envios</h5>
      <div>
        <button class="btn btn-outline-secondary btn-sm me-2" @click="loadLogs">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm me-2" @click="clearLogs" v-if="logs.length">
          <i class="bi bi-trash"></i> Limpiar
        </button>
        <button class="btn btn-success" @click="$emit('newSend')">
          <i class="bi bi-plus-lg"></i> Nuevo envio
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-secondary" role="status"></div>
    </div>

    <div v-else-if="!logs.length" class="text-center py-5 text-muted">
      <i class="bi bi-inbox" style="font-size: 3rem"></i>
      <p class="mt-2">No hay envios registrados</p>
    </div>

    <div v-else class="table-responsive">
      <table class="table table-hover align-middle">
        <thead class="table-light">
          <tr>
            <th>#</th>
            <th>Telefono</th>
            <th>Fecha</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(log, i) in logs" :key="log.phone">
            <td class="text-muted small">{{ i + 1 }}</td>
            <td>
              <i class="bi bi-telephone me-1 text-muted"></i>
              {{ log.phone }}
            </td>
            <td class="text-muted small">{{ log.date }}</td>
            <td>
              <span
                class="badge"
                :class="log.error ? 'bg-danger' : 'bg-success'"
              >
                {{ log.error ? 'Error' : 'Enviado' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  emits: ['newSend', 'cleanLogs'],
  data() {
    return {
      logs: [],
      loading: true,
    };
  },
  mounted() {
    this.loadLogs();
  },
  methods: {
    async loadLogs() {
      this.loading = true;
      try {
        const res = await fetch("http://localhost:3000/logs");
        const data = await res.json();
        this.logs = Object.entries(data)
          .map(([phone, info]) => ({
            phone,
            date: new Date(info.timestamp).toLocaleString("es-CL"),
            error: info.error || null,
          }))
          .sort((a, b) => b.date.localeCompare(a.date));
      } catch {
        this.logs = [];
      }
      this.loading = false;
    },
    async clearLogs() {
      if (!confirm("Limpiar todo el historial de envios?")) return;
      this.$emit("cleanLogs");
      setTimeout(() => this.loadLogs(), 500);
    },
  },
};
</script>
