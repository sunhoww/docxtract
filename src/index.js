// @flow
import os from 'os';
import fs from 'fs';
import path from 'path';
import Busboy from 'busboy';
import R from 'ramda';

import extract from './extract';
import { promisify } from './utils';

/**
 * HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */

type Request = {
  method: 'POST',
  headers: {},
  rawBody: Buffer,
  pipe: any => void,
};
type Response = {
  status: number => Response,
  end: void => void,
  send: any => void,
};

export function docxtract(req: Request, res: Response): void {
  if (req.method !== 'POST') {
    res.status(405);
    return res.end();
  }
  const busboy = new Busboy({ headers: req.headers });
  const uploads = [];
  const tmpdir = os.tmpdir();
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (
      mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const filepath = path.join(tmpdir, filename);
      uploads.push({ fieldname, filepath });
      file.pipe(fs.createWriteStream(filepath));
    } else {
      file.resume();
    }
  });
  busboy.on('finish', async () => {
    if (uploads.length === 0) {
      return res.status(400).send({ error: 'Unknown mimetype' });
    }
    const extractHandler = R.compose(
      R.composeP(extract, promisify(fs.readFile)),
      R.prop('filepath')
    );
    const extracted = await extractHandler(uploads[0]);

    const removeHandler = R.compose(promisify(fs.unlink), R.prop('filepath'));
    await Promise.all(R.map(removeHandler, uploads));

    return res.send(extracted);
  });
  if (req.rawBody) {
    busboy.end(req.rawBody);
  } else {
    req.pipe(busboy);
  }
}
