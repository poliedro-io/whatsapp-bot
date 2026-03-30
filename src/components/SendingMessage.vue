<template>
  <div
    class="content-wrapper mx-auto py-auto d-flex flex-column align-items-stretch justify-content-between"
  >
    <div
      v-if="!loggedIn"
      style="height: 100%"
      class="d-flex flex-column align-items-center"
    >
      <h5>Permiso de Whatsapp</h5>
      <vue-qr
        v-if="token != null"
        :text="token"
        :margin="10"
        :size="350"
      ></vue-qr>

      <div v-else class="my-auto">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
      </div>
    </div>
    <Transition name="fade">
      <div v-if="loggedIn">
        <i
          class="bi bi-envelope mb-3"
          :class="{ 'animate-fade': task.status == 1 }"
          style="font-size: 3rem"
        ></i>

        <h5>{{ completed ? "Mensaje enviado" : "Enviando mensaje" }}</h5>
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
          <div v-for="(log, i) in logs" :key="i">{{ log }}</div>
        </div>
      </div>
    </Transition>

    <button
      v-if="completed"
      class="btn btn-outline-success btn-sm"
      @click="clean"
    >
      Cerrar
    </button>
    <button
      v-else
      class="btn btn-link btn-sm text-decoration-none text-danger mt-2"
      @click="cancel"
    >
      {{ loggedIn ? "Detener envio" : "Cancelar" }}
    </button>
  </div>
</template>

<script>
import VueQr from "vue-qr";

export default {
  components: { VueQr },
  props: ["task"],
  emits: ['clean'],
  data() {
    return {
      logs: [],
      token: null,
    };
  },
  watch: {
    task(val) {
      if (val.message.includes("TOKEN")) {
        this.token = val.message.split(" ")[1];
        return;
      }
      this.logs.push(val.message);
      this.$nextTick(() => {
        var element = this.$el.querySelector(".logs-box");
        if (element) element.scrollTop = element.scrollHeight;
      });
    },
  },
  computed: {
    loggedIn() {
      return this.task.status > 0;
    },
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
  },
};
</script>

<style lang="scss">
.content-wrapper {
  width: 100%;
  padding: 1.5rem 0;
}
.logs-box {
  background-color: #f3f3f3;
  height: 200px;
  width: 95%;
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
