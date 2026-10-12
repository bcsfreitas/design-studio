// Social crawlers read the initial HTML, without running the application.
export default function socialMetadata({ publicUrl = process.env.STUDIO_PUBLIC_URL } = {}) {
  let base;
  let image;
  if (publicUrl) {
    const url = new URL(publicUrl);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error('STUDIO_PUBLIC_URL must be an HTTP(S) site URL without credentials, a query, or a fragment.');
    }
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
    image = new URL('images/design-studio-social.png', url).href;
  }
  const title = 'Design Studio — Design with intent. Build with an agent.';
  const description = 'Design Studio is an open source, AI prototype sandbox for designers and product managers who build.';
  const alt = 'Design Studio. Design with intent. Build with an agent. Connected prototype, context, and flow cards.';
  return {
    name: 'studio-social-metadata',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler() {
        const imageUrl = image || `${base}images/design-studio-social.png`;
        return [
          ['property', 'og:type', 'website'],
          ['property', 'og:site_name', 'Design Studio'],
          ['property', 'og:title', title],
          ['property', 'og:description', description],
          ['property', 'og:image', imageUrl],
          ['property', 'og:image:type', 'image/png'],
          ['property', 'og:image:width', '1200'],
          ['property', 'og:image:height', '630'],
          ['property', 'og:image:alt', alt],
          ['name', 'twitter:card', 'summary_large_image'],
          ['name', 'twitter:title', title],
          ['name', 'twitter:description', description],
          ['name', 'twitter:image', imageUrl],
          ['name', 'twitter:image:alt', alt],
        ].map(([attribute, key, content]) => ({ tag: 'meta', attrs: { [attribute]: key, content }, injectTo: 'head' }));
      },
    },
  };
}
