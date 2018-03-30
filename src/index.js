// @flow
import os from 'os';
import fs from 'fs';
import path from 'path';
import Busboy from 'busboy';

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
  const uploads = {};
  const tmpdir = os.tmpdir();
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    const filepath = path.join(tmpdir, filename);
    uploads[fieldname] = filepath;
    file.pipe(fs.createWriteStream(filepath));
    console.log(fieldname);
  });
  busboy.on('finish', () => {
    // *** Process uploaded files here ***
    Object.keys(uploads).forEach(name => fs.unlinkSync(uploads[name]));
    res.end();
  });
  if (req.rawBody) {
    busboy.end(req.rawBody);
  } else {
    req.pipe(busboy);
  }
}
