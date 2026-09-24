import z from 'zod';

export interface INotifier {
  name: string;
  phone: string;
  age?: number;
  comment?: string;
}

const phoneSchema = z
  .string()
  .describe('Телефон клиента. Передавай как написал пользователь, не меняй формат')
  .transform((raw) => raw.replace(/\D/g, ''))
  .refine((digits) => digits.length >= 10 && digits.length <= 12, {
    message: 'В номере должно быть 10-12 сомволов. Телефон указан неверно',
  })
  .transform((digits) =>
    digits.length === 11 && digits.startsWith('8') ? `+7${digits.slice(1)}` : `+${digits}`,
  );

export const notifyToolSchema = z.object({
  name: z.string().describe('Имя ребёнка').min(2),
  phone: phoneSchema,
  age: z
    .number()
    .int()
    .min(4)
    .max(18)
    .positive()
    .optional()
    .transform((val) => val && Math.round(val))
    .describe('Возраст ребёнка'),
  comment: z.string().optional().describe('Комментарий'),
});

export interface LeadNotifier {
  notify(lead: INotifier): Promise<void>;
}

export const LEAD_NOTIFIER = Symbol('LEAD_NOTIFIER');
