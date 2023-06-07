<template>
  <div
    class="content-wrapper mx-auto py-auto d-flex flex-column align-items-stretch justify-content-between"
  >
    <transition name="fade">
      <div>
        <b-icon
          icon="file-earmark-arrow-down"
          :animation="task.status == 1 ? 'fade' : 'none'"
          font-scale="3"
          class="mb-3"
        ></b-icon>

        <h5>{{ completed ? "Proceso completado" : "Obteniendo datos" }}</h5>
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
          <div>{{ logs }}</div>
        </div>
      </div>
    </transition>

    <div class="mt-3 d-flex justify-content-end">
      <div v-if="completed">
        <b-button class="me-2" variant="outline-success" @click="clean"
          >Cerrar
        </b-button>

        <b-button @click="downloadFile" variant="success">
          Descargar archivo
        </b-button>
      </div>
      <div v-else>
        <b-buttondownloadFile
          variant="link"
          size="sm"
          class="text-decoration-none text-danger"
          @click="cancel"
          >Cancelar proceso
        </b-buttondownloadFile>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ["task"],
  data() {
    return {
      logs: "",
      token: null,
    };
  },
  watch: {
    task: function(val) {
      this.logs = val.message;
    },
  },
  computed: {
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
    },
    downloadFile() {
      const a = document.createElement("a");
      a.href = "http://localhost:3000/scraped-data.xlsx";
      a.click();
    },
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
  height: 100px;
  width: 100%;
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
