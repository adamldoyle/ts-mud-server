export const DEFAULT_STAT_VALUE = 12;

export enum AbilityType {
  STRENGTH = 'STRENGTH',
  DEXTERITY = 'DEXTERITY',
  CONSTITUTION = 'CONSTITUTION',
  INTELLIGENCE = 'INTELLIGENCE',
  WISDOM = 'WISDOM',
  CHARISMA = 'CHARISMA',
}

export interface IAbility {
  baseValue: number;
  modifiers: Record<string, number>;
  value: number;
}

export type IAbilities = Record<AbilityType, IAbility>;

const defaultAbility = (): IAbility => ({
  baseValue: DEFAULT_STAT_VALUE,
  modifiers: {},
  value: DEFAULT_STAT_VALUE,
});

export const defaultAbilities = (): IAbilities => ({
  STRENGTH: defaultAbility(),
  DEXTERITY: defaultAbility(),
  CONSTITUTION: defaultAbility(),
  INTELLIGENCE: defaultAbility(),
  WISDOM: defaultAbility(),
  CHARISMA: defaultAbility(),
});

export const buildAbilities = (abilities?: Partial<IAbilities>): IAbilities => {
  return Object.entries(abilities ?? {}).reduce<IAbilities>((acc, [abilityType, ability]) => {
    acc[abilityType as AbilityType] = ability;
    return acc;
  }, defaultAbilities());
};
