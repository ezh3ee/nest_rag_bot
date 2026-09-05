import type { Context } from 'grammy';

export function isAdmin(ctx: Context, adminChatId: number): boolean {
  return ctx.from?.id === adminChatId;
}
