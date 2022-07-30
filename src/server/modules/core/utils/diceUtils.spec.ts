import * as diceUtils from './diceUtils';

describe('diceUtils', () => {
  describe('rollDie', () => {
    test('always rolls from 1 to max sides of die', () => {
      for (let i = 0; i < 100; i++) {
        const roll = diceUtils.rollDie(10);
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(10);
      }
    });

    test('produces stastically equal rolls', () => {
      const totalRolls = 100000;
      const sides = 10;
      const allRolls: Record<number, number> = {};
      for (let i = 0; i < totalRolls; i++) {
        const roll = diceUtils.rollDie(sides);
        allRolls[roll] = (allRolls[roll] ?? 0) + 1;
      }

      for (let roll = 1; roll <= sides; roll++) {
        const frequency = Math.round((1000 * allRolls[roll]) / totalRolls) / 10;
        expect(frequency).toBeGreaterThanOrEqual(9.7);
        expect(frequency).toBeLessThanOrEqual(10.3);
      }
    });
  });

  describe('rollDice', () => {
    test('always rolls from 1 to max sides of die (times number of dice)', () => {
      for (let i = 0; i < 100; i++) {
        const roll = diceUtils.rollDice(2, 10);
        expect(roll).toBeGreaterThanOrEqual(2);
        expect(roll).toBeLessThanOrEqual(20);
      }
    });

    test('utilizes rollDie for rolling', () => {
      jest.spyOn(diceUtils, 'rollDie');
      for (let i = 0; i < 100; i++) {
        diceUtils.rollDice(2, 10);
      }
      expect(diceUtils.rollDie).toBeCalledTimes(200);
    });
  });

  describe('roll', () => {
    test('rolls dice based on syntax', () => {
      jest.spyOn(diceUtils, 'rollDice');
      diceUtils.roll('3d12');
      expect(diceUtils.rollDice).toBeCalledWith(3, 12);
    });

    test('always rolls from 1 to max sides of die (times number of dice)', () => {
      for (let i = 0; i < 100; i++) {
        const roll = diceUtils.roll('2d10');
        expect(roll).toBeGreaterThanOrEqual(2);
        expect(roll).toBeLessThanOrEqual(20);
      }
    });

    test('throws error if invalid syntax', () => {
      expect(() => diceUtils.roll('12')).toThrowError();
    });
  });

  describe('rollMultiple', () => {
    test('rolls multiple dice based on syntax', () => {
      jest.spyOn(diceUtils, 'rollDice');
      diceUtils.rollMultiple(['2d12', '1d6', '3d20']);
      expect(diceUtils.rollDice).toBeCalledWith(2, 12);
      expect(diceUtils.rollDice).toBeCalledWith(1, 6);
      expect(diceUtils.rollDice).toBeCalledWith(3, 20);
    });

    test('always rolls from 1 to max sides of die (times number of dice)', () => {
      for (let i = 0; i < 100; i++) {
        const roll = diceUtils.rollMultiple(['1d10', '2d6']);
        expect(roll).toBeGreaterThanOrEqual(3);
        expect(roll).toBeLessThanOrEqual(22);
      }
    });
  });
});
