import { ChannelType, PermissionFlagsBits as P } from 'discord.js';
export const CLASS_ROLES = ['Knight', 'Archer', 'Mage', 'Rogue'];
export const ROLE_DEFINITIONS = [
  { name: 'Moderator', color: 0x9766d5, permissions: [P.ModerateMembers, P.ManageMessages] },
  { name: 'Adventurer', color: 0xd2b4ed, permissions: [] },
  ...CLASS_ROLES.map((name, i) => ({
    name,
    color: [0x668ddb, 0x5fa761, 0xa37ae0, 0xb15c83][i],
    permissions: [],
  })),
];
export const CHANNEL_GROUPS = [
  {
    name: 'START HERE',
    readOnly: true,
    channels: ['welcome', 'rules', 'announcements', 'pick-your-class'],
  },
  {
    name: 'THE REALM',
    readOnly: true,
    channels: ['development-updates', 'showcase', 'game-links'],
  },
  {
    name: 'TAVERN',
    channels: ['general', 'introductions', 'class-discussion', 'suggestions', 'bug-reports'],
  },
  { name: 'STAFF', private: true, channels: ['staff-chat', 'mod-log'] },
];
export function isCosmeticRole(role) {
  return (
    !!role &&
    !role.managed &&
    role.permissions.bitfield === 0n &&
    ['Adventurer', ...CLASS_ROLES].includes(role.name)
  );
}
export function trustedGuild(id, configured) {
  return !!configured && id === configured;
}
export function gameUrl(value) {
  const u = new URL(value);
  if (
    u.protocol !== 'https:' ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    u.pathname !== '/'
  )
    throw new Error(
      'GAME_URL must be the HTTPS origin of your game, for example https://your-game.vercel.app',
    );
  return u.origin;
}
export function welcomePayload(memberId, url) {
  if (!/^\d{17,22}$/.test(memberId)) throw new Error('Invalid Discord member ID');
  return {
    content: `Welcome <@${memberId}> to **Realm of Shadows**! Read #rules, introduce yourself, and pick a class role in #pick-your-class.\nPlay: ${url}\nDevelopment gallery: ${url}/showcase`,
    allowedMentions: { parse: [], users: [memberId] },
  };
}
export function plannedSetup() {
  return `Roles: ${ROLE_DEFINITIONS.map((r) => r.name).join(', ')}\n\n${CHANNEL_GROUPS.map((g) => `**${g.name}**${g.private ? ' (staff only)' : g.readOnly ? ' (read only)' : ''}\n${g.channels.map((n) => '#' + n).join(', ')}`).join('\n\n')}\n\nExisting matching roles and channels are reused without changing their permissions. No channels, roles, or messages are deleted.`;
}
export async function setupCommunity(guild, botId) {
  await guild.roles.fetch();
  await guild.channels.fetch();
  const roles = new Map();
  const counts = { roles: 0, categories: 0, channels: 0 };
  for (const spec of ROLE_DEFINITIONS) {
    let role = guild.roles.cache.find((r) => r.name === spec.name && !r.managed);
    if (!role) {
      role = await guild.roles.create({ ...spec, reason: 'Realm of Shadows community setup' });
      counts.roles++;
    }
    roles.set(spec.name, role);
  }
  const result = new Map();
  for (const group of CHANNEL_GROUPS) {
    let category = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name === group.name,
    );
    if (
      category &&
      group.private &&
      !category.permissionOverwrites.cache.get(guild.id)?.deny.has(P.ViewChannel)
    ) {
      throw new Error(
        'Existing STAFF category must hide ViewChannel from everyone before it can be reused.',
      );
    }
    if (!category) {
      const everyone = group.private
        ? { deny: [P.ViewChannel] }
        : group.readOnly
          ? {
              allow: [P.ViewChannel],
              deny: [
                P.SendMessages,
                P.AddReactions,
                P.CreatePublicThreads,
                P.CreatePrivateThreads,
                P.SendMessagesInThreads,
              ],
            }
          : { allow: [P.ViewChannel, P.SendMessages] };
      category = await guild.channels.create({
        name: group.name,
        type: ChannelType.GuildCategory,
        reason: 'Realm of Shadows community setup',
        permissionOverwrites: [
          { id: guild.id, ...everyone },
          {
            id: botId,
            allow: [
              P.ViewChannel,
              P.SendMessages,
              P.AttachFiles,
              P.EmbedLinks,
              P.ReadMessageHistory,
            ],
          },
          {
            id: roles.get('Moderator').id,
            allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory],
          },
        ],
      });
      counts.categories++;
    }
    for (const name of group.channels) {
      let channel = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildText && c.name === name && c.parentId === category.id,
      );
      if (!channel) {
        channel = await guild.channels.create({
          name,
          type: ChannelType.GuildText,
          parent: category.id,
          reason: 'Realm of Shadows community setup',
        });
        counts.channels++;
      }
      result.set(name, channel);
    }
  }
  return { counts, channels: result, roles };
}
export const NO_MENTIONS = { parse: [] };
export async function seedMessage(channel, key, payload, botId) {
  const pinned = await channel.messages.fetchPins();
  if (
    pinned.items.some(
      (p) => p.message.author.id === botId && p.message.embeds.some((e) => e.footer?.text === key),
    )
  )
    return false;
  const recent = await channel.messages.fetch({ limit: 100 });
  if (recent.some((m) => m.author.id === botId && m.embeds.some((e) => e.footer?.text === key)))
    return false;
  const message = await channel.send({
    ...payload,
    allowedMentions: NO_MENTIONS,
    embeds: [{ color: 0xa768e5, ...payload.embeds?.[0], footer: { text: key } }],
  });
  try {
    await message.pin();
  } catch {
    /* The marker also works without permission to pin. */
  }
  return true;
}
