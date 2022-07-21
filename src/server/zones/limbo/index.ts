import { ExitFlag, Room } from '@core/entities/room';
import { Zone } from '@core/entities/zone';
import { Instance } from '@server/GameServerInstance';

export const registerZone = () => {
  if (!Instance.gameServer) {
    return;
  }

  const zone = new Zone({ key: 'limbo', zoneName: 'Limbo' });
  Instance.gameServer.catalog.registerZone(zone);
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
