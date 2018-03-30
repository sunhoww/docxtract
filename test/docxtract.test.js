import test from 'ava';
import sinon from 'sinon';

import { docxtract } from '../src/index';

test('docxtract: should error when request method is not POST', t => {
  const req = { method: 'GET', body: {} };
  const res = { status: sinon.stub(), end: sinon.stub() };
  docxtract(req, res);
  t.deepEqual(res.status.firstCall.args, [405]);
  t.true(res.end.calledOnce);
});
