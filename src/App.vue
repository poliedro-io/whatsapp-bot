<template>
  <div class="main-wrapper bg-light">
    <div v-if="authorized">
      <div v-if="!moduleName">
        <div class="buttons">
          <div v-on:click="setModule('dataScraper')" class="card me-2">
            <b-icon icon="file-earmark-arrow-down" class="icon"></b-icon>
            <h4 class="mt-3">Obtener datos</h4>
          </div>
          <div v-on:click="setModule('whatsappSender')" class="card ms-2">
            <b-icon icon="chat-dots" class="icon"></b-icon>
            <h4 class="mt-3">Enviar mensaje</h4>
          </div>
        </div>
      </div>

      <div v-else>
        <div class="d-flex justify-content-end">
          <b-button
            variant="danger"
            size="sm"
            class="border-0 mb-2"
            @click="close"
            :disabled="bussy"
          >
            Salir
          </b-button>
        </div>
        <b-overlay
          v-if="moduleName == 'whatsappSender'"
          no-center
          :show="bussy"
          :opacity="0.92"
          rounded="sm"
        >
          <whatsapp-card
            v-on:cleanLogs="cleanLogs"
            v-on:sendMessage="sendMessage"
          ></whatsapp-card>
          <template #overlay>
            <sending-message v-on:clean="clean" :task="task"></sending-message>
          </template>
        </b-overlay>

        <b-overlay
          v-if="moduleName == 'dataScraper'"
          no-center
          :show="bussy"
          :opacity="0.92"
          rounded="sm"
        >
          <data-scraper-card v-on:getData="getData"></data-scraper-card>
          <template #overlay>
            <scraping-data v-on:clean="clean" :task="task"></scraping-data>
          </template>
        </b-overlay>
      </div>
    </div>
  </div>
</template>

<script>
import WhatsappCard from "./components/WhatsappCard";
import DataScraperCard from "./components/DataScraperCard";
import SendingMessage from "./components/SendingMessage";
import ScrapingData from "./components/ScrapingData";

export default {
  components: {
    WhatsappCard,
    DataScraperCard,
    SendingMessage,
    ScrapingData,
  },
  data() {
    return {
      pwd: "",
      authorized: true,
      task: null,
      ws: null,
      moduleName: null,
    };
  },
  computed: {
    bussy() {
      return this.task != null;
    },
    host() {
      return "ws://localhost:3000";
    },
  },
  methods: {
    verify() {
      this.authorized = this.pwd == "robotin";
      this.pwd = "";
    },
    close() {
      this.moduleName = null;
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
    cleanLogs() {
      this.ws = new WebSocket(this.host);
      this.ws.onopen = () => {
        this.ws.send(JSON.stringify({ cleanLogs: true }));
      };
    },
    getData(payload) {
      this.ws = new WebSocket(this.host);
      this.ws.onmessage = (message) => this.handleMessage(message);

      this.ws.onopen = () => {
        this.ws.send(
          JSON.stringify({ method: "data-scraper", params: payload })
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
    setModule(moduleName) {
      this.moduleName = moduleName;
    },
  },
};
</script>

<style lang="scss">
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

.buttons {
  width: 800px;
  max-width: 95vw;
  display: flex;
  justify-content: center;
  .card {
    padding: 2rem;
    width: 300px;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    color: rgb(100, 100, 100);
    &:hover {
      color: black;
      box-shadow: 0px 2px 20px rgba(0, 0, 0, 0.2);
    }
  }
}

.icon {
  width: 50px;
  height: 50px;
}
</style>
