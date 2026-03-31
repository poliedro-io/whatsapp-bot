<template>
  <div class="bg-white rounded-xl border border-border shadow-sm w-full max-w-2xl">
    <!-- Header -->
    <div class="px-5 py-4 border-b border-border flex items-center gap-2">
      <FileDown class="size-5 text-primary" />
      <h4 class="font-semibold text-sm text-foreground">Data Scraper Bot</h4>
    </div>

    <!-- Body -->
    <div class="p-5 flex flex-col gap-5">
      <!-- Keywords -->
      <div>
        <label class="block text-sm font-medium text-muted-foreground mb-1.5">
          Criterios de búsqueda
          <span class="font-normal">(Enter, coma o punto y coma para separar)</span>
        </label>
        <div class="min-h-11 border border-input rounded-lg p-2 bg-white focus-within:ring-2 focus-within:ring-ring">
          <div class="flex flex-wrap gap-1.5 mb-1.5" v-if="keyWordsArray.length">
            <span
              v-for="(tag, i) in keyWordsArray"
              :key="i"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium"
            >
              {{ tag }}
              <button
                class="text-muted-foreground hover:text-foreground transition-colors leading-none"
                @click="removeTag(i)"
              >
                <X class="size-3" />
              </button>
            </span>
          </div>
          <input
            class="w-full text-sm outline-none bg-transparent placeholder:text-muted-foreground"
            @keydown="handleTagInput"
            v-model="tagInput"
            placeholder="Escribe y presiona Enter"
          />
        </div>
      </div>

      <!-- Objetivo -->
      <div>
        <label class="block text-sm font-medium text-muted-foreground mb-2">Objetivo</label>

        <label class="flex items-center gap-2 cursor-pointer mb-3">
          <input
            type="checkbox"
            class="size-4 rounded border-border accent-primary cursor-pointer"
            v-model="toAll"
            @change="setAll"
          />
          <span class="text-sm text-foreground">Todo Chile</span>
        </label>

        <div v-if="!toAll" class="flex flex-col gap-3">
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                class="accent-primary cursor-pointer"
                :value="true"
                v-model="selectByRegion"
                @change="setRegionsOrCities"
              />
              <span class="text-sm text-foreground">Regiones</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                class="accent-primary cursor-pointer"
                :value="false"
                v-model="selectByRegion"
                @change="setRegionsOrCities"
              />
              <span class="text-sm text-foreground">Ciudades</span>
            </label>
          </div>

          <select
            class="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            v-model="selected"
            multiple
            size="5"
          >
            <option
              v-for="(item, i) in items"
              :key="i"
              :value="item.value"
              class="py-1"
            >
              {{ item.text }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-5 py-4 border-t border-border flex items-center justify-between">
      <span class="text-sm text-muted-foreground">{{ selectedLength }} ciudades</span>
      <button
        class="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="!selectedLength || !keyWordsArray.length"
        @click="getData"
      >
        Obtener datos
      </button>
    </div>
  </div>
</template>

<script>
import { X, FileDown } from 'lucide-vue-next'
import regions from "../assets/regions.json"

export default {
  components: { X, FileDown },
  emits: ['getData'],
  data() {
    return {
      keyWordsArray: [],
      tagInput: "",
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
    }
  },
  computed: {
    selectedLength() {
      return this.selected.reduce((acc, el) => acc.concat(el), []).length
    },
  },
  methods: {
    handleTagInput(e) {
      if (["Enter", ",", ";"].includes(e.key)) {
        e.preventDefault()
        const val = this.tagInput.trim()
        if (val && !this.keyWordsArray.includes(val)) {
          this.keyWordsArray.push(val)
        }
        this.tagInput = ""
      } else if (e.key === "Backspace" && !this.tagInput && this.keyWordsArray.length) {
        this.keyWordsArray.pop()
      }
    },
    removeTag(index) {
      this.keyWordsArray.splice(index, 1)
    },
    setAll() {
      if (this.toAll) {
        this.selected = this.cities.map((c) => c.value)
      } else {
        this.selected = []
      }
    },
    setRegionsOrCities() {
      this.items = this.selectByRegion ? this.regions : this.cities
      this.selected = []
    },
    getData() {
      this.$emit("getData", {
        keyWords: this.keyWordsArray,
        cities: this.selected.reduce((acc, el) => acc.concat(el), []),
      })
    },
  },
}
</script>
