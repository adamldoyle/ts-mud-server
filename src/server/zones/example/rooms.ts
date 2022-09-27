import { Room } from '@core/entities/room';
import { Zone } from '@server/modules/core/entities/zone';

export const registerRooms = (zone: Zone) => {
  new Room(
    {
      key: 'entrance',
      roomName: 'Entrance to Example Zone',
      description: `You are in the entrance to the Example Zone. The Example Zone is full of rooms and examples showcasing all of the possibilities for building and world crafting.`,
      exits: [{ direction: 'north', destination: 'lobby' }],
    },
    zone
  );

  new Room(
    {
      key: 'lobby',
      roomName: 'Central lobby',
      description: `You are in the central lobby of the Example Zone. There are exits in different directions leading off to different rooms dedicated to various categories of building.`,
      exits: [
        { direction: 'south', destination: 'entrance' },
        { direction: 'west', destination: 'room_lobby' },
        { direction: 'north', destination: 'character_lobby' },
        { direction: 'east', destination: 'item_lobby' },
      ],
    },
    zone
  );

  new Room(
    {
      key: 'room_lobby',
      roomName: 'Room lobby',
      description: `You are in the area of the zone dedicated to room construction. Rooms are laid out all around you to learn from.`,
      exits: [{ direction: 'east', destination: 'lobby' }],
    },
    zone
  );

  new Room(
    {
      key: 'character_lobby',
      roomName: 'Character lobby',
      description: `You are in the area of the zone dedicated to character construction. Rooms are laid out all around you to learn from.`,
      exits: [{ direction: 'south', destination: 'lobby' }],
    },
    zone
  );

  new Room(
    {
      key: 'item_lobby',
      roomName: 'Item lobby',
      description: `You are in the area of the zone dedicated to item construction. Rooms are laid out all around you to learn from.`,
      exits: [
        { direction: 'west', destination: 'lobby' },
        { direction: 'north', destination: 'item_basics' },
        { direction: 'east', destination: 'item_modifications' },
      ],
    },
    zone
  );

  new Room(
    {
      key: 'item_basics',
      roomName: 'Item basics',
      description: `Items are one of the basic building blocks of a world and are the things that players can look at ("look at bobble"), interact with ("open bobble"), pick up ("get bobble"), etc.
  
There are several admin commands available to you for working with items:
  - @ilist - List all items for the current zone or any other zone, e.g. "@ilist" or "@ilist example" to show all items from this Example Zone.
  - @iload - Load an instance of an item into your inventory, e.g. "@iload bobble" or "@iload bobble@example" will load a Bobble into your inventory.`,
      exits: [{ direction: 'south', destination: 'item_lobby' }],
    },
    zone
  );

  new Room(
    {
      key: 'item_modifications',
      roomName: 'Item modifications',
      description: `Modifications can be used to apply superficial changes to items (e.g. color, texture). If a modification would produce a drastically different item (e.g. price, weight, effectiveness) a separate item definition should be used instead of a modification. It's a good practice to provide default values for all modifications as part of the definition in case a value for a modification is not provided.

A modification can be used as part of a name or description by wrapping the modification key with curly brackets (e.g. "a {color} bit"). Modification values can be provided as part of the definition via the modifications property (which will act as the default modifications), as part of the modifications property in the reset definition (which will set the modifications for that specific reset instance), or as extra params as part of the @iload command (e.g. @iload bit texture=matte color=green).`,
      exits: [{ direction: 'west', destination: 'item_lobby' }],
      resets: { items: [{ key: 'bit', modifications: { texture: 'shiny', color: 'silver' } }] },
    },
    zone
  );
};
