<template>
  <div class="card content shadow">
    <div class="card-header">
      <h4>
        <i class="bi bi-file-earmark-arrow-down"></i> Data Scraper Bot
      </h4>
    </div>
    <div class="card-content p-3">
      <div class="row">
        <div class="col-12 mb-3">
          <label for="tags"
            >Criterios de busqueda (separalos con Enter, coma o punto y
            coma)</label
          >
          <div class="form-tags-wrapper border rounded p-2">
            <div class="d-flex flex-wrap gap-1 mb-1">
              <span
                v-for="(tag, i) in keyWordsArray"
                :key="i"
                class="badge bg-secondary d-flex align-items-center"
              >
                {{ tag }}
                <button
                  type="button"
                  class="btn-close btn-close-white ms-1"
                  style="font-size: 0.5rem"
                  @click="removeTag(i)"
                ></button>
              </span>
            </div>
            <input
              class="form-control border-0 p-0"
              style="box-shadow: none"
              @keydown="handleTagInput"
              v-model="tagInput"
              placeholder="Escribe y presiona Enter"
            />
          </div>
        </div>
        <div class="col-12">
          <label class="d-flex justify-content-between"> Objetivo </label>
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              id="toAllCheckbox"
              v-model="toAll"
              @change="setAll"
            />
            <label class="form-check-label" for="toAllCheckbox">
              Todo Chile
            </label>
          </div>

          <div v-if="!toAll">
            <div class="d-flex mt-2 mb-2">
              <div class="form-check me-3">
                <input
                  class="form-check-input"
                  type="radio"
                  id="radioRegiones"
                  :value="true"
                  v-model="selectByRegion"
                  @change="setRegionsOrCities"
                />
                <label class="form-check-label" for="radioRegiones"
                  >Regiones</label
                >
              </div>
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="radio"
                  id="radioCiudades"
                  :value="false"
                  v-model="selectByRegion"
                  @change="setRegionsOrCities"
                />
                <label class="form-check-label" for="radioCiudades"
                  >Ciudades</label
                >
              </div>
            </div>

            <select
              class="form-select"
              v-model="selected"
              multiple
              size="5"
            >
              <option
                v-for="(item, i) in items"
                :key="i"
                :value="item.value"
              >
                {{ item.text }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
    <div class="card-footer d-flex justify-content-between">
      <div>{{ selectedLength }} ciudades</div>
      <button
        :disabled="!selectedLength || !keyWordsArray.length"
        class="btn btn-success"
        @click="getData"
      >
        Obtener datos
      </button>
    </div>
  </div>
</template>

<script>
import regions from "../assets/regions.json";

export default {
  emits: ['getData'],
  data() {
    return {
      keyWordsArray: [],
      tagInput: "",
      recipientsStr: "",
      selected: [],
      toAll: false,
      selectByRegion: true,
      regions: regions
        .sort((a, b) => a.id - b.id)
        .map((r) => ({
          text: r.name,
          value: r.provincias.reduce(
            (acc, p) => acc.concat(p.comunas.map((c) => c.name)),
            []
          ),
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
        .sort()
        .map((c) => ({ text: c, value: [c] })),
      items: regions
        .sort((a, b) => a.id - b.id)
        .map((r) => ({
          text: r.name,
          value: r.provincias.reduce(
            (acc, p) => acc.concat(p.comunas.map((c) => c.name)),
            []
          ),
        })),
    };
  },
  computed: {
    selectedLength() {
      return this.selected.reduce((acc, el) => acc.concat(el), []).length;
    },
  },
  methods: {
    handleTagInput(e) {
      if (["Enter", ",", ";"].includes(e.key)) {
        e.preventDefault();
        const val = this.tagInput.trim();
        if (val && !this.keyWordsArray.includes(val)) {
          this.keyWordsArray.push(val);
        }
        this.tagInput = "";
      } else if (
        e.key === "Backspace" &&
        !this.tagInput &&
        this.keyWordsArray.length
      ) {
        this.keyWordsArray.pop();
      }
    },
    removeTag(index) {
      this.keyWordsArray.splice(index, 1);
    },
    setAll() {
      if (this.toAll) {
        this.selected = this.cities.map((c) => c.value);
      } else {
        this.selected = [];
      }
    },
    setRegionsOrCities() {
      this.items = this.selectByRegion ? this.regions : this.cities;
      this.selected = [];
    },
    getData() {
      let payload = {
        keyWords: this.keyWordsArray,
        cities: this.selected.reduce((acc, el) => acc.concat(el), []),
      };
      this.$emit("getData", payload);
    },
  },
};
</script>

<style lang="scss">
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
.form-tags-wrapper {
  background: #fff;
}
</style>
