import { createService } from './api'

export const contactsService = createService('contacts', {
  orderBy: 'created_at',
  ascending: false,
})
