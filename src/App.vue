<template>
  <div class="h-dvh flex flex-col overflow-hidden bg-background text-foreground">
    <!-- Navbar -->
    <nav class="h-14 shrink-0 bg-white border-b border-border px-4 flex items-center gap-2 z-20">
      <button
        class="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        @click="sidebarOpen = !sidebarOpen"
      >
        <MenuIcon class="size-5" />
      </button>
      <MessageCircle class="size-6 text-primary shrink-0" />
      <span class="font-semibold text-sm">WhatsApp Bot</span>
    </nav>

    <div class="flex flex-1 min-h-0">
      <!-- Sidebar backdrop (mobile) -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-200"
        leave-to-class="opacity-0"
      >
        <div
          v-if="sidebarOpen"
          class="fixed inset-0 top-14 bg-black/40 z-30 md:hidden"
          @click="sidebarOpen = false"
        />
      </Transition>

      <!-- Sidebar -->
      <aside
        class="fixed top-14 left-0 h-[calc(100dvh-3.5rem)] w-60 bg-sidebar z-40 transition-transform duration-200 ease-in-out shrink-0 md:relative md:top-auto md:h-auto md:translate-x-0"
        :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <div class="flex flex-col gap-0.5 p-2 pt-3">
          <button
            v-for="item in menuItems"
            :key="item.key"
            class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm w-full text-left transition-colors cursor-pointer"
            :class="activeSection === item.key
              ? 'bg-primary/15 text-sidebar-accent'
              : 'text-sidebar-foreground hover:bg-white/10 hover:text-white/80'"
            @click="setSection(item.key)"
          >
            <component :is="item.icon" class="size-4 shrink-0" />
            {{ item.label }}
          </button>
        </div>
      </aside>

      <!-- Content -->
      <main class="flex-1 overflow-y-auto bg-background p-4 md:p-6">
        <!-- Envios -->
        <send-history
          v-if="activeSection === 'envios'"
          ref="sendHistory"
          @newSend="showModal = true"
          @cleanLogs="cleanLogs"
        />

        <!-- Contactos -->
        <contacts-view
          v-else-if="activeSection === 'contactos'"
          @toast="showToast($event.message, $event.type)"
        />

        <!-- Scraper -->
        <div v-else-if="activeSection === 'scraper'">
          <h2 class="text-base font-semibold text-foreground mb-4">Data Scraper</h2>
          <div class="relative">
            <data-scraper-card @getData="getData" />
            <div
              v-if="bussy && activeMethod === 'data-scraper'"
              class="absolute inset-0 bg-white/92 rounded-xl flex items-start justify-center z-10 pt-8"
            >
              <scraping-data @clean="clean" :task="task" />
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Modal: Nuevo envio -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-[5vh] overflow-y-auto modal-backdrop"
        @click.self="closeModal"
      >
        <div class="bg-white rounded-xl w-full max-w-3xl shadow-2xl modal-dialog">
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <h5 class="font-semibold flex items-center gap-2 text-sm">
              <Send class="size-4 text-primary" /> Nuevo envio
            </h5>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
              @click="closeModal"
              :disabled="bussy"
            >
              <X class="size-4" />
            </button>
          </div>
          <div class="p-5">
            <whatsapp-card v-if="!bussy" @sendMessage="sendMessage" @cleanLogs="cleanLogs" />
            <sending-message v-else @clean="clean" :task="task" />
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0 translate-y-3"
        leave-active-class="transition-all duration-200"
        leave-to-class="opacity-0 translate-y-3"
      >
        <div
          v-if="toast"
          class="fixed bottom-5 right-4 left-4 md:left-auto md:right-5 md:min-w-64 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium shadow-lg z-[2000]"
          :class="toast.type === 'success' ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'"
        >
          <CheckCircle2 v-if="toast.type === 'success'" class="size-4 shrink-0" />
          <AlertCircle v-else class="size-4 shrink-0" />
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script>
import { MenuIcon, MessageCircle, Send, X, Users, FileDown, CheckCircle2, AlertCircle } from 'lucide-vue-next'
import WhatsappCard from "./components/WhatsappCard.vue"
import DataScraperCard from "./components/DataScraperCard.vue"
import SendingMessage from "./components/SendingMessage.vue"
import ScrapingData from "./components/ScrapingData.vue"
import SendHistory from "./components/SendHistory.vue"
import ContactsView from "./components/ContactsView.vue"

export default {
  components: {
    WhatsappCard, DataScraperCard, SendingMessage, ScrapingData, SendHistory, ContactsView,
    MenuIcon, MessageCircle, Send, X, Users, FileDown, CheckCircle2, AlertCircle,
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
        { key: "envios", label: "Envios", icon: Send },
        { key: "contactos", label: "Contactos", icon: Users },
        { key: "scraper", label: "Scraper", icon: FileDown },
      ],
    }
  },
  computed: {
    bussy() {
      return this.task != null
    },
    host() {
      return "ws://localhost:3000"
    },
  },
  methods: {
    setSection(key) {
      this.activeSection = key
      this.sidebarOpen = false
    },
    closeModal() {
      if (this.bussy) return
      this.showModal = false
    },
    sendMessage(payload) {
      this.activeMethod = "whatsapp-sender"
      this.ws = new WebSocket(this.host)
      this.ws.onmessage = (message) => this.handleMessage(message)
      this.ws.onopen = () => {
        this.ws.send(JSON.stringify({ method: "whatsapp-sender", params: payload }))
      }
      this.ws.onclose = () => {
        this.task = null
        this.activeMethod = null
        if (this.$refs.sendHistory) {
          this.$refs.sendHistory.loadLogs()
        }
      }
    },
    cleanLogs() {
      this.ws = new WebSocket(this.host)
      this.ws.onopen = () => {
        this.ws.send(JSON.stringify({ cleanLogs: true }))
        this.showToast("Registro limpiado", "success")
        if (this.$refs.sendHistory) {
          this.$refs.sendHistory.loadLogs()
        }
      }
    },
    showToast(message, type = "success") {
      this.toast = { message, type }
      setTimeout(() => { this.toast = null }, 3000)
    },
    getData(payload) {
      this.activeMethod = "data-scraper"
      this.ws = new WebSocket(this.host)
      this.ws.onmessage = (message) => this.handleMessage(message)
      this.ws.onopen = () => {
        this.ws.send(JSON.stringify({ method: "data-scraper", params: payload }))
      }
      this.ws.onclose = () => {
        this.task = null
        this.activeMethod = null
      }
    },
    handleMessage(message) {
      this.task = { ...JSON.parse(message["data"]) }
    },
    clean() {
      this.ws.send(JSON.stringify({ close: true }))
    },
  },
}
</script>

<style>
.modal-backdrop {
  animation: backdropIn 0.15s ease-out;
}
.modal-dialog {
  animation: dialogIn 0.2s ease-out;
}
@keyframes backdropIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes dialogIn {
  from { opacity: 0; transform: translateY(-12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
