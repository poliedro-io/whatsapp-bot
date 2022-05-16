<template>
  <div class="card content shadow">
    <div class="card-header">
      <h4><b-icon-chat-dots></b-icon-chat-dots> Whatsapp Bot</h4>
    </div>
    <div class="card-content p-3">
      <div class="row">
        <div class="col-8">
          <label>Mensaje</label>
          <textarea class="form-control" rows="15" v-model="message"></textarea>

          <div class="mt-2 form-check">
            <input
              class="form-check-input"
              type="checkbox"
              id="defaultCheck1"
              v-model="attachImage"
            />
            <label class="form-check-label" for="defaultCheck1">
              Adjuntar imagen
            </label>
          </div>
            <small v-if="attachImage" class="form-text text-muted"
              >Copia la imagen que quieres enviar a la carpeta 'data' y cámbiale
              el nombre a 'imagen.png' (la imagen debe estar en formato
              png).</small
            >
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
    <div class="card-footer d-flex justify-content-between">
      <div>{{ recipientsArr.length }} destinatarios</div>
      <div>
        <button class="btn btn-secondary" @click="cleanLogs">
          Limpiar registro
        </button>
        <button
          :disabled="!recipientsArr.length || message == ''"
          class="btn btn-success"
          style="margin-left: .5rem"
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
  data() {
    return {
      message: "*mensaje de prueba*",
      recipientsStr: "971524620\n971906867\n996667538",
      attachImage: false,
    };
  },
  computed: {
    recipientsArr: function() {
      return this.recipientsStr.split("\n").filter((s) => s != "");
    },
    host: function() {
      return location.origin;
    },
  },
  methods: {
    showConfirmDialog() {
      this.$bvModal
        .msgBoxConfirm(
          `¿Estás seguro que quieres enviar este mensaje a ${
            this.recipientsArr.length > 1
              ? `los ${this.recipientsArr.length} destinatarios`
              : "este destinatario"
          }?`,
          {
            title: "Confirmación",
            size: "md",
            buttonSize: "sm",
            okVariant: "success",
            okTitle: "Sí, segurísimo",
            cancelTitle: "No, lo voy a pensar mejor",
            cancelVariant: "outline-secondary",
            footerClass: "p-2",
            hideHeaderClose: true,
            centered: true,
          }
        )
        .then((value) => {
          value ? this.sendMessage() : false;
        })
        .catch((err) => {
          console.log(err.message);
          // An error occurred
        });
    },
    sendMessage() {
      let payload = {
        message: this.message,
        recipients: this.formatNumbers(this.recipientsArr),
        attachImage: this.attachImage,
      };
      this.$emit("sendMessage", payload);
    },
    cleanLogs() {
      console.log("Limpiando registros...");
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

<style>
.content {
  width: 800px;
  max-width: 95vw;
}
.clean {
  cursor: pointer;
  text-decoration: none;
}
label {
  color: #616161;
}
.resume {
  font-size: 24px;
}
textarea {
  resize: none !important;
  border-color: #b6b6b6 !important;
}
</style>
