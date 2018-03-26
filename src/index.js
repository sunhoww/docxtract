// @flow

import type {
  CloudFunctionRequest,
  CloudFunctionResponse,
} from '../flow-typed/gcf';

/**
 * HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */

export function docxtract(
  req: CloudFunctionRequest,
  res: CloudFunctionResponse
): void {
  res.send('docxtract');
}
