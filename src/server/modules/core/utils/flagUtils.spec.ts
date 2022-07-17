import * as flagUtils from './flagUtils';

enum TestFlag {
  ONE = 1 << 0,
  TWO = 1 << 1,
  THREE = 1 << 2,
}

describe('core/utils/flagUtils', () => {
  describe('mergeFlags', () => {
    test('returns 0 if no flags', () => {
      expect(flagUtils.mergeFlags()).toEqual(0);
    });

    test('merges array of flags to a single value', () => {
      expect(flagUtils.mergeFlags([TestFlag.ONE, TestFlag.THREE])).toEqual(5);
    });

    test('returns value if already merged', () => {
      expect(flagUtils.mergeFlags(7)).toEqual(7);
    });
  });

  describe('hasFlag', () => {
    test('returns true if flag set and false otherwise', () => {
      expect(flagUtils.hasFlag(5, TestFlag.ONE)).toBeTruthy();
      expect(flagUtils.hasFlag(5, TestFlag.TWO)).toBeFalsy();
      expect(flagUtils.hasFlag(5, TestFlag.THREE)).toBeTruthy();
    });
  });

  describe('addFlag', () => {
    test('adds flag to merged value', () => {
      expect(flagUtils.addFlag(1, TestFlag.THREE)).toEqual(5);
    });

    test('does nothing if already added', () => {
      expect(flagUtils.addFlag(5, TestFlag.THREE)).toEqual(5);
    });
  });

  describe('removeFlag', () => {
    test('removes flag from merged value', () => {
      expect(flagUtils.removeFlag(5, TestFlag.THREE)).toEqual(1);
    });

    test('does nothing if already removed', () => {
      expect(flagUtils.removeFlag(1, TestFlag.THREE)).toEqual(1);
    });
  });

  describe('Flags', () => {
    describe('constructor', () => {
      test('initializes to 0 if no flags', () => {
        const flags = new flagUtils.Flags();
        expect(flags.flags).toEqual(0);
      });

      test('merges array of flags to a single value', () => {
        const flags = new flagUtils.Flags([TestFlag.ONE, TestFlag.THREE]);
        expect(flags.flags).toEqual(5);
      });

      test('returns value if already merged', () => {
        const flags = new flagUtils.Flags(7);
        expect(flags.flags).toEqual(7);
      });
    });

    describe('hasFlag', () => {
      test('returns true if flag set and false otherwise', () => {
        const flags = new flagUtils.Flags(5);
        expect(flags.hasFlag(TestFlag.ONE)).toBeTruthy();
        expect(flags.hasFlag(TestFlag.TWO)).toBeFalsy();
        expect(flags.hasFlag(TestFlag.THREE)).toBeTruthy();
      });
    });

    describe('addFlag', () => {
      test('adds flag to merged value', () => {
        const flags = new flagUtils.Flags(1);
        flags.addFlag(TestFlag.THREE);
        expect(flags.flags).toEqual(5);
      });

      test('does nothing if already added', () => {
        const flags = new flagUtils.Flags(5);
        flags.addFlag(TestFlag.THREE);
        expect(flags.flags).toEqual(5);
      });
    });

    describe('removeFlag', () => {
      test('removes flag from merged value', () => {
        const flags = new flagUtils.Flags(5);
        flags.removeFlag(TestFlag.THREE);
        expect(flags.flags).toEqual(1);
      });

      test('does nothing if already removed', () => {
        const flags = new flagUtils.Flags(1);
        flags.removeFlag(TestFlag.THREE);
        expect(flags.flags).toEqual(1);
      });
    });
  });
});
