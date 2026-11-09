/** Require a normal file and text so the post remains usable when embeds are hidden. */
export function hasDirectPublishedImage(message) {
  return (
    !!message?.content &&
    !!message?.attachments?.some((a) => a.name === 'preview.png' && a.width > 0 && a.height > 0)
  );
}
