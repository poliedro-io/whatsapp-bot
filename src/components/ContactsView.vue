<template>
  <div>
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <h2 class="text-base font-semibold text-foreground">Contactos</h2>
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
          @click="showImport = true"
        >
          <FileSpreadsheet class="size-4" /> Importar Excel
        </button>
        <button
          class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          @click="openCreate"
        >
          <Plus class="size-4" /> Nuevo contacto
        </button>
      </div>
    </div>

    <!-- Search + stats -->
    <div class="flex items-center gap-3 mb-4">
      <div class="relative flex-1 max-w-xs">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          class="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Buscar por nombre o teléfono..."
          v-model="search"
        />
      </div>
      <span class="text-sm text-muted-foreground shrink-0">{{ filteredContacts.length }} contactos</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="size-8 rounded-full border-2 border-border border-t-primary animate-spin" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!contacts.length" class="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
      <Users class="size-12" />
      <p class="text-sm">No hay contactos. Agrega uno o importa desde Excel.</p>
    </div>

    <!-- No results -->
    <div v-else-if="!filteredContacts.length" class="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
      <SearchX class="size-10" />
      <p class="text-sm">Sin resultados para "{{ search }}"</p>
    </div>

    <!-- Table -->
    <div v-else class="rounded-xl border border-border overflow-hidden bg-white">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-muted/50">
              <th class="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Nombre</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Teléfono</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Ciudad</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Notas</th>
              <th class="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="contact in filteredContacts"
              :key="contact.id"
              class="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td class="px-4 py-3 font-medium text-foreground">
                <span v-if="contact.name">{{ contact.name }}</span>
                <span v-else class="text-muted-foreground italic font-normal text-xs">Sin nombre</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5">
                  <Phone class="size-3.5 text-muted-foreground shrink-0" />
                  {{ contact.phone }}
                </div>
              </td>
              <td class="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">
                {{ contact.city || '—' }}
              </td>
              <td class="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">
                {{ contact.notes || '—' }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button
                    class="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    @click="openEdit(contact)"
                    title="Editar"
                  >
                    <Pencil class="size-3.5" />
                  </button>
                  <button
                    class="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    @click="deleteContact(contact)"
                    title="Eliminar"
                  >
                    <Trash2 class="size-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: Crear / Editar -->
    <Teleport to="body">
      <div
        v-if="showForm"
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        @click.self="closeForm"
      >
        <div class="bg-white rounded-xl w-full max-w-md shadow-2xl modal-dialog">
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <h5 class="font-semibold text-sm">
              {{ editing ? 'Editar contacto' : 'Nuevo contacto' }}
            </h5>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              @click="closeForm"
            >
              <X class="size-4" />
            </button>
          </div>

          <form class="p-5 flex flex-col gap-4" @submit.prevent="saveContact">
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">Nombre</label>
              <input
                class="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Nombre del contacto"
                v-model="form.name"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">
                Teléfono <span class="text-destructive">*</span>
              </label>
              <input
                class="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="+56912345678"
                v-model="form.phone"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-1.5">Notas</label>
              <textarea
                class="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows="3"
                placeholder="Notas opcionales..."
                v-model="form.notes"
              />
            </div>

            <div v-if="formError" class="text-xs text-destructive">{{ formError }}</div>

            <div class="flex justify-end gap-2 pt-1">
              <button
                type="button"
                class="px-4 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
                @click="closeForm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                :disabled="saving"
              >
                {{ saving ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Crear contacto') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal: Importar Excel -->
    <Teleport to="body">
      <div
        v-if="showImport"
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        @click.self="closeImport"
      >
        <div class="bg-white rounded-xl w-full max-w-lg shadow-2xl modal-dialog">
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <h5 class="font-semibold text-sm flex items-center gap-2">
              <FileSpreadsheet class="size-4 text-primary" /> Importar desde Excel
            </h5>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              @click="closeImport"
            >
              <X class="size-4" />
            </button>
          </div>

          <div class="p-5 flex flex-col gap-4">
            <!-- Drop zone -->
            <label
              class="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              :class="{ 'border-primary bg-primary/5': importFile }"
            >
              <FileSpreadsheet class="size-10 text-muted-foreground" />
              <div class="text-center">
                <p class="text-sm font-medium text-foreground">
                  {{ importFile ? importFile.name : 'Selecciona un archivo .xlsx o .csv' }}
                </p>
                <p class="text-xs text-muted-foreground mt-1">
                  {{ importFile ? `${importPreview.length} filas detectadas` : 'Haz clic para explorar' }}
                </p>
              </div>
              <input type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="onImportFile" />
            </label>

            <!-- Column mapping -->
            <div v-if="importColumns.length" class="flex flex-col gap-3">
              <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mapeo de columnas</p>
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Columna → Nombre</label>
                  <select
                    class="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    v-model="colName"
                  >
                    <option value="">— Ninguna —</option>
                    <option v-for="col in importColumns" :key="col" :value="col">{{ col }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Columna → Ciudad <span class="text-destructive">*</span></label>
                  <select
                    class="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    v-model="colCity"
                  >
                    <option value="">— Ninguna —</option>
                    <option v-for="col in importColumns" :key="col" :value="col">{{ col }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Columna → Teléfono <span class="text-destructive">*</span></label>
                  <select
                    class="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    v-model="colPhone"
                  >
                    <option value="">— Seleccionar —</option>
                    <option v-for="col in importColumns" :key="col" :value="col">{{ col }}</option>
                  </select>
                </div>
              </div>

              <!-- Preview -->
              <div class="rounded-lg border border-border overflow-hidden">
                <div class="px-3 py-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
                  Vista previa (primeras 3 filas)
                </div>
                <div class="divide-y divide-border">
                  <div
                    v-for="(row, i) in importPreview.slice(0, 3)"
                    :key="i"
                    class="px-3 py-2 text-xs flex items-center gap-3"
                  >
                    <span class="text-foreground font-medium w-28 truncate">{{ colName ? row[colName] : '—' }}</span>
                    <span class="text-muted-foreground w-24 truncate">{{ colCity ? row[colCity] : '—' }}</span>
                    <span class="text-muted-foreground font-mono">{{ colPhone ? formatChilePhone(String(row[colPhone] ?? '')) : '—' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="importError" class="text-xs text-destructive">{{ importError }}</div>

            <div class="flex justify-end gap-2">
              <button
                class="px-4 py-1.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
                @click="closeImport"
              >
                Cancelar
              </button>
              <button
                class="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                :disabled="!colPhone || importing"
                @click="runImport"
              >
                {{ importing ? `Importando...` : `Importar ${importPreview.length} contactos` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { contactsService } from '@/services/contacts'
import * as XLSX from 'xlsx'
import {
  Users, Plus, Search, SearchX, Phone, Pencil, Trash2,
  X, FileSpreadsheet
} from 'lucide-vue-next'

export default {
  components: { Users, Plus, Search, SearchX, Phone, Pencil, Trash2, X, FileSpreadsheet },

  emits: ['toast'],

  data() {
    return {
      contacts: [],
      loading: true,
      search: '',

      // Form (crear/editar)
      showForm: false,
      editing: null,
      form: { name: '', phone: '', notes: '' },
      formError: '',
      saving: false,

      // Import
      showImport: false,
      importFile: null,
      importPreview: [],
      importColumns: [],
      colName: '',
      colCity: '',
      colPhone: '',
      importError: '',
      importing: false,
    }
  },

  computed: {
    filteredContacts() {
      if (!this.search) return this.contacts
      const q = this.search.toLowerCase()
      return this.contacts.filter(
        (c) =>
          c.phone?.toLowerCase().includes(q) ||
          c.name?.toLowerCase().includes(q)
      )
    },
  },

  mounted() {
    this.loadContacts()
  },

  methods: {
    // ── Carga ──────────────────────────────────────────────────────
    async loadContacts() {
      this.loading = true
      try {
        this.contacts = await contactsService.getAll()
      } catch {
        this.$emit('toast', { message: 'Error al cargar contactos', type: 'error' })
      }
      this.loading = false
    },

    // ── Crear / Editar ─────────────────────────────────────────────
    openCreate() {
      this.editing = null
      this.form = { name: '', phone: '', notes: '' }
      this.formError = ''
      this.showForm = true
    },

    openEdit(contact) {
      this.editing = contact
      this.form = { name: contact.name || '', phone: contact.phone, notes: contact.notes || '' }
      this.formError = ''
      this.showForm = true
    },

    closeForm() {
      this.showForm = false
      this.editing = null
    },

    async saveContact() {
      this.formError = ''
      const rawPhone = this.form.phone.trim()
      if (!rawPhone) { this.formError = 'El teléfono es obligatorio.'; return }

      const phone = this.formatChilePhone(rawPhone)
      if (!phone) { this.formError = 'Teléfono inválido. Debe ser un celular chileno (9 dígitos).'; this.saving = false; return }

      this.saving = true
      const payload = { name: this.form.name.trim(), phone, notes: this.form.notes.trim() }

      try {
        if (this.editing) {
          await contactsService.update(this.editing.id, payload)
          this.$emit('toast', { message: 'Contacto actualizado', type: 'success' })
        } else {
          await contactsService.upsert(payload, { onConflict: 'phone' })
          this.$emit('toast', { message: 'Contacto guardado', type: 'success' })
        }
        this.closeForm()
        this.loadContacts()
      } catch (err) {
        this.formError = err.message
      }

      this.saving = false
    },

    // ── Eliminar ───────────────────────────────────────────────────
    async deleteContact(contact) {
      if (!confirm(`¿Eliminar a ${contact.name || contact.phone}?`)) return
      try {
        await contactsService.remove(contact.id)
        this.$emit('toast', { message: 'Contacto eliminado', type: 'success' })
        this.contacts = this.contacts.filter((c) => c.id !== contact.id)
      } catch {
        this.$emit('toast', { message: 'Error al eliminar', type: 'error' })
      }
    },

    // ── Importar Excel ─────────────────────────────────────────────
    closeImport() {
      this.showImport = false
      this.importFile = null
      this.importPreview = []
      this.importColumns = []
      this.colName = ''
      this.colCity = ''
      this.colPhone = ''
      this.importError = ''
    },

    onImportFile(event) {
      const file = event.target.files[0]
      if (!file) return
      this.importFile = file
      this.importError = ''

      const reader = new FileReader()
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet)

        if (!rows.length) {
          this.importError = 'El archivo está vacío o no tiene filas válidas.'
          return
        }

        this.importPreview = rows
        this.importColumns = Object.keys(rows[0])

        // Auto-detectar columnas comunes
        const phoneKeys = ['telefono', 'teléfono', 'phone', 'celular', 'movil', 'móvil', 'numero', 'número', 'telefonos', 'teléfonos']
        const nameKeys = ['nombre', 'name', 'contacto', 'cliente']
        const cityKeys = ['comuna', 'ciudad', 'city', 'localidad', 'region', 'región']

        const foundPhone = this.importColumns.find((c) => phoneKeys.includes(c.toLowerCase()))
        const foundName = this.importColumns.find((c) => nameKeys.includes(c.toLowerCase()))
        const foundCity = this.importColumns.find((c) => cityKeys.includes(c.toLowerCase()))

        if (foundPhone) this.colPhone = foundPhone
        if (foundName) this.colName = foundName
        if (foundCity) this.colCity = foundCity
      }
      reader.readAsArrayBuffer(file)
    },

    /**
     * Formatea un teléfono chileno para WhatsApp: +569XXXXXXXX
     * Acepta formatos: 9XXXXXXXX, 569XXXXXXXX, +569XXXXXXXX, 09XXXXXXXX
     * Si viene separado por - o , toma el primer número.
     */
    formatChilePhone(raw) {
      // Tomar el primer número si hay varios separados por - o ,
      const first = raw.split(/[-,]/)[0].trim()
      // Quitar espacios y caracteres no numéricos excepto +
      let num = first.replace(/[^\d+]/g, '')
      // Quitar + inicial para trabajar solo con dígitos
      num = num.replace(/^\+/, '')
      // Si empieza con 56, quitar el prefijo país
      if (num.startsWith('56')) num = num.slice(2)
      // Si empieza con 0, quitarlo (ej: 09...)
      if (num.startsWith('0')) num = num.slice(1)
      // Debe quedar un número de 9 dígitos empezando con 9
      if (num.length === 9 && num.startsWith('9')) {
        return `+56${num}`
      }
      return '' // número no válido
    },

    async runImport() {
      if (!this.colPhone) return
      this.importing = true
      this.importError = ''

      const rows = this.importPreview
        .map((row) => {
          const phone = this.formatChilePhone(String(row[this.colPhone] ?? ''))
          return {
            name: this.colName ? String(row[this.colName] ?? '').trim() : '',
            city: this.colCity ? String(row[this.colCity] ?? '').trim() : '',
            phone,
            notes: '',
          }
        })
        .filter((r) => r.phone)

      if (!rows.length) {
        this.importError = 'No se encontraron teléfonos válidos con formato chileno.'
        this.importing = false
        return
      }

      try {
        const { inserted, skipped } = await contactsService.upsertBatch(rows, { onConflict: 'phone' })
        this.$emit('toast', {
          message: `${inserted} contactos importados${skipped ? `, ${skipped} duplicados omitidos` : ''}`,
          type: 'success',
        })
        this.closeImport()
        this.loadContacts()
      } catch (err) {
        this.importError = err.message
      }

      this.importing = false
    },
  },
}
</script>
