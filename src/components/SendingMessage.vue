
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
      <!-- <img class="mt-4" width="264" height="264" v-if="token != null" :src="'data:image/jpg;base64,' + token"/> -->

      <div v-else class="my-auto">
        <b-spinner></b-spinner>
      </div>
    </div>
    <transition name="fade">
      <div v-if="loggedIn">
        <b-icon
          icon="envelope"
          :animation="task.status == 1 ? 'fade' : 'none'"
          font-scale="3"
          class="mb-3"
        ></b-icon>

        <h5>{{ completed ? "Mensaje enviado" : "Enviando mensaje" }}</h5>
        <div class="d-flex justify-content-between">
          <b-progress
            :value="value"
            striped
            :animated="true"
            class="mt-2"
            style="width: 85%"
          ></b-progress>
          <span style="width: 12%">
            {{ value.toFixed(1) + "%" }}
          </span>
        </div>
        <div class="logs-box">
          <div v-for="(log, i) in logs" :key="i">{{ log }}</div>
        </div>
      </div>
    </transition>

    <b-button
      v-if="completed"
      size="sm"
      variant="outline-success"
      @click="clean"
      >Cerrar
    </b-button>
    <b-button
      v-else
      variant="link"
      size="sm"
      class="text-decoration-none text-danger mt-2"
      @click="cancel"
      >{{ loggedIn ? "Detener envío" : "Cancelar" }}
    </b-button>
  </div>
</template>


<script>
import VueQr from "vue-qr";

export default {
  components: { VueQr },
  props: ["task"],
  data() {
    return {
      logs: [],
      token: null,
    };
  },
  watch: {
    task: function (val) {
      if (val.message.includes("TOKEN")) {
        this.token = val.message.split(" ")[1];
        return;
      }
      this.logs.push(val.message);
      var element = this.$el.querySelector(".logs-box");
      if (element) element.scrollTop = element.scrollHeight;
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
      this.$bvModal
        .msgBoxConfirm(`¿Seguro que quieres interrumpir la operación?`, {
          title: "Confirmación",
          size: "sm",
          buttonSize: "sm",
          okVariant: "danger",
          okTitle: "Sí, interrumpir",
          cancelTitle: "No, continuar",
          cancelVariant: "outline-secondary",
          footerClass: "p-2",
          hideHeaderClose: true,
          centered: true,
        })
        .then((value) => {
          value ? this.clean() : false;
        })
        .catch((err) => {
          console.log(err.message);
          // An error occurred
        });
    },
    clean() {
      this.$emit("clean");
    }
  },
};
</script>

<style lang="scss">
.content-wrapper {
  width: 50%;
  height: 100%;
  padding: 5rem 0px;
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
.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}
</style>