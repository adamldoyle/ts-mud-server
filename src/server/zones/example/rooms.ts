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
      exits: [
        { direction: 'east', destination: 'lobby' },
        { direction: 'north', destination: 'room_basics' },
        { direction: 'south', destination: 'room_exits' },
      ],
    },
    zone
  );

  new Room(
    {
      key: 'room_basics',
      roomName: 'Room basics',
      description: `Rooms help lay out the world in a navigatable way and can have characters or items in them. Rooms are linked together via exits. Unlike items or characters, only one instance of a room can exist in the world at a time.
  
There are several admin commands available to you for working with rooms:
  - @rlist - List all rooms for the current zone or any other zone, e.g. "<C>@rlist<n>" or "<C>@rlist example<n>" to show all rooms from this Example Zone.
  - @rreset - Reset the current room and return it to its defined state.`,
      exits: [{ direction: 'south', destination: 'room_lobby' }],
    },
    zone
  );

  new Room(
    {
      key: 'room_exits',
      roomName: 'Room exits',
      description: `Exits provide the link between two different rooms in a given direction. They can be a basic exit, or they can have special characteristics that make them behave like a door that can be opened or window that can be looked through but not walked through.`,
      exits: [{ direction: 'north', destination: 'room_lobby' }],
    },
    zone
  );

  new Room(
    {
      key: 'character_lobby',
      roomName: 'Character lobby',
      description: `You are in the area of the zone dedicated to character construction. Rooms are laid out all around you to learn from.`,
      exits: [
        { direction: 'south', destination: 'lobby' },
        { direction: 'east', destination: 'character_basics' },
      ],
    },
    zone
  );

  new Room(
    {
      key: 'character_basics',
      roomName: 'Character basics',
      description: `Characters exist in the world alongside players to provide people to interact with. They can be fought with, act as shopkeepers, provide quests, whatever you want.
  
There are several admin commands available to you for working with characters:
  - @clist - List all characters for the current zone or any other zone, e.g. "<C>@clist<n>" or "<C>@clist example<n>" to show all characters from this Example Zone.
  - @cload - Load an instance of an character into the room, e.g. "<C>@cload dummy<n>" or "<C>@cload dummy@example<n>" will load a Dummy into your current room.`,
      exits: [{ direction: 'west', destination: 'character_lobby' }],
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
        { direction: 'south', destination: 'item_equipment' },
      ],
    },
    zone
  );

  new Room(
    {
      key: 'item_basics',
      roomName: 'Item basics',
      description: `Items are one of the basic building blocks of a world and are the things that players can look at ("<C>look at bobble<n>"), interact with ("<C>put bobble in bit<n>"), pick up ("<C>get bobble<n>"), etc.
  
There are several admin commands available to you for working with items:
  - @ilist - List all items for the current zone or any other zone, e.g. "<C>@ilist<n>" or "<C>@ilist example<n>" to show all items from this Example Zone.
  - @iload - Load an instance of an item into your inventory, e.g. "<C>@iload bobble<n>" or "<C>@iload bobble@example<n>" will load a Bobble into your inventory.`,
      exits: [{ direction: 'south', destination: 'item_lobby' }],
    },
    zone
  );

  new Room(
    {
      key: 'item_modifications',
      roomName: 'Item modifications',
      description: `Modifications can be used to apply superficial changes to items (e.g. color, texture). If a modification would produce a drastically different item (e.g. price, weight, effectiveness) a separate item definition should be used instead of a modification. It's a good practice to provide default values for all modifications as part of the definition in case a value for a modification is not provided.

A modification can be used as part of a name or description by wrapping the modification key with curly brackets (e.g. "a {color} bit"). Modification values can be provided as part of the definition via the modifications property (which will act as the default modifications), as part of the modifications property in the reset definition (which will set the modifications for that specific reset instance), or as extra params as part of the @iload command (e.g. "<C>@iload bit texture=matte color=green<n>").`,
      exits: [{ direction: 'west', destination: 'item_lobby' }],
      resets: { items: [{ key: 'bit', modifications: { texture: 'shiny', color: 'silver' } }] },
    },
    zone
  );

  new Room(
    {
      key: 'item_equipment',
      roomName: 'Equipment',
      description: `Equipment is a special type of item that may be worn and provide some benefit to the wearer. Equipment must have at least one defined wear position that dictates where it is worn. Currently worn equipment (and its positions) can be checked with "<C>equipment<n>". At the moment nothing special happens when an item is worn, but that will change in the future and they may provide protection, affects, etc.`,
      exits: [{ direction: 'north', destination: 'item_lobby' }],
    },
    zone
  );
};
