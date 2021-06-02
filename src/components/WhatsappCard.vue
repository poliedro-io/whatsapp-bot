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
      <button
        :disabled="!recipientsArr.length || message == ''"
        class="btn btn-success"
        @click="showConfirmDialog"
      >
        Enviar mensaje
      </button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      message: "",
      recipientsStr: "",
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
      };
      this.$emit("sendMessage", payload);
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
