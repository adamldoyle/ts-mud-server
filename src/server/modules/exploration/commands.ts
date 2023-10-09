import { Character } from '@core/entities/character';
import { DIRECTION_ALIASES, DIRECTION_OPPOSITES, Exit } from '@core/entities/room';
import { parseArguments } from '@core/commands/CommandHandler';
import { Item } from '@core/entities/item';
import { getGameServerSafely } from '@server/GameServerInstance';

export const registerCommands = () => {
  const gameServer = getGameServerSafely();

  gameServer.commandHandler.registerCommand({
    name: 'look',
    aliases: ['l'],
    handler(invoker, command) {
      if (command.rest === '') {
        return invoker.emitTo(invoker.room.lookAt(invoker));
      }
      let response = parseArguments(invoker, command.params, '[at] char.room');
      if (response) {
        const target = response[0] as Character;
        return invoker.emitTo(target.lookAt(invoker));
      }

      response = parseArguments(invoker, command.params, '[at] exit.peekable');
      if (response) {
        const target = response[0] as Exit;
        return invoker.emitTo(`You look that way...\n${target.destination.lookAt(invoker)}`);
      }

      for (const container of ['inv', 'room']) {
        response = parseArguments(invoker, command.params, `[at] item.${container}`);
        if (response) {
          const target = response[0] as Item;
          return invoker.emitTo(target.lookAt(invoker));
        }
      }

      invoker.emitTo('What do you want to look at?');
    },
  });

  const findExit = (invoker: Character, params: string[]): Exit | undefined => {
    const visibleResponse = parseArguments(invoker, params, 'exit.visible');
    if (visibleResponse?.length !== 1) {
      return invoker.emitTo("You don't see an exit in that direction.");
    }

    const passableResponse = parseArguments(invoker, params, 'exit.passable');
    if (passableResponse?.length !== 1) {
      return invoker.emitTo('You are blocked from going that direction.');
    }

    return visibleResponse[0] as Exit;
  };

  const move = (invoker: Character, params: string[]) => {
    const room = invoker.room;
    const exit = findExit(invoker, params);
    if (!exit) {
      return;
    }

    const inRoomFollowers = invoker.followers.filter((follower) => follower.room === room);
    room.emitTo(`${invoker}${inRoomFollowers.length > 0 ? `'s party` : ''} leaves ${exit.direction}.`, [invoker, ...inRoomFollowers]);
    const newRoom = exit.destination;
    newRoom.addCharacter(invoker);
    let oppositePretty = DIRECTION_OPPOSITES[exit.direction] ?? 'somewhere';
    if (['north', 'south', 'east', 'west'].includes(oppositePretty)) {
      oppositePretty = `the ${oppositePretty}`;
    }
    newRoom.emitTo(`${invoker}${inRoomFollowers.length > 0 ? `'s party` : ''} arrives from ${oppositePretty}.`, [invoker, ...inRoomFollowers]);
    invoker.emitTo('You arrive at...');
    invoker.sendCommand('look');

    inRoomFollowers.forEach((follower) => {
      follower.emitTo(`You follow ${invoker}...`);
      newRoom.addCharacter(follower);
      follower.sendCommand('look');
    });
  };

  const registerMoveCommand = (direction: string, alias?: string) => {
    gameServer.commandHandler.registerCommand({
      name: direction,
      aliases: alias ? [alias] : undefined,
      requiresBalance: true,
      handler: (invoker, command) => {
        move(invoker, direction === 'move' ? command.params : command.rawInput.split(' '));
      },
    });
  };
  registerMoveCommand('move');
  Object.entries(DIRECTION_ALIASES).forEach((entry) => {
    registerMoveCommand(entry[1], entry[0]);
  });

  gameServer.commandHandler.registerCommand({
    name: 'follow',
    requiresBalance: true,
    handler: (invoker, command) => {
      const response = parseArguments(invoker, command.params, 'char.room.noself');
      if (!response) {
        return invoker.emitTo("They're not here to follow.");
      }

      const target = response[0] as Character;
      invoker.unfollow();
      invoker.follow(target);
    },
  });

  gameServer.commandHandler.registerCommand({
    name: 'unfollow',
    requiresBalance: true,
    handler: (invoker) => {
      invoker.unfollow();
    },
  });

  gameServer.commandHandler.registerCommand({
    name: 'disband',
    requiresBalance: true,
    handler: (invoker) => {
      invoker.disband();
    },
  });

  gameServer.commandHandler.registerCommand({
    name: 'open',
    requiresBalance: true,
    handler: (invoker, command) => {
      if (!command.rest) {
        return invoker.emitTo(`Open what?`);
      }

      const direction = DIRECTION_ALIASES[command.rest] ?? command.rest;
      const oppositeDirection = DIRECTION_OPPOSITES[direction];
      let response = parseArguments(invoker, [direction], 'exit.openable');
      if (response?.length !== 1) {
        response = parseArguments(invoker, [direction], 'exit.visible');
        if (response?.length !== 1) {
          return invoker.emitTo("You don't see an exit in that direction.");
        }
        return invoker.emitTo('There is nothing to open in that direction.');
      }
      const exit = response[0] as Exit;
      if (!exit.open(invoker)) {
        // This shouldn't happen since we checked for openable above
        return invoker.emitTo(`You can't open it.`);
      }

      invoker.emitTo(`You open the way ${exit.direction}.`);
      invoker.room.emitTo(`${invoker} opens the way ${exit.direction}.`, [invoker]);

      const oppositeExit = exit.destination.exits[oppositeDirection];
      if (oppositeExit && oppositeExit.destination === invoker.room && oppositeExit.canOpen(invoker)) {
        oppositeExit.open(invoker);
        exit.destination.emitTo(`The ${oppositeExit.direction} way opens.`);
      }
    },
  });

  gameServer.commandHandler.registerCommand({
    name: 'close',
    requiresBalance: true,
    handler: (invoker, command) => {
      if (!command.rest) {
        return invoker.emitTo('Close what?');
      }
      const direction = DIRECTION_ALIASES[command.rest] ?? command.rest;
      const oppositeDirection = DIRECTION_OPPOSITES[direction];
      let response = parseArguments(invoker, [direction], 'exit.closeable');
      if (response?.length !== 1) {
        response = parseArguments(invoker, [direction], 'exit.visible');
        if (response?.length !== 1) {
          return invoker.emitTo(`You don't see an exit in that direction.`);
        }
        return invoker.emitTo('There is nothing to close in that direction.');
      }
      const exit = response[0] as Exit;
      if (!exit.close(invoker)) {
        // This shouldn't happen since we checked for closeable above
        return invoker.emitTo(`You can't close it.`);
      }

      invoker.emitTo(`You close the way ${exit.direction}.`);
      invoker.room.emitTo(`${invoker} closes the way ${exit.direction}.`, [invoker]);

      const oppositeExit = exit.destination.exits[oppositeDirection];
      if (oppositeExit && oppositeExit.destination === invoker.room && oppositeExit.canClose(invoker)) {
        oppositeExit.close(invoker);
        exit.destination.emitTo(`The ${oppositeExit.direction} way closes.`);
      }
    },
  });
};
