import { Inject, Injectable } from '@nestjs/common';
import appConfig, { AppConfig } from '../../config/app.config';
import { INotifier, LeadNotifier } from '../ai/interfaces/notifier.interface';

@Injectable()
export class TgLeadNotifierService implements LeadNotifier {
  constructor(
    @Inject(appConfig.KEY)
    private readonly config: AppConfig,
  ) {}

  async notify(lead: INotifier): Promise<void> {
    const text = [
      '🎫 Новая заявка с сайта с ИИ-бота:',
      `Имя: ${lead.name}`,
      `Телефон: ${lead.phone}`,
      lead.age ? `Возраст ребёнка: ${lead.age}` : null,
      lead.comment ? `Комментарий: ${lead.comment}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const res = await fetch(
      `https://api.telegram.org/bot${this.config.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: this.config.ADMIN_CHAT_ID, text }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Telegram API error ${res.status}: ${body}`);
    }
  }
}
