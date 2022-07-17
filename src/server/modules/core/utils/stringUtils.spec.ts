import { capitalize } from './stringUtils';

describe('core/utils/stringUtils', () => {
  describe('capitalize', () => {
    test('', () => {
      expect(capitalize('tEsT tHiS')).toEqual('Test this');
    });
  });
});
