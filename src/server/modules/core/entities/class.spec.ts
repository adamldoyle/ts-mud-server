import { Classes } from './class';

describe('class', () => {
  describe('Classes', () => {
    test('keys match the types', () => {
      Object.entries(Classes).forEach(([classType, clazz]) => {
        expect(classType).toEqual(clazz.type);
      });
    });
  });
});
