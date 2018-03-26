import test from 'ava';
import sinon from 'sinon';

import { docxtract } from '../src/index';

test(`docxtract: should print docxtract`, t => {
  const req = {
    body: {},
  };
  const res = { send: sinon.stub() };

  docxtract(req, res);

  t.true(res.send.calledOnce);
  t.deepEqual(res.send.firstCall.args, ['docxtract']);
});
