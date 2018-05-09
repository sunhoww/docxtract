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

const concatText = R.compose(R.join(''), R.map(R.propOr('', 'text')));

const joinSameGlyphRuns = (a, x) => {
  const last = R.last(a);
  if (last) {
    if (last.glyph === x.glyph) {
      return [
        ...R.dropLast(1, a),
        Object.assign({}, last, {
          text: concatText([last, x]),
        }),
      ];
    }
  }
  return [...a, x];
};

export default async function extract(
  file: Buffer
): Promise<Array<{ glyph: string, text: string }>> {
  const doc = await readXml(file);
  const paras = R.compose(
    R.ifElse(R.is(Array), R.identity, x => [x]),
    R.path(['w:document', 'w:body', 'w:p'])
  )(doc);
  return R.map(
    R.compose(
      R.reduce(joinSameGlyphRuns, []),
      R.map(run => ({ glyph: getGlyph(run), text: getText(run) })),
      R.ifElse(R.is(Array), R.identity, x => [x]),
      R.propOr([], 'w:r')
    ),
    paras
  );
}
