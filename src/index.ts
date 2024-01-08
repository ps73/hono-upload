import type { FileInfo } from 'busboy';
import type { Context } from 'hono';
import type { Readable } from 'stream';

import createBusboy from 'busboy';

type UploadFileInfo = {
  filename: string;
  encoding: string;
  mimeType: string;
  field: string;
};

export type UploadParams<T, Ctx extends Context> = {
  onFile: (file: Readable, fileInfo: UploadFileInfo) => T | Promise<T>;
  queuingStrategy?: QueuingStrategy<Uint8Array>;
  ctx: Ctx;
  maxFileSize?: number;
};

export const uploadErrors = {
  MISSING_BODY: 'MISSING_BODY',
  INVALID_CONTENT_TYPE: 'INVALID_CONTENT_TYPE',
  CONTENT_LENGTH_MISSING: 'CONTENT_LENGTH_MISSING',
  MAX_FILE_SIZE_EXCEEDED: 'MAX_FILE_SIZE_EXCEEDED',
  MAX_ONE_FILE_ALLOWED: 'MAX_ONE_FILE_ALLOWED',
};

export async function uploadHandler<T, C extends Context>({
  queuingStrategy,
  onFile,
  ctx,
  ...params
}: UploadParams<T, C>) {
  const request = ctx.req.raw;
  const stream = request.body;

  if (!stream) {
    throw new Error(uploadErrors.MISSING_BODY);
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('multipart/form-data')) {
    throw new Error(uploadErrors.INVALID_CONTENT_TYPE);
  }

  // maxFileSize + 2MB
  const maxFileSize = (params.maxFileSize || Infinity) + 2 * 1024 * 1024;

  const requestSize = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (requestSize === 0) {
    throw new Error(uploadErrors.CONTENT_LENGTH_MISSING);
  }
  if (maxFileSize && requestSize > maxFileSize) {
    throw new Error(uploadErrors.MAX_FILE_SIZE_EXCEEDED, {
      cause: new Error(requestSize.toString()),
    });
  }

  const headers = Object.fromEntries(ctx.req.raw.headers.entries());

  const queueStrategy = {
    highWaterMark: 3,
    size: () => 1,
    ...queuingStrategy,
  };

  return new Promise<T>((resolve, reject) => {
    const busboy = createBusboy({
      headers,
      highWaterMark: queueStrategy.highWaterMark,
      limits: {
        fields: 0,
        files: 1,
      },
    });

    const writableStream = new WritableStream<Uint8Array>(
      {
        abort(reason) {
          reject(reason);
        },
        write(chunk) {
          busboy.write(chunk);
        },
        close() {
          busboy.end();
        },
      },
      queueStrategy,
    );

    function cleanup() {
      busboy.removeListener('error', onBusboyError); // eslint-disable-line no-use-before-define
      busboy.removeListener('file', onBusboyFile); // eslint-disable-line no-use-before-define
    }

    let result: T | undefined;

    function onBusboyError() {
      result = undefined;
      cleanup();
    }

    function onBusboyFile(field: string, file: Readable, fileInfo: FileInfo) {
      try {
        const writeFile = onFile(file, {
          ...fileInfo,
          field,
        });
        if (writeFile instanceof Promise) {
          writeFile
            .then((v) => {
              result = v;
              busboy.emit('close');
            })
            .catch((err) => {
              reject(err);
            });
        } else {
          result = writeFile;
        }
      } catch (e) {
        reject(e);
      }
    }

    busboy.on('file', onBusboyFile);
    busboy.on('error', onBusboyError);
    busboy.on('close', () => {
      writableStream.close().catch(() => {});
      cleanup();
      if (result) resolve(result);
    });

    stream.pipeTo(writableStream).catch((e) => {
      reject(e);
    });
  });
}
