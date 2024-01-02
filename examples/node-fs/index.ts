import { createWriteStream, existsSync, rmSync } from 'fs';
import path from 'path';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import { uploadErrors, uploadHandler } from '../../src';

const app = new Hono();

app.post('/upload', async (ctx) => {
  let filePath: string | undefined;
  try {
    const result = await uploadHandler({
      ctx,
      maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
      onFile: (file, fileInfo) => {
        return new Promise<'ok'>((res, rej) => {
          if (fileInfo.mimeType === 'application/pdf') {
            rej(new Error('INVALID_MIME_TYPE'));
            return;
          }

          filePath = path.resolve('.', 'examples', 'node-fs', 'uploads', fileInfo.filename);
          if (existsSync(filePath)) {
            const err = new Error('FILE_ALREADY_EXISTS');
            rej(err);
            return;
          }

          const writeStream = createWriteStream(filePath);

          file.pipe(writeStream);

          writeStream
            .on('close', () => {
              res('ok');
            })
            .on('error', (err) => {
              rej(err);
            });
        });
      },
    });
    ctx.status(200);
    return ctx.json({ result });
  } catch (e) {
    console.error(e);
    if (filePath && existsSync(filePath)) rmSync(filePath);
    if (!(e instanceof Error)) {
      ctx.status(500);
      return ctx.json({ message: 'UNKNOWN_ERROR' });
    }
    const { message, cause } = e;
    const errorCodes = {
      [uploadErrors.MISSING_BODY]: 400,
      [uploadErrors.INVALID_CONTENT_TYPE]: 400,
      [uploadErrors.CONTENT_LENGTH_MISSING]: 400,
      [uploadErrors.MAX_FILE_SIZE_EXCEEDED]: 400,
      [uploadErrors.MAX_ONE_FILE_ALLOWED]: 400,
      FILE_TOO_LARGE: 400,
      FILE_ALREADY_EXISTS: 409,
      INVALID_MIME_TYPE: 400,
    };
    const code = errorCodes[message];
    if (message === 'MAX_FILE_SIZE_EXCEEDED') {
      ctx.status(code);
      return ctx.json({
        message,
        maxFileSize: 5 * 1024 * 1024 * 1024,
        fileSize: Number((cause as Error).message),
      });
    }
    if (code < 500) {
      ctx.status(code);
      return ctx.json({ message });
    }
    ctx.status(500);
    return ctx.json({ message: 'UNKNOWN_ERROR' });
  }
});

serve({
  port: 3000,
  fetch: app.fetch,
});
