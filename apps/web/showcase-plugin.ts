import { createReadStream } from 'node:fs';
import { cp, stat, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';
import type { Plugin } from 'vite';

/** Serve the marketing library separately so it never loads with the game. */
export function showcasePlugin(): Plugin {
  const source = fileURLToPath(new URL('../../docs/community/discord/', import.meta.url));
  let output: string;
  return {
    name: 'realm-showcase',
    configResolved(config) {
      output = resolve(config.root, config.build.outDir, 'showcase');
    },
    async closeBundle() {
      await cp(source, output, { recursive: true });
      const index = resolve(output, 'index.html');
      await writeFile(
        index,
        (await readFile(index, 'utf8')).replace(
          '<meta charset="utf-8">',
          '<meta charset="utf-8"><base href="/showcase/">',
        ),
      );
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
        if (pathname !== '/showcase' && !pathname.startsWith('/showcase/')) return next();
        let filename: string;
        try {
          const relative = decodeURIComponent(pathname.slice('/showcase'.length));
          filename = resolve(
            source,
            '.' + (relative === '' || relative === '/' ? '/index.html' : relative),
          );
        } catch {
          res.statusCode = 400;
          return res.end();
        }
        if (!filename.startsWith(source.replace(/\/$/, '') + sep)) {
          res.statusCode = 403;
          return res.end();
        }
        try {
          if (!(await stat(filename)).isFile()) throw new Error('Not a file');
          const mime: Record<string, string> = {
            '.html': 'text/html; charset=utf-8',
            '.png': 'image/png',
            '.json': 'application/json',
            '.md': 'text/plain; charset=utf-8',
          };
          res.setHeader('Content-Type', mime[extname(filename)] ?? 'application/octet-stream');
          if (filename === resolve(source, 'index.html')) {
            return res.end(
              (await readFile(filename, 'utf8')).replace(
                '<meta charset="utf-8">',
                '<meta charset="utf-8"><base href="/showcase/">',
              ),
            );
          }
          const stream = createReadStream(filename);
          stream.on('error', () => res.destroy());
          stream.pipe(res);
        } catch {
          res.statusCode = 404;
          res.end('Showcase file not found');
        }
      });
    },
  };
}
