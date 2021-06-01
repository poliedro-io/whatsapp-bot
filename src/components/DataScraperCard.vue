<template>
  <div class="card content shadow">
    <div class="card-header">
      <h4>
        <b-icon-file-earmark-arrow-down></b-icon-file-earmark-arrow-down> Data
        Scraper Bot
      </h4>
    </div>
    <div class="card-content p-3">
      <div class="row">
        <div class="col-12">
          <label for="tags"
            >Criterios de búsqueda (separalos con una coma o punto y
            coma)</label
          >
          <b-form-tags
            input-id="tags"
            v-model="keyWordsArray"
            separator=",;"
            placeholder=""
            no-add-on-enter
            tag-removed-label="Elemento eliminado"
            add-button-text="Agregar"
          ></b-form-tags>
          <p class="mt-2">Value: {{ keyWordsArray }}</p>
        </div>
        <div class="col-12">
          <label class="d-flex justify-content-between">
            Objetivo
          </label>
          <b-form-checkbox
            id="checkbox"
            v-model="toAll"
            v-on:change="setAll"
            name="checkbox"
            :value="true"
            :unchecked-value="false"
          >
            Todo Chile
          </b-form-checkbox>

          <div v-if="!toAll">
            <b-form-group>
              <b-form-radio-group
                id="radio-group"
                v-model="selectByRegion"
                v-on:change="setRegionsOrCities"
                :options="[
                  { text: 'Regiones', value: true },
                  { text: 'Ciudades', value: false },
                ]"
                name="radio-options"
              ></b-form-radio-group>
            </b-form-group>

            <b-form-select
              v-model="selected"
              :options="items"
              multiple
              :select-size="5"
            ></b-form-select>
          </div>
         
        </div>
      </div>
    </div>
    <div class="card-footer d-flex justify-content-between">
      <!-- <div>{{host}}</div> -->
      <div>{{ selectedLength }} ciudades</div>
      <button
        :disabled="!selectedLength || !keyWordsArray.length"
        class="btn btn-success"
        @click="showConfirmDialog"
      >
        Obtener datos
      </button>
    </div>
  </div>
</template>

<script>
import regions from "../assets/regions.json";

export default {
  data() {
    return {
      keyWordsArray: [],
      recipientsStr: "",
      selected: [],
      toAll: false,
      selectByRegion: true,
      regions: regions.sort((a, b) => a.id - b.id).map((r) => 
      ({text: r.name,
        value: r.provincias.reduce(
                (acc, p) => acc.concat(p.comunas.map((c) => c.name)),
                []
              )
      })),
      cities: regions
        .reduce(
          (acc, r) =>
            acc.concat(
              r.provincias.reduce(
                (rAcc, p) => rAcc.concat(p.comunas.map((c) => c.name)),
                []
              )
            ),
          []
        )
        .sort(),
      items: regions.sort((a, b) => a.id - b.id).map((r) => 
      ({text: r.name,
        value: r.provincias.reduce(
                (acc, p) => acc.concat(p.comunas.map((c) => c.name)),
                []
              )
      })),
    };
  },
  computed: {
    recipientsArr: function() {
      return this.recipientsStr.split("\n").filter((s) => s != "");
    },
    host: function() {
      return location.origin;
    },
    selectedLength: function() {
      return this.selected.reduce((acc, el)=> acc.concat(el),[]).length
    }
  },
  methods: {
  
    setAll() {
      this.selected = this.toAll ? this.cities : [];
    },
    setRegionsOrCities() {
      this.items = this.selectByRegion ? this.regions : this.cities;
    },
    showConfirmDialog() {
      this.$bvModal
        .msgBoxConfirm(
          `¿Estás seguro que quieres obtener datos de ${
            this.selectedLength > 1
              ? `${this.selectedLength} ciudades`
              : "esta ciudad"
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
          value ? this.getData() : false;
        })
        .catch((err) => {
          console.log(err.message);
          // An error occurred
        });
    },
    getData() {
      let payload = {
        keyWords: this.keyWordsArray,
        cities: this.selected.reduce((acc, el)=> acc.concat(el),[])
      };
      this.$emit("getData", payload);
    }
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
</style>
