<template>
  <div>
    <div class="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-4">
      <!-- Mensaje + Imagen -->
      <div class="flex flex-col gap-3">
        <div>
          <label class="block text-sm font-medium text-muted-foreground mb-1.5">Mensaje</label>
          <textarea
            class="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
            rows="10"
            v-model="message"
          />
        </div>

        <!-- Upload imagen -->
        <div>
          <label
            v-if="!imagePreview"
            class="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg px-4 py-3 text-sm text-muted-foreground cursor-pointer hover:border-primary hover:text-primary transition-colors"
          >
            <ImageIcon class="size-4" />
            <span>Adjuntar imagen</span>
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

      <!-- Destinatarios -->
      <div class="flex flex-col">
        <div class="flex items-center justify-between mb-1.5">
          <label class="text-sm font-medium text-muted-foreground">Destinatarios</label>
          <button
            v-if="recipientsStr"
            class="text-xs text-muted-foreground hover:text-foreground transition-colors"
            @click="recipientsStr = ''"
          >
            Limpiar
          </button>
        </div>
        <textarea
          class="flex-1 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow min-h-48 md:min-h-0"
          rows="12"
          v-model="recipientsStr"
        />
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between mt-4 pt-4 border-t border-border">
      <span class="text-sm text-muted-foreground">{{ recipientsArr.length }} destinatarios</span>
      <div class="flex items-center gap-2">
        <button
          class="px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
          @click="cleanLogs"
        >
          Limpiar registro
        </button>
        <button
          class="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!recipientsArr.length || message === ''"
          @click="sendMessage"
        >
          Enviar mensaje
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ImageIcon, X } from 'lucide-vue-next'

export default {
  components: { ImageIcon, X },
  emits: ['sendMessage', 'cleanLogs'],
  data() {
    return {
      message: "*mensaje de prueba*",
      recipientsStr: "971524620\n996667538",
      imageFile: null,
      imagePreview: null,
      imageName: "",
    }
  },
  computed: {
    recipientsArr() {
      return this.recipientsStr.split("\n").filter((s) => s !== "")
    },
  },
  methods: {
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
      fetch("http://localhost:3000/upload-image", { method: "DELETE" })
    },
    async uploadImage() {
      if (!this.imageFile) return false
      const ext = this.imageFile.name.split(".").pop()
      const res = await fetch("http://localhost:3000/upload-image", {
        method: "POST",
        headers: { "x-file-ext": ext },
        body: this.imageFile,
      })
      const data = await res.json()
      return data.ok ? data.path : false
    },
    async sendMessage() {
      let imagePath = null
      if (this.imageFile) {
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
      })
    },
    cleanLogs() {
      this.$emit("cleanLogs")
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
