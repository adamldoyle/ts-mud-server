import * as race from './race';

describe('race', () => {
  describe('Races', () => {
    test('keys match the types', () => {
      Object.entries(race.Races).forEach(([raceType, race]) => {
        expect(raceType).toEqual(race.type);
      });
    });
  });
});
