/** Discord may omit embed-backed files from attachments while exposing the processed CDN image. */
export function hasPublishedImage(message, channelId) {
  if (message?.attachments?.some((a) => a.name === 'preview.png' && a.width > 0 && a.height > 0))
    return true;
  return !!message?.embeds?.some((embed) => {
    const image = embed.image;
    if (!image || !(image.width > 0 && image.height > 0)) return false;
    try {
      const url = new URL(image.url);
      return (
        url.protocol === 'https:' &&
        url.hostname === 'cdn.discordapp.com' &&
        url.pathname.startsWith(`/attachments/${channelId}/`) &&
        url.pathname.endsWith('/preview.png')
      );
    } catch {
      return false;
    }
  });
}
