'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var jszip = _interopDefault(require('jszip'));
var xml2js = _interopDefault(require('xml2js'));
var R = _interopDefault(require('ramda'));
var os = _interopDefault(require('os'));
var fs = _interopDefault(require('fs'));
var path = _interopDefault(require('path'));
var Busboy = _interopDefault(require('busboy'));

function promisify(api) {
  return function (...args) {
    return new Promise(function (resolve, reject) {
      api(...args, function (err, response) {
        if (err) {
          return reject(err);
        }
        return resolve(response);
      });
    });
  };
}

var asyncToGenerator = function (fn) {
  return function () {
    var gen = fn.apply(this, arguments);
    return new Promise(function (resolve, reject) {
      function step(key, arg) {
        try {
          var info = gen[key](arg);
          var value = info.value;
        } catch (error) {
          reject(error);
          return;
        }

        if (info.done) {
          resolve(value);
        } else {
          return Promise.resolve(value).then(function (value) {
            step("next", value);
          }, function (err) {
            step("throw", err);
          });
        }
      }

      return step("next");
    });
  };
};

const parser = new xml2js.Parser({
  explicitArray: false
});

const readXml = (() => {
  var _ref = asyncToGenerator(function* (file) {
    const zip = yield jszip.loadAsync(file);
    if (!zip.files['word/document.xml']) {
      return null;
    }
    const doc = yield zip.files['word/document.xml'].async('string');
    return promisify(parser.parseString)(doc);
  });

  return function readXml(_x) {
    return _ref.apply(this, arguments);
  };
})();

const getGlyph = R.compose(R.compose(R.flip(R.propOr)('w:cs'), R.flip(R.propOr)('w:ascii'))(R.prop('w:hAnsi')), R.path(['w:rPr', 'w:rFonts', '$']));

const getText = R.ifElse(R.propIs(String, 'w:t'), R.prop('w:t'), R.path(['w:t', '_']));

const concatText = R.compose(R.join(''), R.map(R.propOr('', 'text')));

const joinSameGlyphRuns = (a, x) => {
  const last = R.last(a);
  if (last) {
    if (last.glyph === x.glyph) {
      return [...R.dropLast(1, a), Object.assign({}, last, {
        text: concatText([last, x])
      })];
    }
  }
  return [...a, x];
};

var extract = (() => {
  var _ref2 = asyncToGenerator(function* (file) {
    const doc = yield readXml(file);
    const paras = R.compose(R.ifElse(R.is(Array), R.identity, function (x) {
      return [x];
    }), R.path(['w:document', 'w:body', 'w:p']))(doc);
    return R.map(R.compose(R.reduce(joinSameGlyphRuns, []), R.map(function (run) {
      return { glyph: getGlyph(run), text: getText(run) };
    }), R.ifElse(R.is(Array), R.identity, function (x) {
      return [x];
    }), R.propOr([], 'w:r')), paras);
  });

  function extract(_x2) {
    return _ref2.apply(this, arguments);
  }

  return extract;
})();

/**
 * HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */

function docxtract(req, res) {
  if (req.method !== 'POST') {
    res.status(405);
    return res.end();
  }
  const busboy = new Busboy({ headers: req.headers });
  const uploads = [];
  const tmpdir = os.tmpdir();
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const filepath = path.join(tmpdir, filename);
      uploads.push({ fieldname, filepath });
      file.pipe(fs.createWriteStream(filepath));
    } else {
      file.resume();
    }
  });
  busboy.on('finish', asyncToGenerator(function* () {
    if (uploads.length === 0) {
      return res.status(400).send({ error: 'Unknown mimetype' });
    }
    const extractHandler = R.compose(R.composeP(extract, promisify(fs.readFile)), R.prop('filepath'));
    const extracted = yield extractHandler(uploads[0]);

    const removeHandler = R.compose(promisify(fs.unlink), R.prop('filepath'));
    yield Promise.all(R.map(removeHandler, uploads));

    return res.send(extracted);
  }));
  if (req.rawBody) {
    busboy.end(req.rawBody);
  } else {
    req.pipe(busboy);
  }
}

exports.docxtract = docxtract;
