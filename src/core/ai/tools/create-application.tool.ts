import { tool } from 'ai';
import { LeadNotifier, notifyToolSchema } from '../interfaces/notifier.interface';

export const createApplicationTool = (lead: LeadNotifier) =>
  tool({
    description: `
        'Отправить заявку на тренировку. Вызывай ТОЛЬКО когда известны имя,телефон.
        Говори, что телефон можно написать в формате +7XXXXXXXXXX или 8XXXXXXXXXX или XXXXXXXXXX
        Также желательно еще и возраст ребенка и комментарий к заявке. 
        Но это по желанию и не обязательно.
      'Если чего-то из обязательного не хватает, спроси у пользователя, не вызывай инструмент.
    `,
    inputSchema: notifyToolSchema,
    execute: async ({ name, phone, age, comment }) => {
      await lead.notify({ name, phone, age, comment });
      return { success: true, message: 'Заявка отправлена' };
    },
  });
