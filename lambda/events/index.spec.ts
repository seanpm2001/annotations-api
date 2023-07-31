import { Event, handlers } from './handlers';
import { processor } from './index';
import sinon from 'sinon';
import { SQSEvent } from 'aws-lambda';
import * as Sentry from '@sentry/serverless';

describe('event handlers', () => {
  let deleteStub: sinon.SinonStub;
  let sentryStub: sinon.SinonStub;
  beforeEach(() => {
    sinon.restore();
    sentryStub = sinon.stub(Sentry, 'captureException');
  });
  afterAll(() => sinon.restore());
  describe('with no handler errors', () => {
    beforeEach(() => {
      deleteStub = sinon.stub(handlers, Event.ACCOUNT_DELETION).resolves();
    });
    it('routes to the correct handler function based on detail-type', async () => {
      const records = {
        Records: [
          {
            body: JSON.stringify({
              Message: JSON.stringify({
                'detail-type': Event.ACCOUNT_DELETION,
              }),
            }),
          },
        ],
      };
      await processor(records as SQSEvent);
      expect(deleteStub.callCount).toEqual(1);
      expect(deleteStub.getCall(0).args).toEqual([records.Records[0]]);
    });
    it('returns batchItemFailure and logs to Sentry if handler does not exist', async () => {
      const records = {
        Records: [
          {
            body: JSON.stringify({
              Message: JSON.stringify({ 'detail-type': 'NOT_A_TYPE' }),
            }),
            messageId: 'abc',
          },
        ],
      };
      const res = await processor(records as SQSEvent);
      expect(res.batchItemFailures).toEqual([{ itemIdentifier: 'abc' }]);
      expect(sentryStub.callCount).toEqual(1);
      expect(sentryStub.getCall(0).args[0].message).toEqual(
        `Unable to retrieve handler for detail-type='NOT_A_TYPE'`,
      );
    });
  });
  describe('with handler errors', () => {
    beforeEach(() => {
      deleteStub = sinon
        .stub(handlers, Event.ACCOUNT_DELETION)
        .rejects(Error('got an error'));
    });
    it('returns batchItemFailure and logs to Sentry if handler throws error', async () => {
      const records = {
        Records: [
          {
            body: JSON.stringify({
              Message: JSON.stringify({
                'detail-type': Event.ACCOUNT_DELETION,
              }),
            }),
            messageId: 'abc',
          },
        ],
      };
      const res = await processor(records as SQSEvent);
      expect(res.batchItemFailures).toEqual([{ itemIdentifier: 'abc' }]);
      expect(sentryStub.callCount).toEqual(1);
      expect(sentryStub.getCall(0).args[0].message).toEqual('got an error');
    });
  });
});
