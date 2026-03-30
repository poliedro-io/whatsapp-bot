<template>
  <div class="whatsapp-form">
    <div>
      <div class="row">
        <div class="col-8">
          <label>Mensaje</label>
          <textarea class="form-control" rows="11" v-model="message"></textarea>

          <div class="mt-2">
            <label v-if="!imagePreview" class="image-upload-area">
              <i class="bi bi-image"></i>
              <span>Adjuntar imagen</span>
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                style="display: none"
                @change="onFileSelected"
              />
            </label>
            <div v-else class="image-preview">
              <img :src="imagePreview" alt="Preview" />
              <button class="btn-remove" @click="removeImage" title="Quitar imagen">
                <i class="bi bi-x-lg"></i>
              </button>
              <span class="image-name">{{ imageName }}</span>
            </div>
          </div>
        </div>
        <div class="col-4">
          <label class="d-flex justify-content-between">
            Destinatarios
            <a
              v-if="recipientsStr != ''"
              class="clean small"
              @click="recipientsStr = ''"
            >
              Limpiar
            </a>
          </label>
          <textarea
            class="form-control"
            rows="15"
            v-model="recipientsStr"
          ></textarea>
        </div>
      </div>
    </div>
    <div class="d-flex justify-content-between mt-3">
      <div>{{ recipientsArr.length }} destinatarios</div>
      <div>
        <button class="btn btn-secondary" @click="cleanLogs">
          Limpiar registro
        </button>
        <button
          :disabled="!recipientsArr.length || message == ''"
          class="btn btn-success ms-2"
          @click="sendMessage"
        >
          Enviar mensaje
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  emits: ['sendMessage', 'cleanLogs'],
  data() {
    return {
      message: "*mensaje de prueba*",
      recipientsStr: "971524620\n996667538",
      imageFile: null,
      imagePreview: null,
      imageName: "",
    };
  },
  computed: {
    recipientsArr() {
      return this.recipientsStr.split("\n").filter((s) => s != "");
    },
  },
  methods: {
    onFileSelected(event) {
      const file = event.target.files[0];
      if (!file) return;
      this.imageFile = file;
      this.imageName = file.name;
      this.imagePreview = URL.createObjectURL(file);
    },
    removeImage() {
      this.imageFile = null;
      this.imagePreview = null;
      this.imageName = "";
      this.$refs.fileInput.value = "";
      // Tell server to remove the image
      fetch("http://localhost:3000/upload-image", { method: "DELETE" });
    },
    async uploadImage() {
      if (!this.imageFile) return false;
      const ext = this.imageFile.name.split(".").pop();
      const res = await fetch("http://localhost:3000/upload-image", {
        method: "POST",
        headers: { "x-file-ext": ext },
        body: this.imageFile,
      });
      const data = await res.json();
      return data.ok ? data.path : false;
    },
    async sendMessage() {
      let imagePath = null;
      if (this.imageFile) {
        imagePath = await this.uploadImage();
        if (!imagePath) {
          alert("Error al subir la imagen");
          return;
        }
      }
      let payload = {
        message: this.message,
        recipients: this.formatNumbers(this.recipientsArr),
        attachImage: !!imagePath,
        imagePath,
      };
      this.$emit("sendMessage", payload);
    },
    cleanLogs() {
      this.$emit("cleanLogs");
    },
    formatNumbers(array) {
      return array.map((el) => {
        var number = el.replace(/[^\d]/g, "");
        let length = number.length;
        if (length < 8) number = null;
        else if (length === 8) number = "+569" + number;
        else if (length === 9) {
          number = number[0] !== "9" ? null : "+56" + number;
        } else {
          number = number.includes("569") ? "+569" + number.slice(-8) : null;
        }
        return number;
      });
    },
  },
};
</script>

<style scoped>
.whatsapp-form {
  width: 100%;
}
.clean {
  cursor: pointer;
  text-decoration: none;
}
label {
  color: #616161;
}
textarea {
  resize: none !important;
  border-color: #b6b6b6 !important;
}

.image-upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  cursor: pointer;
  color: #888;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.image-upload-area:hover {
  border-color: #25d366;
  color: #25d366;
}
.image-upload-area i {
  font-size: 1.2rem;
}

.image-preview {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fafafa;
}
.image-preview img {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 6px;
}
.image-preview .image-name {
  font-size: 13px;
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.image-preview .btn-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: #dc3545;
  color: white;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}
</style>
