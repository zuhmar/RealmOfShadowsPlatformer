import { REST, Routes } from 'discord.js';
import { EnvHttpProxyAgent } from 'undici';
import { readFile } from 'node:fs/promises';
const root = new URL('../docs/community/discord/playtest-2026-11-15/', import.meta.url);
const content = (await readFile(new URL('announcement.md', root), 'utf8')).trim();
if (!process.argv.includes('--apply')) {
  console.log(content);
  console.log(
    'Attachment: corrected generated roadmap with actual in-game sprites. --apply posts once with requested @everyone mention.',
  );
} else {
  const agent = new EnvHttpProxyAgent();
  try {
    const rest = new REST().setAgent(agent).setToken(process.env.DISCORD_BOT_TOKEN);
    const guildId = process.env.DISCORD_GUILD_ID;
    const me = await rest.get(Routes.user('@me'));
    if (!me.bot || me.id !== process.env.DISCORD_APPLICATION_ID)
      throw new Error('Unexpected bot identity');
    const channels = await rest.get(Routes.guildChannels(guildId));
    const channel = channels.find((c) => c.name === 'announcements' && [0, 5].includes(c.type));
    if (!channel) throw new Error('Announcements channel not found');
    const key = 'ros:playtest:2026-11-15';
    const recent = await rest.get(Routes.channelMessages(channel.id), {
      query: new URLSearchParams({ limit: '100' }),
    });
    const existing = recent.find(
      (m) => m.author.id === me.id && m.embeds.some((e) => e.footer?.text === key),
    );
    const body = {
      content,
      allowed_mentions: { parse: existing ? [] : ['everyone'] },
      embeds: [
        { color: 0xa768e5, image: { url: 'attachment://roadmap.png' }, footer: { text: key } },
      ],
      attachments: [
        {
          id: '0',
          filename: 'roadmap.png',
          description:
            'Realm of Shadows playtest roadmap, November 15–16, 2026, featuring actual in-game Knight and Mage sprites.',
        },
      ],
    };
    const files = [
      {
        data: await readFile(new URL('roadmap.png', root)),
        name: 'roadmap.png',
        contentType: 'image/png',
      },
    ];
    const message =
      existing ?? (await rest.post(Routes.channelMessages(channel.id), { body, files }));
    const check = await rest.get(Routes.channelMessage(channel.id, message.id));
    if (
      check.content !== content ||
      !(
        check.attachments.some((a) => a.filename === 'roadmap.png' && a.width > 0) ||
        check.embeds.some(
          (e) =>
            e.image?.url?.includes('/roadmap.png') &&
            e.image.width === 1024 &&
            e.image.height === 1536,
        )
      )
    )
      throw new Error('Posted content or image verification failed');
    console.log(
      JSON.stringify({
        url: `https://discord.com/channels/${guildId}/${channel.id}/${message.id}`,
        channel: channel.name,
        everyoneMention: check.mention_everyone,
        imageVerified: true,
        reusedExisting: !!existing,
      }),
    );
    if (!existing && !check.mention_everyone)
      throw new Error('Announcement visible, but Discord did not confirm everyone mention.');
  } catch (error) {
    console.error(
      JSON.stringify({
        name: error.name,
        code: error.code,
        status: error.status,
        message: error.message,
      }),
    );
    process.exitCode = 1;
  } finally {
    await agent.close();
  }
}
