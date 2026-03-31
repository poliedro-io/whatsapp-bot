import { createService } from './api'

export const messagesService = createService('messages', {
  orderBy: 'sent_at',
  ascending: false,
})
