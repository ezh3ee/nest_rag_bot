import type { Bot } from 'grammy';

export interface BotCommandDef {
  command: string;
  description: string;
  adminOnly: boolean;
}

export const BOT_COMMANDS: BotCommandDef[] = [
  { command: 'start', description: 'Знакомство с ботом', adminOnly: false },
  { command: 'learn', description: 'Как обучить меня документам', adminOnly: true },
  { command: 'docs', description: 'Документы — админ панель', adminOnly: true },
];

type ApiCommand = { command: string; description: string };

function toApiCommands(defs: BotCommandDef[]): ApiCommand[] {
  return defs.map(({ command, description }) => ({ command, description }));
}

export async function syncCommandMenus(bot: Bot, adminChatId: number): Promise<void> {
  const publicCmds = toApiCommands(BOT_COMMANDS.filter((c) => !c.adminOnly));
  const allCmds = toApiCommands(BOT_COMMANDS);

  await bot.api.setMyCommands(publicCmds, { scope: { type: 'default' } });
  await bot.api.setMyCommands(allCmds, {
    scope: { type: 'chat', chat_id: adminChatId },
  });
}

export async function syncGroupCommands(
  bot: Bot,
  groupChatId: number,
  adminChatId: number,
  botIsPresent: boolean,
): Promise<void> {
  const publicCmds = toApiCommands(BOT_COMMANDS.filter((c) => !c.adminOnly));
  const allCmds = toApiCommands(BOT_COMMANDS);
  const groupScope = { type: 'chat' as const, chat_id: groupChatId };

  if (!botIsPresent) {
    await bot.api.setMyCommands([], { scope: groupScope });
    return;
  }

  await bot.api.setMyCommands(publicCmds, { scope: groupScope });

  const adminMember = await bot.api.getChatMember(groupChatId, adminChatId);
  const adminInGroup = adminMember.status !== 'left' && adminMember.status !== 'kicked';
  if (adminInGroup) {
    await bot.api.setMyCommands(allCmds, {
      scope: { type: 'chat_member', chat_id: groupChatId, user_id: adminChatId },
    });
  }
}
