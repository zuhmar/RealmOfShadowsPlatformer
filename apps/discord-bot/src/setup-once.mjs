import { Client, ClientUser, Routes, PermissionFlagsBits as P } from 'discord.js';
import { EnvHttpProxyAgent } from 'undici';
import { plannedSetup, setupCommunity, seedMessage, gameUrl } from './community.mjs';

// REST only: creates the community, then exits. No Gateway or paid worker needed.
const apply = process.argv.includes('--apply');
if (!apply) {
  console.log(plannedSetup());
  console.log('\nPreview only. Run setup:once -- --apply after configuring the private bot token.');
} else {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const applicationId = process.env.DISCORD_APPLICATION_ID;
  if (!token || !/^\d{17,22}$/.test(guildId ?? '') || !/^\d{17,22}$/.test(applicationId ?? '')) {
    console.error(
      'Private DISCORD_BOT_TOKEN and public DISCORD_GUILD_ID/DISCORD_APPLICATION_ID must be configured before applying setup.',
    );
    process.exitCode = 1;
  } else {
    const client = new Client({ intents: [], shardCount: 1, allowedMentions: { parse: [] } });
    const agent = new EnvHttpProxyAgent();
    try {
      const url = process.env.GAME_URL ? gameUrl(process.env.GAME_URL) : null;
      client.rest.setAgent(agent).setToken(token);
      const user = await client.rest.get(Routes.user('@me'));
      if (!user.bot || user.id !== applicationId) throw new Error('Unexpected bot identity');
      client.user = new ClientUser(client, user);
      const guild = await client.guilds.fetch(guildId);
      await guild.roles.fetch();
      const me = await guild.members.fetch(user.id);
      const required = [
        P.ManageChannels,
        P.ManageRoles,
        P.ViewChannel,
        P.SendMessages,
        P.ReadMessageHistory,
        P.EmbedLinks,
      ];
      if (!required.every((permission) => me.permissions.has(permission)))
        throw new Error('Missing setup permissions');
      const result = await setupCommunity(guild, user.id);
      const messages = [
        [
          'welcome',
          'Welcome to Realm of Shadows',
          'Follow development, share your adventures, and help build the community. Read #rules and introduce yourself in #introductions.',
        ],
        [
          'rules',
          'Community rules',
          'Be respectful. No harassment, hate, spam, scams, or sharing private information. Keep discussion appropriate for the community. Report problems to the moderators. Keep future story spoilers out of public channels.',
        ],
        [
          'pick-your-class',
          'Your class in the community',
          'Knight, Archer, Mage, and Rogue community roles are available. Ask a moderator for a role. These do not change your in-game class.',
        ],
        ...(url
          ? [['game-links', 'Enter the realm', `Play: ${url}\nGame previews: ${url}/showcase`]]
          : []),
      ];
      for (const [name, title, description] of messages) {
        await seedMessage(
          result.channels.get(name),
          'ros:seed:' + name,
          { embeds: [{ title, description }] },
          user.id,
        );
      }
      console.log(
        JSON.stringify(
          {
            guild: guild.name,
            created: result.counts,
            channels: [...result.channels].map(([name, channel]) => ({ name, id: channel.id })),
          },
          null,
          2,
        ),
      );
      console.log('One-time setup finished. No background bot process remains running.');
    } catch (error) {
      // Never log Discord request objects: they can contain authorization material.
      console.error('One-time setup could not finish.', {
        name: error?.name ?? 'Error',
        code: error?.code ?? 'unknown',
      });
      process.exitCode = 1;
    } finally {
      await client.destroy();
      await agent.close();
    }
  }
}
