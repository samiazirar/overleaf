import { z } from 'zod'

export const Agent2EventSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('reasoning'), id: z.string().optional(), text: z.string() }),
  z.object({ kind: z.literal('message'), id: z.string().optional(), role: z.string().optional(), text: z.string() }),
  z.object({
    kind: z.literal('tool'),
    id: z.string().optional(),
    name: z.string(),
    phase: z.enum(['start', 'running', 'done', 'error']),
    summary: z.string().optional(),
  }),
  z.object({ kind: z.literal('status'), state: z.enum(['running', 'idle']) }),
  z.object({ kind: z.literal('done') }),
  z.object({ kind: z.literal('error'), message: z.string() }),
])

export type Agent2Event = z.infer<typeof Agent2EventSchema>
