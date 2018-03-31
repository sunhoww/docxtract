// @flow
import jszip from 'jszip';
import xml2js from 'xml2js';
import R from 'ramda';

import { promisify } from './utils';

const parser = new xml2js.Parser({
  explicitArray: false,
});

const readXml = async (file: Buffer): any => {
  const zip = await jszip.loadAsync(file);
  if (!zip.files['word/document.xml']) {
    return null;
  }
  const doc = await zip.files['word/document.xml'].async('string');
  return promisify(parser.parseString)(doc);
};

const getGlyph = R.compose(
  R.compose(R.flip(R.propOr)('w:cs'), R.flip(R.propOr)('w:ascii'))(
    R.prop('w:hAnsi')
  ),
  R.path(['w:rPr', 'w:rFonts', '$'])
);

const getText = R.ifElse(
  R.propIs(String, 'w:t'),
  R.prop('w:t'),
  R.path(['w:t', '_'])
);

export default async function extract(
  file: Buffer
): Promise<Array<{ glyph: string, text: string }>> {
  const doc = await readXml(file);
  const paras = R.path(['w:document', 'w:body', 'w:p'])(doc);
  return R.map(
    R.compose(
      R.map(run => ({ glyph: getGlyph(run), text: getText(run) })),
      R.propOr([], 'w:r')
    ),
    paras
  );
}