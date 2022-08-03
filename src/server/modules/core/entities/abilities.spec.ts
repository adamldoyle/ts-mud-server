import * as abilities from './abilities';

describe('abilities', () => {
  describe('defaultAbilities', () => {
    test('sets all abilities to 12 with no modifiers', () => {
      expect(abilities.defaultAbilities()).toEqual({
        STRENGTH: { baseValue: 12, modifiers: {}, value: 12 },
        DEXTERITY: { baseValue: 12, modifiers: {}, value: 12 },
        CONSTITUTION: { baseValue: 12, modifiers: {}, value: 12 },
        INTELLIGENCE: { baseValue: 12, modifiers: {}, value: 12 },
        WISDOM: { baseValue: 12, modifiers: {}, value: 12 },
        CHARISMA: { baseValue: 12, modifiers: {}, value: 12 },
      });
    });
  });

  describe('buildAbilities', () => {
    test('generates defaults when no changes', () => {
      expect(abilities.buildAbilities()).toEqual(abilities.defaultAbilities());
    });

    test('overrides abilities with values', () => {
      expect(
        abilities.buildAbilities({
          DEXTERITY: { baseValue: 10, modifiers: { race: 3 }, value: 13 },
          WISDOM: { baseValue: 14, modifiers: { other: 2 }, value: 16 },
        })
      ).toEqual({
        ...abilities.defaultAbilities(),
        DEXTERITY: { baseValue: 10, modifiers: { race: 3 }, value: 13 },
        WISDOM: { baseValue: 14, modifiers: { other: 2 }, value: 16 },
      });
    });
  });
});
