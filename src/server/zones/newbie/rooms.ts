import { Room } from '@core/entities/room';
import { Zone } from '@server/modules/core/entities/zone';

export const registerRooms = (zone: Zone) => {
  new Room(
    {
      key: 'entrance',
      roomName: 'Entrance to Newbie Academy',
      description: `You are in the entrance to the Newbie Academy which exists to get new adventures acquainted with this realm.`,
      exits: [{ destination: 'above_monster_ring', direction: 'west' }],
    },
    zone
  );

  new Room(
    {
      key: 'above_monster_ring',
      roomName: 'Above the monster ring',
      description: `You are standing above the monster ring and can hear a mixture of roars and yelps from different creatures below you.`,
      exits: [
        { destination: 'entrance', direction: 'east' },
        { destination: 'in_monster_ring', direction: 'down' },
      ],
    },
    zone
  );

  new Room(
    {
      key: 'in_monster_ring',
      roomName: 'In the monster ring',
      description: `You are standing in the middle of the monster ring and are surrounded by roars and yelps coming from all around you.`,
      exits: [
        { destination: 'above_monster_ring', direction: 'up' },
        { destination: 'monster_ring_kobold', direction: 'north' },
      ],
    },
    zone
  );

  new Room(
    {
      key: 'monster_ring_kobold',
      roomName: 'Kobold lair',
      description: `You are standing in a simple kobold lair.`,
      exits: [{ destination: 'in_monster_ring', direction: 'south' }],
      resets: { characters: [{ key: 'kobold', inventory: [{ key: 'helm' }] }] },
    },
    zone
  );
};
