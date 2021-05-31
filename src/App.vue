<template>
  <div class="main-wrapper bg-light">
    <div v-if="authorized">
      <div class="d-flex justify-content-end">
        <b-button
          variant="outline-dark"
          size="sm"
          class="border-0 mb-2"
          @click="close"
          :disabled="bussy"
        >
          Salir
          <b-icon-x></b-icon-x>
        </b-button>
      </div>
      <b-overlay no-center :show="bussy" :opacity="0.92" rounded="sm">
        <main-card v-on:sendMessage="sendMessage"></main-card>
        <template #overlay>
          <sending-message v-on:clean="clean" :task="task"></sending-message>
        </template>
      </b-overlay>
    </div>
    <div v-else class="d-flex align-items-center justify-content-between">
      <b-form-input
        id="input-1"
        v-model="pwd"
        type="password"
        placeholder="Contraseña"
        v-on:keyup.enter="verify"
        required
      ></b-form-input>
      <b-button variant="dark" @click="verify" style="margin-left: 0.5rem"
        >Desbloquear</b-button
      >
    </div>
  </div>
</template>

<script>
import MainCard from "./components/MainCard";
import SendingMessage from "./components/SendingMessage";

export default {
  components: {
    MainCard,
    SendingMessage,
  },
  data() {
    return {
      pwd: "",
      authorized: false,
      task: null,
      ws: null,
    };
  },
  computed: {
    bussy() {
      return this.task != null;
    },
    host() {
      return process.env.NODE_ENV === "development"
        ? "ws://localhost:3000"
        : location.origin.replace(/^http/, "ws");
    },
  },
  methods: {
    verify() {
      this.authorized = this.pwd == "asd";
      this.pwd = "";
    },
    close() {
      this.authorized = false;
    },
    sendMessage(payload) {
      this.ws = new WebSocket(this.host);
      this.ws.onmessage = (message) => this.handleMessage(message);

      this.ws.onopen = () => {
        this.ws.send(
          JSON.stringify({ method: "whatsapp-sender", params: payload })
        );
      };
      this.ws.onclose = () => (this.task = null);
    },
    handleMessage(message) {
      this.task = { ...JSON.parse(message["data"]) };
    },
    clean() {
      this.ws.send(JSON.stringify({ close: true }));
    },
  },
};
</script>



<style>
.main-wrapper {
  height: 100vh;
  display: grid;
  place-content: center;
  background: linear-gradient(
    45deg,
    rgb(13, 32, 56) 0%,
    rgb(9, 121, 121) 35%,
    rgb(14, 231, 220) 100%
  );
}
</style>