<template>
  <div>
    <div class="flex flex-col gap-4">
      <!-- Sesión WhatsApp -->
      <div>
        <label class="block text-sm font-medium text-muted-foreground mb-1.5">Sesión vinculada</label>
      <div class="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-muted/30">
        <div class="flex items-center gap-2">
          <span
            class="size-2.5 rounded-full shrink-0"
            :class="session.linked ? 'bg-green-500' : 'bg-red-500'"
          />
          <span class="text-sm" :class="session.linked ? 'text-foreground' : 'text-muted-foreground'">
            {{ session.linked ? session.phone : 'Sin sesión vinculada' }}
          </span>
        </div>
        <button
          v-if="session.linked"
          class="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          @click="unlinkSession"
        >
          Nueva vinculación
        </button>
      </div>
      </div>

      <!-- Mensaje -->
      <div>
        <label class="block text-sm font-medium text-muted-foreground mb-1.5">Mensaje</label>
        <textarea
          class="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow overflow-hidden"
          rows="3"
          v-model="message"
          ref="messageArea"
          @input="autoResize"
        />
      </div>

      <!-- Destinatarios -->
      <div class="flex flex-col">
        <div class="flex items-center justify-between mb-1.5">
          <label class="text-sm font-medium text-muted-foreground">Destinatarios</label>
          <div class="flex items-center gap-2">
            <button
              class="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              :disabled="loadingContacts"
              @click="loadAllContacts"
            >
              {{ loadingContacts ? 'Cargando...' : 'Todos los contactos' }}
            </button>
            <button
              v-if="recipientsStr"
              class="text-xs text-muted-foreground hover:text-foreground transition-colors"
              @click="recipientsStr = ''"
            >
              Limpiar
            </button>
          </div>
        </div>
        <textarea
          class="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
          rows="6"
          v-model="recipientsStr"
        />
      </div>

      <!-- Opciones -->
      <div class="flex flex-col gap-2">
        <label class="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" v-model="attachImageEnabled" class="rounded border-input" />
          Adjuntar imagen
        </label>
        <label class="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" v-model="skipAlreadySent" class="rounded border-input" />
          Omitir contactos ya enviados
        </label>
      </div>

      <!-- Upload imagen (solo si checkbox activo) -->
      <div v-if="attachImageEnabled">
        <label
          v-if="!imagePreview"
          class="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg px-4 py-3 text-sm text-muted-foreground cursor-pointer hover:border-primary hover:text-primary transition-colors"
        >
          <ImageIcon class="size-4" />
          <span>Seleccionar imagen</span>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onFileSelected"
          />
        </label>

        <div v-else class="flex items-center gap-3 p-2.5 border border-border rounded-lg bg-muted/40 relative">
          <img :src="imagePreview" alt="Preview" class="size-12 object-cover rounded-md shrink-0" />
          <span class="text-xs text-muted-foreground truncate flex-1">{{ imageName }}</span>
          <button
            class="absolute -top-2 -right-2 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
            @click="removeImage"
          >
            <X class="size-3" />
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { ImageIcon, X } from 'lucide-vue-next'
import { contactsService } from '@/services/contacts'

export default {
  components: { ImageIcon, X },
  props: {
    prefill: { type: Object, default: null },
  },
  emits: ['sendMessage', 'saveDraft', 'update:stats'],
  data() {
    return {
      session: { linked: false, phone: null },
      message: "*mensaje de prueba*",
      recipientsStr: "",
      imageFile: null,
      imagePreview: null,
      imageName: "",
      loadingContacts: false,
      skipAlreadySent: false,
      attachImageEnabled: false,
    }
  },
  computed: {
    recipientsArr() {
      return this.recipientsStr.split("\n").filter((s) => s !== "")
    },
  },
  watch: {
    message() { this.emitStats() },
    recipientsStr() { this.emitStats() },
  },
  mounted() {
    this.checkSession()
    if (this.prefill) {
      this.message = this.prefill.message || ''
      this.recipientsStr = (this.prefill.recipients || []).join('\n')
    }
    this.$nextTick(() => {
      this.autoResize()
      this.emitStats()
    })
  },
  methods: {
    emitStats() {
      this.$emit('update:stats', {
        recipients: this.recipientsArr.length,
        hasMessage: !!this.message,
      })
    },
    autoResize() {
      const el = this.$refs.messageArea
      if (!el) return
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    },
    async checkSession() {
      try {
        const res = await fetch("http://localhost:3001/session-status")
        this.session = await res.json()
      } catch {
        this.session = { linked: false, phone: null }
      }
    },
    async unlinkSession() {
      if (!confirm("¿Desvincular la sesión actual? El próximo envío pedirá escanear QR.")) return
      try {
        await fetch("http://localhost:3001/session-unlink", { method: "DELETE" })
        this.session = { linked: false, phone: null }
      } catch {
        alert("Error al desvincular")
      }
    },
    onFileSelected(event) {
      const file = event.target.files[0]
      if (!file) return
      this.imageFile = file
      this.imageName = file.name
      this.imagePreview = URL.createObjectURL(file)
    },
    removeImage() {
      this.imageFile = null
      this.imagePreview = null
      this.imageName = ""
      this.$refs.fileInput.value = ""
      fetch("http://localhost:3001/upload-image", { method: "DELETE" })
    },
    async uploadImage() {
      if (!this.imageFile) return false
      const ext = this.imageFile.name.split(".").pop()
      const res = await fetch("http://localhost:3001/upload-image", {
        method: "POST",
        headers: { "x-file-ext": ext },
        body: this.imageFile,
      })
      const data = await res.json()
      return data.ok ? data.path : false
    },
    saveDraft() {
      this.$emit("saveDraft", {
        message: this.message,
        recipients: this.formatNumbers(this.recipientsArr),
        imagePath: null,
      })
    },
    async sendMessage() {
      let imagePath = null
      if (this.attachImageEnabled && this.imageFile) {
        imagePath = await this.uploadImage()
        if (!imagePath) {
          alert("Error al subir la imagen")
          return
        }
      }
      this.$emit("sendMessage", {
        message: this.message,
        recipients: this.formatNumbers(this.recipientsArr),
        attachImage: !!imagePath,
        imagePath,
        skipAlreadySent: this.skipAlreadySent,
      })
    },
    cleanLogs() {
      this.$emit("cleanLogs")
    },
    async loadAllContacts() {
      this.loadingContacts = true
      try {
        const contacts = await contactsService.getAll({ select: 'phone' })
        this.recipientsStr = contacts.map((c) => c.phone).join('\n')
      } catch {
        alert('Error al cargar contactos')
      }
      this.loadingContacts = false
    },
    formatNumbers(array) {
      return array.map((el) => {
        var number = el.replace(/[^\d]/g, "")
        let length = number.length
        if (length < 8) number = null
        else if (length === 8) number = "+569" + number
        else if (length === 9) {
          number = number[0] !== "9" ? null : "+56" + number
        } else {
          number = number.includes("569") ? "+569" + number.slice(-8) : null
        }
        return number
      })
    },
  },
}
</script>
