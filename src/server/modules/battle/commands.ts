import { parseArguments } from '@core/commands/CommandHandler';
import { Instance } from '@server/GameServerInstance';
import { Character, CharacterFlag } from '@core/entities/character';
import { ItemType } from '@core/entities/item';
import * as diceUtils from '@core/utils/diceUtils';

export const canAttack = (invoker: Character, target: Character) => {
  if (!invoker.npc && !target.npc) {
    return false;
  }
  if (invoker.flags.hasFlag(CharacterFlag.PACIFISM)) {
    return false;
  }
  if (target.flags.hasFlag(CharacterFlag.PACIFISM)) {
    return false;
  }
  return true;
};

export const registerCommands = () => {
  if (!Instance.gameServer) {
    return;
  }

  const commandHandler = Instance.gameServer.commandHandler;

  commandHandler.registerCommand({
    name: 'attack',
    aliases: ['a'],
    requiresBalance: true,
    handler: (invoker, command) => {
      const response = parseArguments(invoker, command.params, 'char.room.noself');
      if (!response) {
        return invoker.emitTo('Attack whom?');
      }

      const target = response[0] as Character;
      if (!canAttack(invoker, target)) {
        return invoker.emitTo(`You can't attack them.`);
      }

      const weapon = [invoker.equipment.HELD_RIGHT, invoker.equipment.HELD_LEFT].find((item) => item?.type.type === ItemType.WEAPON);
      if (!weapon || weapon.type.type !== ItemType.WEAPON) {
        return invoker.emitTo(`You're not holding a weapon.`);
      }

      const damage = diceUtils.roll(weapon.type.damage);
      invoker.emitTo(`You attack ${target} with your ${weapon} for <R>${damage}<n>!`);
      target.emitTo(`${invoker} attacks you with their ${weapon} for <R>${damage}<n>!`);
      invoker.room.emitTo(`${invoker} attacks ${target} with their ${weapon} for <R>${damage}<n>!`, [invoker, target]);
    },
  });
};
