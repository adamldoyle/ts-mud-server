import { ExitFlag, Room } from '@core/entities/room';
import { Zone } from '@server/modules/core/entities/zone';

export const registerRooms = (zone: Zone) => {
  new Room(
    {
      key: 'limbo',
      roomName: 'Limbo',
      description: 'You are in limbo.',
      exits: [
        { direction: 'north', destination: 'limbo', flags: [ExitFlag.DOOR, ExitFlag.CLOSED] },
        { direction: 'south', destination: 'limbo', flags: [ExitFlag.DOOR, ExitFlag.CLOSED] },
        { direction: 'east', destination: 'limbo', flags: [ExitFlag.DOOR, ExitFlag.CLOSED] },
        { direction: 'west', destination: 'limbo', flags: [ExitFlag.DOOR, ExitFlag.CLOSED] },
      ],
    },
    zone
  );
};
