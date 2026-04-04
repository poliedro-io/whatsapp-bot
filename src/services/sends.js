import { createService } from './api'

export const sendsService = createService('sends', {
  orderBy: 'created_at',
  ascending: false,
})
