import { supabase } from '@/lib/supabase'

/**
 * Factory que crea un servicio CRUD genérico para una tabla de Supabase.
 *
 * @param {string} table  - nombre de la tabla
 * @param {object} defaults - { orderBy, ascending }
 */
export function createService(table, defaults = {}) {
  const { orderBy = 'created_at', ascending = false } = defaults

  return {
    /**
     * Obtiene todos los registros.
     * @param {object} options - { select, orderBy, ascending, limit, filters: [[col, op, val]] }
     */
    async getAll(options = {}) {
      let query = supabase.from(table).select(options.select ?? '*')

      if (options.filters) {
        for (const [col, op, val] of options.filters) {
          query = query.filter(col, op, val)
        }
      }

      query = query.order(
        options.orderBy ?? orderBy,
        { ascending: options.ascending ?? ascending }
      )

      if (options.limit) query = query.limit(options.limit)

      const { data, error } = await query
      if (error) throw error
      return data
    },

    /** Obtiene un registro por id. */
    async getById(id) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },

    /** Crea un nuevo registro. */
    async create(payload) {
      const { data, error } = await supabase
        .from(table)
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },

    /** Actualiza un registro por id. */
    async update(id, payload) {
      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },

    /** Elimina un registro por id. */
    async remove(id) {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },

    /** Elimina registros que cumplan un filtro. */
    async removeWhere(col, op, val) {
      const { error } = await supabase.from(table).delete().filter(col, op, val)
      if (error) throw error
    },

    /**
     * Inserta o actualiza un registro si ya existe (por onConflict).
     * @param {object} payload
     * @param {string} onConflict - columna para detectar conflicto
     */
    async upsert(payload, { onConflict } = {}) {
      const { data, error } = await supabase
        .from(table)
        .upsert(payload, { onConflict })
        .select()
        .single()
      if (error) throw error
      return data
    },

    /**
     * Inserta filas en lotes, ignorando duplicados (upsert).
     * @param {Array}  rows
     * @param {object} opts - { onConflict: 'col', batchSize: 100 }
     * @returns {{ inserted: number, skipped: number }}
     */
    async upsertBatch(rows, { onConflict, batchSize = 100 } = {}) {
      let inserted = 0
      let skipped = 0

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize)
        const { data, error } = await supabase
          .from(table)
          .upsert(batch, { onConflict, ignoreDuplicates: true })
          .select()
        if (error) throw error
        inserted += data?.length ?? 0
        skipped += batch.length - (data?.length ?? 0)
      }

      return { inserted, skipped }
    },
  }
}
