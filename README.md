# hono-upload

A memory efficient upload handler for hono using streaming and [busboy](https://github.com/mscdex/busboy).

> [!WARNING]  
> This is an early version of the package. Might have issues and breaking changes.

## Hono Version Compatibility

If you use Hono v3, you should use `hono-upload@0.1.4`.
For Hono v4, use `hono-upload@0.2.0` and above.

## Installation

```bash
npm install hono-upload
```

## Limitations

- Currently only supports single file uploads
- Currently only supports multipart/form-data requests

## Example Usage

```ts
import { Hono } from 'hono';
import { uploadHandler, uploadErrors } from 'hono-upload';

hono.post('/upload', async (ctx) => {
  try {
    const result = await uploadHandler({
      ctx,
      maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
      onFile: (file, fileInfo) => {
        // file is a Readable
        return new Promise<'ok'>((res, rej) => {
          if (fileInfo.mimeType === 'application/pdf') {
            rej(new Error('INVALID_MIME_TYPE'));
            return;
          }

          filePath = path.resolve('.', 'uploads', fileInfo.filename);
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
```
