/**
 * Roll single die and return value
 * @param sides Number of sides on die
 * @returns Value
 */
export const rollDie = (sides: number): number => {
  return Math.floor(Math.random() * sides) + 1;
};

/**
 * Roll multiple dice and return combined value
 * @param totalDice Total number of dice to roll
 * @param sides Number of sides on each dice
 * @returns Combined value
 */
export const rollDice = (totalDice: number, sides: number): number => {
  return [...Array(totalDice)].reduce((acc) => acc + rollDie(sides), 0);
};

/**
 * Roll dice and return combined value
 * @param diceConfig Dice to roll, e.g. 2d10
 * @returns Combind value
 */
export const roll = (diceConfig: string): number => {
  const pieces = diceConfig.split('d');
  if (pieces.length !== 2) {
    throw new Error('Invalid dice config');
  }
  return rollDice(parseInt(pieces[0]), parseInt(pieces[1]));
};

/**
 * Roll multiple dice types and return combined value
 * @param diceConfigs Dice to roll, e.g. ['2d10', '1d6']
 * @returns Combined value
 */
export const rollMultiple = (diceConfigs: string[]): number => {
  return diceConfigs.reduce((acc, diceConfig) => acc + roll(diceConfig), 0);
};
