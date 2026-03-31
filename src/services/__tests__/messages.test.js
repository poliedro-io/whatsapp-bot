import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock de Supabase (mismo patrón que contacts.test.js) ---

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
import { messagesService } from '../messages'

// --- Tests ---

describe('messagesService (CRUD messages)', () => {
  beforeEach(() => {
    queryBuilder = createQueryBuilder()
    mockResult = { data: null, error: null }
    vi.clearAllMocks()
  })

  // ==================== getAll ====================

  describe('getAll', () => {
    it('retorna todos los mensajes ordenados por sent_at desc', async () => {
      const messages = [
        { id: '1', phone: '+56911111111', status: 'sent', error: null, sent_at: '2026-03-30' },
        { id: '2', phone: '+56922222222', status: 'failed', error: 'timeout', sent_at: '2026-03-29' },
      ]
      mockResult = { data: messages, error: null }

      const result = await messagesService.getAll()

      expect(supabase.from).toHaveBeenCalledWith('messages')
      expect(queryBuilder.select).toHaveBeenCalledWith('*')
      expect(queryBuilder.order).toHaveBeenCalledWith('sent_at', { ascending: false })
      expect(result).toEqual(messages)
    })

    it('filtra mensajes por status', async () => {
      mockResult = { data: [], error: null }

      await messagesService.getAll({
        filters: [['status', 'eq', 'failed']],
      })

      expect(queryBuilder.filter).toHaveBeenCalledWith('status', 'eq', 'failed')
    })

    it('aplica múltiples filtros', async () => {
      mockResult = { data: [], error: null }

      await messagesService.getAll({
        filters: [
          ['status', 'eq', 'sent'],
          ['phone', 'eq', '+56911111111'],
        ],
      })

      expect(queryBuilder.filter).toHaveBeenCalledTimes(2)
      expect(queryBuilder.filter).toHaveBeenCalledWith('status', 'eq', 'sent')
      expect(queryBuilder.filter).toHaveBeenCalledWith('phone', 'eq', '+56911111111')
    })

    it('lanza error cuando Supabase falla', async () => {
      mockResult = { data: null, error: { message: 'connection refused' } }

      await expect(messagesService.getAll()).rejects.toEqual({ message: 'connection refused' })
    })
  })

  // ==================== getById ====================

  describe('getById', () => {
    it('retorna un mensaje por id', async () => {
      const msg = { id: 'msg-1', phone: '+56911111111', status: 'sent' }
      mockResult = { data: msg, error: null }

      const result = await messagesService.getById('msg-1')

      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'msg-1')
      expect(queryBuilder.single).toHaveBeenCalled()
      expect(result).toEqual(msg)
    })
  })

  // ==================== create ====================

  describe('create', () => {
    it('crea un registro de mensaje', async () => {
      const payload = { phone: '+56933333333', status: 'sent' }
      const created = { id: 'msg-new', ...payload, sent_at: '2026-03-30' }
      mockResult = { data: created, error: null }

      const result = await messagesService.create(payload)

      expect(queryBuilder.insert).toHaveBeenCalledWith(payload)
      expect(result).toEqual(created)
    })

    it('crea un mensaje con estado failed y error', async () => {
      const payload = { phone: '+56933333333', status: 'failed', error: 'número inválido' }
      const created = { id: 'msg-err', ...payload, sent_at: '2026-03-30' }
      mockResult = { data: created, error: null }

      const result = await messagesService.create(payload)

      expect(queryBuilder.insert).toHaveBeenCalledWith(payload)
      expect(result.status).toBe('failed')
      expect(result.error).toBe('número inválido')
    })
  })

  // ==================== update ====================

  describe('update', () => {
    it('actualiza el status de un mensaje', async () => {
      const updated = { id: 'msg-1', phone: '+56911111111', status: 'delivered' }
      mockResult = { data: updated, error: null }

      const result = await messagesService.update('msg-1', { status: 'delivered' })

      expect(queryBuilder.update).toHaveBeenCalledWith({ status: 'delivered' })
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'msg-1')
      expect(result.status).toBe('delivered')
    })
  })

  // ==================== remove ====================

  describe('remove', () => {
    it('elimina un mensaje por id', async () => {
      mockResult = { error: null }

      await expect(messagesService.remove('msg-1')).resolves.toBeUndefined()

      expect(queryBuilder.delete).toHaveBeenCalled()
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'msg-1')
    })
  })

  // ==================== removeWhere ====================

  describe('removeWhere', () => {
    it('elimina mensajes fallidos de un teléfono', async () => {
      mockResult = { error: null }

      await messagesService.removeWhere('status', 'eq', 'failed')

      expect(queryBuilder.delete).toHaveBeenCalled()
      expect(queryBuilder.filter).toHaveBeenCalledWith('status', 'eq', 'failed')
    })
  })

  // ==================== upsertBatch ====================

  describe('upsertBatch', () => {
    it('inserta mensajes en lote', async () => {
      const rows = [
        { phone: '+56900000001', status: 'sent' },
        { phone: '+56900000002', status: 'sent' },
      ]
      mockResult = { data: rows, error: null }

      const result = await messagesService.upsertBatch(rows, { onConflict: 'id' })

      expect(result).toEqual({ inserted: 2, skipped: 0 })
    })
  })
})
