import { REST, Routes } from 'discord.js';
import { EnvHttpProxyAgent } from 'undici';
import { readFile } from 'node:fs/promises';
const root = new URL('../docs/community/discord/class-previews/', import.meta.url);
const cards = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
if (!process.argv.includes('--apply')) {
  console.log(
    `Preview: ${cards.length} individual class cards with GIF animations, still images, abilities and weapon stats in #pick-your-class.`,
  );
} else {
  const token = process.env.DISCORD_BOT_TOKEN,
    guildId = process.env.DISCORD_GUILD_ID,
    applicationId = process.env.DISCORD_APPLICATION_ID;
  if (!token || !guildId || !applicationId)
    throw new Error('Configure private bot token and public guild/application IDs.');
  const agent = new EnvHttpProxyAgent(),
    rest = new REST().setAgent(agent).setToken(token);
  try {
    const user = await rest.get(Routes.user('@me'));
    if (!user.bot || user.id !== applicationId) throw new Error('Unexpected bot');
    const channels = await rest.get(Routes.guildChannels(guildId));
    const parent = channels.find((c) => c.type === 4 && c.name === 'START HERE');
    const channel = channels.find(
      (c) => c.name === 'pick-your-class' && c.parent_id === parent?.id,
    );
    if (!channel) throw new Error('Class channel missing');
    const recent = await rest.get(Routes.channelMessages(channel.id), {
      query: new URLSearchParams({ limit: '100' }),
    });
    const intro = recent.find(
      (m) =>
        m.author.id === user.id &&
        m.embeds.some((e) => e.footer?.text === 'ros:seed:pick-your-class'),
    );
    if (intro)
      await rest.patch(Routes.channelMessage(channel.id, intro.id), {
        body: {
          content:
            '**Explore the four classes**\n\nPreview each class skin, animations, special ability, and base weapon stats below. The GIF shows one character at a time: idle, movement, basic attack, and special. Tap the animated file if Discord does not autoplay it.\n\nDiscord class roles are cosmetic. Choosing your in-game class requires the Crystal Caverns quest; ask a moderator for a community role.',
          embeds: [{ color: 0xa768e5, footer: { text: 'ros:seed:pick-your-class' } }],
          allowed_mentions: { parse: [] },
        },
      });
    for (const card of cards) {
      const content = `**${card.className} — ${card.skin}**\n${card.weapon} · Trains ${card.training}\n\n**${card.special}** — ${card.description}\n**Base weapon stats:** ${card.basicInterval.toFixed(2)}s basic attack interval · ${card.damageScale.toFixed(2)}× weapon damage scale.\n**Special:** ${card.mana} mana · ${card.cooldown}s base cooldown.\n\nClass selection unlocks through the Crystal Caverns quest. Training boosts base damage; equipment determines crit, dodge, block, and other attributes. These are rank-one weapon values before equipment attributes or talents.\n\n**Animated preview:** tap the GIF to watch the skin and combat animations. A still card is attached too.`;
      const key = 'ros:class-preview:' + card.id + ':v1';
      const existing = recent.find(
        (m) => m.author.id === user.id && m.embeds.some((e) => e.footer?.text === key),
      );
      const body = {
        content,
        embeds: [{ color: 0xa768e5, footer: { text: key } }],
        allowed_mentions: { parse: [] },
        attachments: [
          { id: '0', filename: card.id + '-animated.gif' },
          { id: '1', filename: card.id + '-card.png' },
        ],
      };
      const files = [
        {
          data: await readFile(new URL(card.gif, root)),
          name: card.id + '-animated.gif',
          contentType: 'image/gif',
        },
        {
          data: await readFile(new URL(card.poster, root)),
          name: card.id + '-card.png',
          contentType: 'image/png',
        },
      ];
      const message = existing
        ? await rest.patch(Routes.channelMessage(channel.id, existing.id), { body, files })
        : await rest.post(Routes.channelMessages(channel.id), { body, files });
      const check = await rest.get(Routes.channelMessage(channel.id, message.id));
      if (
        check.content !== content ||
        check.attachments.length !== 2 ||
        !check.attachments.some((a) => a.filename.endsWith('.gif') && a.width > 0)
      )
        throw new Error('Class attachment verification failed');
      console.log(
        'Verified ' +
          card.className +
          ': https://discord.com/channels/' +
          guildId +
          '/' +
          channel.id +
          '/' +
          message.id,
      );
    }
  } catch (error) {
    console.error('Class posting failed', {
      name: error?.name,
      code: error?.code,
      status: error?.status,
    });
    process.exitCode = 1;
  } finally {
    await agent.close();
  }
}
