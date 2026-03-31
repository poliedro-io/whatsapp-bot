import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock de Supabase ---
// Construimos un query builder chainable que simula la API de supabase-js.
// Cada test configura `mockResult` para definir { data, error } del query.

let mockResult = { data: null, error: null }

function createQueryBuilder() {
  const builder = {}
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'filter', 'order', 'limit', 'single',
  ]
  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder)
  }
  // El último método en la cadena resuelve la promesa
  builder.then = function (resolve) {
    resolve(mockResult)
  }
  return builder
}

let queryBuilder

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => queryBuilder),
  },
}))

import { supabase } from '@/lib/supabase'
import { contactsService } from '../contacts'

// --- Tests ---

describe('contactsService (CRUD contacts)', () => {
  beforeEach(() => {
    queryBuilder = createQueryBuilder()
    mockResult = { data: null, error: null }
    vi.clearAllMocks()
  })

  // ==================== getAll ====================

  describe('getAll', () => {
    it('retorna todos los contactos', async () => {
      const contacts = [
        { id: '1', name: 'Ana', phone: '+56911111111', notes: null, created_at: '2026-01-01' },
        { id: '2', name: 'Luis', phone: '+56922222222', notes: 'VIP', created_at: '2026-01-02' },
      ]
      mockResult = { data: contacts, error: null }

      const result = await contactsService.getAll()

      expect(supabase.from).toHaveBeenCalledWith('contacts')
      expect(queryBuilder.select).toHaveBeenCalledWith('*')
      expect(queryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toEqual(contacts)
    })

    it('aplica filtros cuando se pasan', async () => {
      mockResult = { data: [], error: null }

      await contactsService.getAll({
        filters: [['name', 'eq', 'Ana']],
      })

      expect(queryBuilder.filter).toHaveBeenCalledWith('name', 'eq', 'Ana')
    })

    it('aplica limit cuando se pasa', async () => {
      mockResult = { data: [], error: null }

      await contactsService.getAll({ limit: 5 })

      expect(queryBuilder.limit).toHaveBeenCalledWith(5)
    })

    it('permite sobreescribir orderBy y ascending', async () => {
      mockResult = { data: [], error: null }

      await contactsService.getAll({ orderBy: 'name', ascending: true })

      expect(queryBuilder.order).toHaveBeenCalledWith('name', { ascending: true })
    })

    it('permite seleccionar columnas específicas', async () => {
      mockResult = { data: [], error: null }

      await contactsService.getAll({ select: 'id,name' })

      expect(queryBuilder.select).toHaveBeenCalledWith('id,name')
    })

    it('lanza error cuando Supabase falla', async () => {
      mockResult = { data: null, error: { message: 'table not found' } }

      await expect(contactsService.getAll()).rejects.toEqual({ message: 'table not found' })
    })
  })

  // ==================== getById ====================

  describe('getById', () => {
    it('retorna un contacto por id', async () => {
      const contact = { id: 'abc-123', name: 'Ana', phone: '+56911111111' }
      mockResult = { data: contact, error: null }

      const result = await contactsService.getById('abc-123')

      expect(supabase.from).toHaveBeenCalledWith('contacts')
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'abc-123')
      expect(queryBuilder.single).toHaveBeenCalled()
      expect(result).toEqual(contact)
    })

    it('lanza error si no existe', async () => {
      mockResult = { data: null, error: { message: 'Row not found', code: 'PGRST116' } }

      await expect(contactsService.getById('no-existe')).rejects.toEqual({
        message: 'Row not found',
        code: 'PGRST116',
      })
    })
  })

  // ==================== create ====================

  describe('create', () => {
    it('crea un contacto y retorna el registro', async () => {
      const newContact = { name: 'Carlos', phone: '+56933333333', notes: '' }
      const created = { id: 'new-id', ...newContact, created_at: '2026-03-30' }
      mockResult = { data: created, error: null }

      const result = await contactsService.create(newContact)

      expect(queryBuilder.insert).toHaveBeenCalledWith(newContact)
      expect(queryBuilder.select).toHaveBeenCalled()
      expect(queryBuilder.single).toHaveBeenCalled()
      expect(result).toEqual(created)
    })

    it('lanza error si el teléfono ya existe (unique constraint)', async () => {
      mockResult = {
        data: null,
        error: { message: 'duplicate key value violates unique constraint', code: '23505' },
      }

      await expect(
        contactsService.create({ name: 'Dup', phone: '+56911111111' })
      ).rejects.toEqual(expect.objectContaining({ code: '23505' }))
    })
  })

  // ==================== update ====================

  describe('update', () => {
    it('actualiza un contacto por id y retorna el registro', async () => {
      const updated = { id: 'abc-123', name: 'Ana María', phone: '+56911111111' }
      mockResult = { data: updated, error: null }

      const result = await contactsService.update('abc-123', { name: 'Ana María' })

      expect(queryBuilder.update).toHaveBeenCalledWith({ name: 'Ana María' })
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'abc-123')
      expect(queryBuilder.single).toHaveBeenCalled()
      expect(result).toEqual(updated)
    })

    it('lanza error si el id no existe', async () => {
      mockResult = { data: null, error: { message: 'Row not found' } }

      await expect(
        contactsService.update('no-existe', { name: 'X' })
      ).rejects.toEqual({ message: 'Row not found' })
    })
  })

  // ==================== remove ====================

  describe('remove', () => {
    it('elimina un contacto por id sin error', async () => {
      mockResult = { error: null }

      await expect(contactsService.remove('abc-123')).resolves.toBeUndefined()

      expect(queryBuilder.delete).toHaveBeenCalled()
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'abc-123')
    })

    it('lanza error cuando falla la eliminación', async () => {
      mockResult = { error: { message: 'foreign key violation' } }

      await expect(contactsService.remove('abc-123')).rejects.toEqual({
        message: 'foreign key violation',
      })
    })
  })

  // ==================== removeWhere ====================

  describe('removeWhere', () => {
    it('elimina contactos que cumplan un filtro', async () => {
      mockResult = { error: null }

      await contactsService.removeWhere('phone', 'eq', '+56911111111')

      expect(queryBuilder.delete).toHaveBeenCalled()
      expect(queryBuilder.filter).toHaveBeenCalledWith('phone', 'eq', '+56911111111')
    })
  })

  // ==================== upsertBatch ====================

  describe('upsertBatch', () => {
    it('inserta un lote de contactos', async () => {
      const rows = [
        { name: 'A', phone: '+56900000001' },
        { name: 'B', phone: '+56900000002' },
      ]
      mockResult = { data: rows, error: null }

      const result = await contactsService.upsertBatch(rows, { onConflict: 'phone' })

      expect(queryBuilder.upsert).toHaveBeenCalledWith(rows, {
        onConflict: 'phone',
        ignoreDuplicates: true,
      })
      expect(result).toEqual({ inserted: 2, skipped: 0 })
    })

    it('reporta duplicados skipped correctamente', async () => {
      const rows = [
        { name: 'A', phone: '+56900000001' },
        { name: 'B', phone: '+56900000002' },
        { name: 'C', phone: '+56900000003' },
      ]
      // Supabase solo retorna 1 fila (las otras 2 eran duplicados)
      mockResult = { data: [rows[2]], error: null }

      const result = await contactsService.upsertBatch(rows, { onConflict: 'phone' })

      expect(result).toEqual({ inserted: 1, skipped: 2 })
    })

    it('procesa en lotes según batchSize', async () => {
      const rows = Array.from({ length: 5 }, (_, i) => ({
        name: `Contact ${i}`,
        phone: `+5690000000${i}`,
      }))
      mockResult = { data: rows.slice(0, 2), error: null }

      // batchSize = 2 -> 3 llamadas (2+2+1)
      await contactsService.upsertBatch(rows, { onConflict: 'phone', batchSize: 2 })

      // supabase.from se llama una vez por batch
      expect(supabase.from).toHaveBeenCalledTimes(3)
    })

    it('lanza error si un lote falla', async () => {
      mockResult = { data: null, error: { message: 'batch insert failed' } }

      await expect(
        contactsService.upsertBatch([{ name: 'X', phone: '+569' }], { onConflict: 'phone' })
      ).rejects.toEqual({ message: 'batch insert failed' })
    })
  })
})
