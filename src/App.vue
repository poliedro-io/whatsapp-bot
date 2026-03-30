<template>
  <div class="app-layout">
    <!-- Navbar -->
    <nav class="app-navbar">
      <div class="d-flex align-items-center">
        <button class="btn btn-link text-dark d-md-none me-2" @click="sidebarOpen = !sidebarOpen">
          <i class="bi bi-list" style="font-size: 1.4rem"></i>
        </button>
        <i class="bi bi-whatsapp text-success me-2" style="font-size: 1.5rem"></i>
        <span class="fw-semibold">WhatsApp Bot</span>
      </div>
    </nav>

    <!-- Sidebar backdrop (mobile) -->
    <div
      v-if="sidebarOpen"
      class="sidebar-backdrop d-md-none"
      @click="sidebarOpen = false"
    ></div>

    <!-- Sidebar -->
    <aside class="app-sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-nav">
        <a
          v-for="item in menuItems"
          :key="item.key"
          class="sidebar-item"
          :class="{ active: activeSection === item.key }"
          @click="setSection(item.key)"
        >
          <i :class="'bi bi-' + item.icon"></i>
          <span>{{ item.label }}</span>
        </a>
      </div>
    </aside>

    <!-- Content -->
    <main class="app-content">
      <!-- Envios -->
      <send-history
        v-if="activeSection === 'envios'"
        ref="sendHistory"
        @newSend="showModal = true"
        @cleanLogs="cleanLogs"
      ></send-history>

      <!-- Contactos -->
      <div v-if="activeSection === 'contactos'" class="text-center py-5 text-muted">
        <i class="bi bi-people" style="font-size: 3rem"></i>
        <p class="mt-2">Gestion de contactos (proximamente)</p>
      </div>

      <!-- Scraper -->
      <div v-if="activeSection === 'scraper'">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h5 class="mb-0 text-dark">Data Scraper</h5>
        </div>
        <div class="position-relative">
          <data-scraper-card @getData="getData"></data-scraper-card>
          <div v-if="bussy && activeMethod === 'data-scraper'" class="overlay-backdrop">
            <scraping-data @clean="clean" :task="task"></scraping-data>
          </div>
        </div>
      </div>
    </main>

    <!-- Modal: Nuevo envio -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-backdrop-custom" @click.self="closeModal">
        <div class="modal-dialog-custom">
          <div class="modal-header-custom">
            <h5 class="mb-0">
              <i class="bi bi-send"></i> Nuevo envio
            </h5>
            <button
              class="btn-close"
              @click="closeModal"
              :disabled="bussy"
            ></button>
          </div>
          <div class="modal-body-custom">
            <div v-if="!bussy">
              <whatsapp-card
                @sendMessage="sendMessage"
                @cleanLogs="cleanLogs"
              ></whatsapp-card>
            </div>
            <div v-else>
              <sending-message @clean="clean" :task="task"></sending-message>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast" class="app-toast" :class="'toast-' + toast.type">
          <i :class="toast.type === 'success' ? 'bi bi-check-circle' : 'bi bi-exclamation-circle'"></i>
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script>
import WhatsappCard from "./components/WhatsappCard.vue";
import DataScraperCard from "./components/DataScraperCard.vue";
import SendingMessage from "./components/SendingMessage.vue";
import ScrapingData from "./components/ScrapingData.vue";
import SendHistory from "./components/SendHistory.vue";

export default {
  components: {
    WhatsappCard,
    DataScraperCard,
    SendingMessage,
    ScrapingData,
    SendHistory,
  },
  data() {
    return {
      activeSection: "envios",
      sidebarOpen: false,
      showModal: false,
      task: null,
      ws: null,
      activeMethod: null,
      toast: null,
      menuItems: [
        { key: "envios", label: "Envios", icon: "send" },
        { key: "contactos", label: "Contactos", icon: "people" },
        { key: "scraper", label: "Scraper", icon: "file-earmark-arrow-down" },
      ],
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
    setSection(key) {
      this.activeSection = key;
      this.sidebarOpen = false;
    },
    closeModal() {
      if (this.bussy) return;
      this.showModal = false;
    },
    sendMessage(payload) {
      this.activeMethod = "whatsapp-sender";
      this.ws = new WebSocket(this.host);
      this.ws.onmessage = (message) => this.handleMessage(message);
      this.ws.onopen = () => {
        this.ws.send(
          JSON.stringify({ method: "whatsapp-sender", params: payload })
        );
      };
      this.ws.onclose = () => {
        this.task = null;
        this.activeMethod = null;
        // Refresh history after send completes
        if (this.$refs.sendHistory) {
          this.$refs.sendHistory.loadLogs();
        }
      };
    },
    cleanLogs() {
      this.ws = new WebSocket(this.host);
      this.ws.onopen = () => {
        this.ws.send(JSON.stringify({ cleanLogs: true }));
        this.showToast("Registro limpiado", "success");
        if (this.$refs.sendHistory) {
          this.$refs.sendHistory.loadLogs();
        }
      };
    },
    showToast(message, type = "success") {
      this.toast = { message, type };
      setTimeout(() => { this.toast = null; }, 3000);
    },
    getData(payload) {
      this.activeMethod = "data-scraper";
      this.ws = new WebSocket(this.host);
      this.ws.onmessage = (message) => this.handleMessage(message);
      this.ws.onopen = () => {
        this.ws.send(
          JSON.stringify({ method: "data-scraper", params: payload })
        );
      };
      this.ws.onclose = () => {
        this.task = null;
        this.activeMethod = null;
      };
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

<style lang="scss">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  grid-template-rows: 56px 1fr;
  grid-template-areas:
    "navbar navbar"
    "sidebar content";
  height: 100vh;
  overflow: hidden;
}

// Navbar
.app-navbar {
  grid-area: navbar;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  z-index: 100;
}

// Sidebar
.app-sidebar {
  grid-area: sidebar;
  background: #1a1a2e;
  overflow-y: auto;
  padding-top: 0.5rem;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.5rem;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  color: #a0a0b8;
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #e0e0f0;
  }

  &.active {
    background: rgba(37, 211, 102, 0.15);
    color: #25d366;
  }

  i {
    font-size: 1.1rem;
    width: 20px;
    text-align: center;
  }
}

// Content
.app-content {
  grid-area: content;
  background: #f5f6fa;
  padding: 1.5rem 2rem;
  overflow-y: auto;
}

// Modal
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 5vh;
  overflow-y: auto;
}

.modal-dialog-custom {
  background: #fff;
  border-radius: 12px;
  width: 900px;
  max-width: 95vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: modalIn 0.2s ease-out;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header-custom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #eee;

  h5 {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.modal-body-custom {
  padding: 1.5rem;
}

// Overlay for scraper
.overlay-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 0.25rem;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 10;
}

// Responsive
@media (max-width: 767px) {
  .app-layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      "navbar"
      "content";
  }

  .app-sidebar {
    position: fixed;
    top: 56px;
    left: -260px;
    width: 260px;
    height: calc(100vh - 56px);
    z-index: 200;
    transition: left 0.25s ease;

    &.open {
      left: 0;
    }
  }

  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    top: 56px;
    background: rgba(0, 0, 0, 0.4);
    z-index: 150;
  }

  .app-content {
    padding: 1rem;
  }
}

// Toast
.app-toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 2000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  &.toast-success {
    background: #25d366;
    color: #fff;
  }
  &.toast-error {
    background: #dc3545;
    color: #fff;
  }
}

.toast-enter-active {
  animation: toastIn 0.3s ease-out;
}
.toast-leave-active {
  animation: toastIn 0.3s ease-in reverse;
}
@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
