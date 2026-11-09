import {
  Client,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits as P,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Routes,
  AttachmentBuilder,
} from 'discord.js';
import { commands } from './commands.mjs';
import {
  trustedGuild,
  isCosmeticRole,
  gameUrl,
  setupCommunity,
  plannedSetup,
  seedMessage,
  welcomePayload,
  CLASS_ROLES,
  NO_MENTIONS,
} from './community.mjs';
import { loadCatalog, selectCard } from './catalog.mjs';
const { DISCORD_BOT_TOKEN: token, DISCORD_GUILD_ID: guildId, GAME_URL } = process.env;
if (!token || !/^\d{17,22}$/.test(guildId ?? '') || !GAME_URL) {
  console.error(
    'Set DISCORD_BOT_TOKEN, DISCORD_GUILD_ID and GAME_URL in the private environment. See apps/discord-bot/README.md.',
  );
  process.exit(1);
}
const url = gameUrl(GAME_URL),
  cards = await loadCatalog();
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  allowedMentions: NO_MENTIONS,
});
const roleJobs = new Set(),
  setupJobs = new Set();
const privateReply = (content) => ({
  content,
  flags: MessageFlags.Ephemeral,
  allowedMentions: NO_MENTIONS,
});
const menu = () =>
  new ActionRowBuilder().addComponents(
    CLASS_ROLES.map((name) =>
      new ButtonBuilder()
        .setCustomId('class:' + name)
        .setLabel(name)
        .setStyle(ButtonStyle.Secondary),
    ),
  );
function failure(error) {
  console.error('Discord operation failed', {
    name: error?.name ?? 'Error',
    code: error?.code ?? 'unknown',
  });
}
function findChannel(guild, name) {
  return guild.channels.cache.find(
    (c) =>
      c.name === name &&
      c.isTextBased() &&
      !c.isThread() &&
      ['THE REALM', 'START HERE', 'TAVERN', 'STAFF'].includes(c.parent?.name),
  );
}
async function audit(guild, content) {
  const channel = findChannel(guild, 'mod-log');
  if (
    !channel ||
    !channel.parent?.permissionOverwrites.cache.get(guild.id)?.deny.has(P.ViewChannel)
  )
    return;
  await channel.send({ content, allowedMentions: NO_MENTIONS });
}
client.once(Events.ClientReady, async (ready) => {
  try {
    const guild = await ready.guilds.fetch(guildId);
    await client.rest.put(Routes.applicationGuildCommands(ready.user.id, guildId), {
      body: commands,
    });
    await guild.channels.fetch();
    console.log(
      `Realm community bot ready in ${guild.name}. Commands registered for the configured server.`,
    );
  } catch (e) {
    failure(e);
    client.destroy();
    process.exitCode = 1;
  }
});
client.on(Events.GuildMemberAdd, async (member) => {
  if (!trustedGuild(member.guild.id, guildId) || member.user.bot) return;
  try {
    const role = member.guild.roles.cache.find((r) => r.name === 'Adventurer' && isCosmeticRole(r));
    if (role?.editable) await member.roles.add(role, 'New Realm of Shadows member');
    const channel = findChannel(member.guild, 'welcome');
    if (channel) await channel.send(welcomePayload(member.id, url));
  } catch (e) {
    failure(e);
  }
});
client.on(Events.InteractionCreate, async (i) => {
  if (!trustedGuild(i.guildId, guildId)) {
    if (i.isAutocomplete()) await i.respond([]);
    else if (i.isRepliable())
      await i.reply(privateReply('This bot is configured for the Realm of Shadows server only.'));
    return;
  }
  try {
    if (i.isAutocomplete()) {
      if (!i.memberPermissions?.has(P.ManageGuild)) return i.respond([]);
      const query = String(i.options.getFocused()).toLowerCase();
      return i.respond(
        cards
          .filter((c) => `${c.title} ${c.id}`.toLowerCase().includes(query))
          .slice(0, 25)
          .map((c) => ({ name: `${c.title} · ${c.id}`.slice(0, 100), value: c.id })),
      );
    }
    if (i.isButton() && i.customId.startsWith('class:')) {
      const name = i.customId.slice(6);
      if (!CLASS_ROLES.includes(name)) return i.reply(privateReply('Unknown class role.'));
      if (roleJobs.has(i.user.id))
        return i.reply(privateReply('Your previous role change is still finishing.'));
      roleJobs.add(i.user.id);
      try {
        await i.deferReply({ flags: MessageFlags.Ephemeral });
        const member = await i.guild.members.fetch(i.user.id);
        const roles = await i.guild.roles.fetch();
        const role = roles.find((r) => r.name === name && isCosmeticRole(r));
        if (!role?.editable)
          return i.editReply(
            'The class role is missing, has extra permissions, or is above the bot. Ask the owner to check setup and role order.',
          );
        const old = member.roles.cache.filter(
          (r) =>
            CLASS_ROLES.includes(r.name) && isCosmeticRole(r) && r.editable && r.id !== role.id,
        );
        await member.roles.add(role, 'Member selected cosmetic class role');
        if (old.size)
          await member.roles.remove([...old.keys()], 'Member changed cosmetic class role');
        await i.editReply(
          `Your Discord class role is now ${name}. This does not change your in-game class.`,
        );
      } finally {
        roleJobs.delete(i.user.id);
      }
      return;
    }
    if (!i.isChatInputCommand()) return;
    const name = i.commandName;
    const required =
      name === 'timeout'
        ? P.ModerateMembers
        : name === 'purge'
          ? P.ManageMessages
          : ['links', 'roles'].includes(name)
            ? null
            : P.ManageGuild;
    if (required && !i.memberPermissions?.has(required))
      return i.reply(privateReply('You do not have permission to run this command.'));
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    if (name === 'links')
      return i.editReply(`**Realm of Shadows**\nPlay: ${url}\nPreviews: ${url}/showcase`);
    if (name === 'roles')
      return i.editReply({
        content: 'Choose a cosmetic Discord class role. Your in-game class is unchanged.',
        components: [menu()],
      });
    if (name === 'setup') {
      if (!i.options.getBoolean('apply'))
        return i.editReply(plannedSetup() + '\n\nRun `/setup apply:true` to create this layout.');
      if (setupJobs.has(guildId)) return i.editReply('Setup is already running.');
      setupJobs.add(guildId);
      try {
        const me = await i.guild.members.fetchMe();
        if (
          ![
            P.ManageChannels,
            P.ManageRoles,
            P.ViewChannel,
            P.SendMessages,
            P.ReadMessageHistory,
            P.EmbedLinks,
            P.AttachFiles,
          ].every((p) => me.permissions.has(p))
        )
          return i.editReply(
            'The bot is missing setup permissions. Re-invite it using the documented invitation, then retry.',
          );
        const result = await setupCommunity(i.guild, client.user.id);
        const messages = [
          [
            'welcome',
            'Welcome to Realm of Shadows',
            'A community for the game’s development and adventures. Read the rules, introduce yourself, and follow the journey.',
          ],
          [
            'rules',
            'Community rules',
            'Be respectful. No harassment, hate, spam, scams, or sharing private information. Keep discussion appropriate for the community. Report problems to the moderators. No story spoilers in public channels.',
          ],
          [
            'pick-your-class',
            'Choose your Discord class',
            'Use the buttons below to choose Knight, Archer, Mage, or Rogue. These are community roles, not in-game class unlocks.',
          ],
          ['game-links', 'Enter the realm', `Play: ${url}\nBrowse game previews: ${url}/showcase`],
        ];
        for (const [channelName, title, description] of messages)
          await seedMessage(
            result.channels.get(channelName),
            'ros:seed:' + channelName,
            {
              embeds: [{ title, description }],
              ...(channelName === 'pick-your-class' ? { components: [menu()] } : {}),
            },
            client.user.id,
          );
        await i.editReply(
          `Setup complete: ${result.counts.roles} roles, ${result.counts.categories} categories and ${result.counts.channels} channels created. Existing matching resources were preserved. Move the bot role above Adventurer and the four class roles. Use /catalog to browse updates.`,
        );
      } finally {
        setupJobs.delete(guildId);
      }
      return;
    }
    if (name === 'catalog') {
      const q = (i.options.getString('search') ?? '').toLowerCase();
      const matches = cards.filter((c) => `${c.title} ${c.id}`.toLowerCase().includes(q));
      const list = matches
        .slice(0, 18)
        .map((c) => `\`${c.id}\` — ${c.title}`)
        .join('\n');
      return i.editReply(
        `${matches.length} matching cards.\n${list || 'No matches.'}\nUse /showcase with an ID, or refine /catalog search.`,
      );
    }
    if (name === 'showcase') {
      const { card, path } = selectCard(cards, i.options.getString('id', true));
      const payload = {
        embeds: [
          {
            title: card.title,
            description: `${card.intro}\n\n*${card.kind}*`,
            color: 0xa768e5,
            image: { url: 'attachment://showcase.png' },
          },
        ],
        files: [new AttachmentBuilder(path, { name: 'showcase.png' })],
        allowedMentions: NO_MENTIONS,
      };
      if (!i.options.getBoolean('publish')) return i.editReply(payload);
      const channel = findChannel(i.guild, 'showcase');
      if (!channel) return i.editReply('Run /setup first to create #showcase.');
      const sent = await channel.send(payload);
      return i.editReply(`Showcase posted: ${sent.url}`);
    }
    if (name === 'update') {
      const payload = {
        embeds: [
          {
            title: i.options.getString('title', true),
            description: i.options.getString('message', true),
            color: 0xa768e5,
          },
        ],
        allowedMentions: NO_MENTIONS,
      };
      if (!i.options.getBoolean('publish')) return i.editReply(payload);
      const channel = findChannel(i.guild, 'development-updates');
      if (!channel) return i.editReply('Run /setup first to create #development-updates.');
      const sent = await channel.send(payload);
      return i.editReply(`Update posted: ${sent.url}`);
    }
    if (name === 'timeout') {
      const member = await i.guild.members.fetch(i.options.getUser('member', true).id);
      const actor = await i.guild.members.fetch(i.user.id);
      if (
        member.id === i.user.id ||
        member.id === i.guild.ownerId ||
        !member.moderatable ||
        (i.user.id !== i.guild.ownerId &&
          actor.roles.highest.comparePositionTo(member.roles.highest) <= 0)
      )
        return i.editReply('You cannot timeout this member. Check role hierarchy.');
      const minutes = i.options.getInteger('minutes', true),
        reason = i.options.getString('reason', true);
      await member.timeout(minutes * 60000, reason);
      await i.editReply(`Member timed out for ${minutes} minutes.`);
      await audit(
        i.guild,
        `Timeout: member ${member.id}, moderator ${i.user.id}, ${minutes} minutes. Reason: ${reason}`,
      );
      return;
    }
    if (name === 'purge') {
      if (!i.channel || !('bulkDelete' in i.channel))
        return i.editReply('This command needs a server text channel.');
      const deleted = await i.channel.bulkDelete(i.options.getInteger('count', true), true);
      await i.editReply(
        `Deleted ${deleted.size} recent messages. Discord excludes messages older than 14 days.`,
      );
      await audit(
        i.guild,
        `Purge: ${deleted.size} messages in ${i.channelId}, moderator ${i.user.id}.`,
      );
    }
  } catch (e) {
    failure(e);
    const content =
      'The operation could not finish. Check bot permissions and role order, then retry. Setup can be rerun safely; existing resources are reused.';
    if (i.isAutocomplete()) {
      try {
        await i.respond([]);
      } catch {}
    } else if (i.deferred || i.replied) await i.editReply({ content }).catch(() => {});
    else if (i.isRepliable()) await i.reply(privateReply(content)).catch(() => {});
  }
});
client.on(Events.Error, failure);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => client.destroy());
client.login(token).catch((e) => {
  failure(e);
  client.destroy();
  process.exitCode = 1;
});
