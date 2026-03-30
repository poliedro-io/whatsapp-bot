<template>
  <div
    class="content-wrapper mx-auto py-auto d-flex flex-column align-items-stretch justify-content-between"
  >
    <Transition name="fade">
      <div>
        <i
          class="bi bi-file-earmark-arrow-down mb-3"
          :class="{ 'animate-fade': task.status == 1 }"
          style="font-size: 3rem"
        ></i>

        <h5>{{ completed ? "Proceso completado" : "Obteniendo datos" }}</h5>
        <div class="d-flex justify-content-between">
          <div class="progress mt-2" style="width: 85%">
            <div
              class="progress-bar progress-bar-striped progress-bar-animated"
              :style="{ width: value.toFixed(1) + '%' }"
            ></div>
          </div>
          <span style="width: 12%">
            {{ value.toFixed(1) + "%" }}
          </span>
        </div>
        <div class="logs-box">
          <div>{{ logs }}</div>
        </div>
      </div>
    </Transition>

    <div class="mt-3 d-flex justify-content-end">
      <div v-if="completed">
        <button class="btn btn-outline-success me-2" @click="clean">
          Cerrar
        </button>
        <button @click="downloadFile" class="btn btn-success">
          Descargar archivo
        </button>
      </div>
      <div v-else>
        <button
          class="btn btn-link btn-sm text-decoration-none text-danger"
          @click="cancel"
        >
          Cancelar proceso
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ["task"],
  emits: ['clean'],
  data() {
    return {
      logs: "",
      token: null,
    };
  },
  watch: {
    task(val) {
      this.logs = val.message;
    },
  },
  computed: {
    completed() {
      return this.task.status == 2;
    },
    value() {
      return this.task.progress * 100;
    },
  },
  methods: {
    cancel() {
      if (confirm("¿Seguro que quieres interrumpir la operacion?")) {
        this.clean();
      }
    },
    clean() {
      this.$emit("clean");
    },
    downloadFile() {
      const a = document.createElement("a");
      a.href = "http://localhost:3000/scraped-data.xlsx";
      a.click();
    },
  },
};
</script>

<style lang="scss">
.content-wrapper {
  width: 50%;
  height: 100%;
  padding: 5rem 0px;
}
.logs-box {
  background-color: #f3f3f3;
  height: 100px;
  width: 100%;
  overflow-y: auto;
  margin-top: 0.8rem;
  border-radius: 0.3rem;
  padding: 0.4rem;
  padding-bottom: 1.5rem;
  color: #313131;
  div {
    font-size: 14px;
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.animate-fade {
  animation: fadeAnimation 1.5s ease-in-out infinite;
}
@keyframes fadeAnimation {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}
</style>
