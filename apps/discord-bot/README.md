# Realm of Shadows community bot

This is a separate Discord bot process, not an AI operator logged into a personal
Discord account. It runs defined commands and join automation. It does not
change game accounts or automatically invent/post development announcements.

## Connect the bot

1. Open https://discord.com/developers/applications and create an application
   named **Realm of Shadows**. Under **Bot**, enable **Server Members Intent**
   so welcome messages and join roles work. Message Content Intent is not needed.
2. Under **Bot**, create/reset the token. Store it directly in your hosting
   service's secret environment variables as `DISCORD_BOT_TOKEN`. Never paste it
   in chat, a screenshot, GitHub, or a public channel.
3. Copy the public **Application ID** from General Information. To generate
   the invitation locally, set `DISCORD_APPLICATION_ID` in an ignored
   `apps/discord-bot/.env` and run `npm run invite -w @ros/discord-bot`.
   Alternatively, in Developer Portal's OAuth2 URL Generator, select `bot` and
   `applications.commands` with Manage Channels, Manage Roles, View Channels,
   Send Messages, Read Message History, Embed Links, Attach Files, Manage
   Messages, and Moderate Members. Administrator permission is not needed.
4. Open the invitation and select your **Realm of Shadows** server.
5. Enable Discord **Settings → Advanced → Developer Mode**. Right-click or
   long-press your server, choose **Copy Server ID**, and store that as
   `DISCORD_GUILD_ID` in the bot's private hosting environment.
6. Set `GAME_URL` to the HTTPS origin of your live game (no `/showcase` path).
7. Run one persistent bot worker. On Render, create a Blueprint from
   `render.discord.yaml`, or create a Node background worker with the build
   and start commands in that file. A Render background worker uses a paid
   plan; select hosting intentionally. No worker is created by committing this
   file. Vercel serverless functions are not suitable for this persistent
   Gateway connection. Do not run multiple workers for the same bot.
8. In Discord, run `/setup` to view the layout, then `/setup apply:true` to
   create it. Both require Manage Server. Setup creates missing resources,
   reuses matching names within the expected categories, and deletes nothing.
9. Move the bot's role above Adventurer and the four class roles. It also needs
   to be above members it will timeout. Keep privileged human roles above it.
   A pre-existing class/Adventurer role with extra permissions is never
   automatically assigned. A pre-existing STAFF category must hide View Channel
   from @everyone before it can be reused. Existing permissions are preserved;
   review them if reusing your own channels or roles.

## Commands

| Command                                      | Who              | Behavior                                   |
| -------------------------------------------- | ---------------- | ------------------------------------------ |
| `/setup`                                     | Manage Server    | Private layout preview                     |
| `/setup apply:true`                          | Manage Server    | Create missing layout and starter messages |
| `/links`                                     | Everyone         | Private game and gallery links             |
| `/roles`                                     | Everyone         | Private cosmetic Discord class buttons     |
| `/catalog search:housing`                    | Manage Server    | Find IDs in the 72-card library            |
| `/showcase id:19-housing`                    | Manage Server    | Private preview with PNG                   |
| `/showcase id:19-housing publish:true`       | Manage Server    | Post the card in #showcase                 |
| `/update title:... message:...`              | Manage Server    | Private update preview                     |
| `/update title:... message:... publish:true` | Manage Server    | Post in #development-updates               |
| `/timeout member:... minutes:... reason:...` | Moderate Members | Timeout with role-hierarchy checks         |
| `/purge count:...`                           | Manage Messages  | Delete up to 100 recent channel messages   |

Purge and timeout perform the requested moderation immediately. Purge skips
messages older than 14 days. Neither bans users. Actions are recorded in
#mod-log only when its parent STAFF category is private. An existing
nonstandard/private channel may need additional bot-specific permissions.

On join, non-bot members receive the cosmetic Adventurer role when assignable
and a welcome mentioning only that member. No @everyone or role pings are
permitted. Class buttons only assign the four permission-free class roles;
they do not unlock or change an in-game class.

Commands register only in the configured server. The bot ignores other servers.
Setup seed messages are pinned when allowed; pinned markers prevent repeats.
Unpinned starter messages are also checked within the latest 100 messages.
If removed or moved beyond that history, setup may recreate a starter post.

## Local checks

```sh
npm run test -w @ros/discord-bot
npm run start -w @ros/discord-bot
```

For local running, copy `.env.example` to `.env` in this folder and populate it
privately. Tests use mocks and do not contact Discord. A live check requires
inviting the bot and setting credentials. The application does not log tokens
or incoming message contents.
