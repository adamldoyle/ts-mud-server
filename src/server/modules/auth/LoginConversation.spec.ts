import fs from 'fs';
import { Instance } from '@server/GameServerInstance';
import { buildRoom, buildZone, initializeTestServer } from '@server/testUtils';
import { LoginConversation } from './LoginConversation';
import { Room } from '@core/entities/room';
import { IPlayerDefinition } from '@core/entities/character';
import { RaceType } from '@core/entities/race';
import { ClassType } from '@core/entities/class';
import { defaultAbilities } from '@core/entities/abilities';

jest.mock('fs');
jest.mock('bcryptjs');

describe('LoginConversation', () => {
  let starterRoom: Room;
  beforeEach(() => {
    initializeTestServer();
    const zone = buildZone({}, true);
    starterRoom = buildRoom(zone, 'starterRoom');

    (fs.readdirSync as jest.Mock).mockReturnValue(['', '']);
  });

  const startConversation = (names: string[]) => {
    const complete = jest.fn();
    const conversation = new LoginConversation(
      {
        accountId: 'testAccountId',
        username: 'testUsername',
        password: 'testPassword',
        characterNames: names,
      },
      complete
    );
    return conversation;
  };

  const getLastMsg = () => {
    const calls = (Instance.gameServer?.sendMessageToAccount as jest.Mock).mock.calls;
    return calls[calls.length - 1][1];
  };

  const validateNoCharacterPrompt = () => {
    expect(getLastMsg()).toEqual(`
Choose character:

1: Create a new character

Choice (#):`);
  };

  const validateOldCharacterPrompt = () => {
    expect(getLastMsg()).toEqual(`
Choose character:
1: Oldname
2: Create a new character

Choice (#):`);
  };

  const validateNamePrompt = () => {
    expect(getLastMsg()).toEqual(`Creating a new character...

Name:`);
  };

  const validateRacePrompt = () => {
    expect(getLastMsg()).toEqual(`
Choose race:
Dragonborn, Dwarf, Elf, Gnome, Half-Orc, Halfling, Human, Tiefling.
Choice (or "help <race>"):`);
  };

  const validateClassPrompt = () => {
    expect(getLastMsg()).toEqual(`
Choose class:
Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard.
Choice (or "help <class>"):`);
  };

  const validateAnyAbilityPrompt = () => {
    expect(getLastMsg()).toContain(`Which ability do you want to be `);
  };

  const createCharacter = (conversation: LoginConversation) => {
    validateNamePrompt();
    conversation.handleInput('newName');
    expect(getLastMsg()).toEqual('Create new character with name Newname? (Y/N)');
    conversation.handleInput('y');
    validateRacePrompt();
    conversation.handleInput('dwarf');
    validateClassPrompt();
    conversation.handleInput('fighter');
    expect(getLastMsg()).toEqual(`
Abilities:
       strength: -- + 2 = --
      dexterity: -- + 0 = --
   constitution: -- + 2 = --
   intelligence: -- + 0 = --
         wisdom: -- + 0 = --
       charisma: -- + 0 = --

Which ability do you want to be 15? strength, dexterity, constitution, intelligence, wisdom, charisma. Choice:`);
    conversation.handleInput('constitution');
    expect(getLastMsg()).toEqual(`
Abilities:
       strength: -- + 2 = --
      dexterity: -- + 0 = --
   constitution: 15 + 2 = 17
   intelligence: -- + 0 = --
         wisdom: -- + 0 = --
       charisma: -- + 0 = --

Which ability do you want to be 14? strength, dexterity, intelligence, wisdom, charisma. Choice:`);
    conversation.handleInput('wisdom');
    expect(getLastMsg()).toEqual(`
Abilities:
       strength: -- + 2 = --
      dexterity: -- + 0 = --
   constitution: 15 + 2 = 17
   intelligence: -- + 0 = --
         wisdom: 14 + 0 = 14
       charisma: -- + 0 = --

Which ability do you want to be 13? strength, dexterity, intelligence, charisma. Choice:`);
    conversation.handleInput('strength');
    expect(getLastMsg()).toEqual(`
Abilities:
       strength: 13 + 2 = 15
      dexterity: -- + 0 = --
   constitution: 15 + 2 = 17
   intelligence: -- + 0 = --
         wisdom: 14 + 0 = 14
       charisma: -- + 0 = --

Which ability do you want to be 12? dexterity, intelligence, charisma. Choice:`);
    conversation.handleInput('intelligence');
    expect(getLastMsg()).toEqual(`
Abilities:
       strength: 13 + 2 = 15
      dexterity: -- + 0 = --
   constitution: 15 + 2 = 17
   intelligence: 12 + 0 = 12
         wisdom: 14 + 0 = 14
       charisma: -- + 0 = --

Which ability do you want to be 10? dexterity, charisma. Choice:`);
    conversation.handleInput('charisma');
    expect(getLastMsg()).toEqual(`
Abilities:
       strength: 13 + 2 = 15
      dexterity: -- + 0 = --
   constitution: 15 + 2 = 17
   intelligence: 12 + 0 = 12
         wisdom: 14 + 0 = 14
       charisma: 10 + 0 = 10

Which ability do you want to be 8? dexterity. Choice:`);
    conversation.handleInput('dexterity');
    expect(getLastMsg()).toEqual(`
Abilities:
       strength: 13 + 2 = 15
      dexterity: 8 + 0 = 8
   constitution: 15 + 2 = 17
   intelligence: 12 + 0 = 12
         wisdom: 14 + 0 = 14
       charisma: 10 + 0 = 10

These are the attributes you want? (Y/N)`);
    conversation.handleInput('y');
    expect(getLastMsg()).toEqual(`
Name: Newname
Race: Dwarf
Class: Fighter

Abilities:
       strength: 13 + 2 = 15
      dexterity: 8 + 0 = 8
   constitution: 15 + 2 = 17
   intelligence: 12 + 0 = 12
         wisdom: 14 + 0 = 14
       charisma: 10 + 0 = 10

Create this character? (Y/N)`);
    conversation.handleInput('y');
    expect(getLastMsg()).toEqual(`
Character created.

Assuming place of Newname...`);

    expect(fs.writeFileSync).toBeCalledWith('data/players/newname.json', expect.any(String), { encoding: 'utf-8' });
    const newFile = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
    expect(newFile).toEqual({
      accountId: 'testAccountId',
      room: 'starterRoom@testZone',
      key: 'newname',
      name: 'Newname',
      playerNumber: 3,
      admin: false,
      class: 'FIGHTER',
      race: 'DWARF',
      abilities: {
        STRENGTH: { baseValue: 13, modifiers: { race: 2 }, value: 15 },
        DEXTERITY: { baseValue: 8, modifiers: {}, value: 8 },
        CONSTITUTION: { baseValue: 15, modifiers: { race: 2 }, value: 17 },
        INTELLIGENCE: { baseValue: 12, modifiers: {}, value: 12 },
        WISDOM: { baseValue: 14, modifiers: {}, value: 14 },
        CHARISMA: { baseValue: 10, modifiers: {}, value: 10 },
      },
      inventory: [],
      equipment: {},
      workingData: {},
    });
  };

  test('supports creating a first character', () => {
    const conversation = startConversation([]);
    validateNoCharacterPrompt();
    conversation.handleInput('1');

    createCharacter(conversation);

    expect(fs.writeFileSync).toBeCalledWith('data/accounts/testusername.json', expect.any(String), { encoding: 'utf-8' });
    const savedFile = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[1][1]);
    expect(savedFile).toEqual({
      accountId: 'testAccountId',
      username: 'testUsername',
      password: 'testPassword',
      characterNames: ['Newname'],
    });

    expect(conversation.completeCallback).toBeCalledTimes(1);
    const newPlayer = (conversation.completeCallback as jest.Mock).mock.calls[0][0];
    expect(newPlayer.key === 'newname');
  });

  test('supports creating a second character', () => {
    const conversation = startConversation(['Oldname']);
    validateOldCharacterPrompt();
    conversation.handleInput('2');

    createCharacter(conversation);

    expect(fs.writeFileSync).toBeCalledWith('data/accounts/testusername.json', expect.any(String), { encoding: 'utf-8' });
    const savedFile = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[1][1]);
    expect(savedFile).toEqual({
      accountId: 'testAccountId',
      username: 'testUsername',
      password: 'testPassword',
      characterNames: ['Oldname', 'Newname'],
    });

    expect(conversation.completeCallback).toBeCalledTimes(1);
    const newPlayer = (conversation.completeCallback as jest.Mock).mock.calls[0][0];
    expect(newPlayer.key === 'newname');
  });

  test('supports logging in as existing character', () => {
    const oldPlayerDef: IPlayerDefinition = {
      key: 'oldname',
      accountId: 'testAccountId',
      room: 'starterRoom@testZone',
      playerNumber: 2,
      name: 'Oldname',
      race: RaceType.GNOME,
      class: ClassType.CLERIC,
      abilities: defaultAbilities(),
    };
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(oldPlayerDef));
    const conversation = startConversation(['Oldname']);
    validateOldCharacterPrompt();
    conversation.handleInput('1');
    expect(getLastMsg()).toEqual('Assuming place of Oldname...');

    expect(conversation.completeCallback).toBeCalledTimes(1);
    const oldPlayer = (conversation.completeCallback as jest.Mock).mock.calls[0][0];
    expect(oldPlayer.key === 'oldname');
  });

  test('shows error if try to pick non-option', () => {
    const conversation = startConversation(['Oldname']);
    validateOldCharacterPrompt();
    conversation.handleInput('3');
    expect(getLastMsg()).toEqual('Invalid choice, please enter an option number.');
    conversation.handleInput('0');
    expect(getLastMsg()).toEqual('Invalid choice, please enter an option number.');
    conversation.handleInput('a');
    expect(getLastMsg()).toEqual('Invalid choice, please enter an option number.');
    conversation.handleInput('2');
    validateNamePrompt();
  });

  test('shows error if new name taken', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const conversation = startConversation([]);
    validateNoCharacterPrompt();
    conversation.handleInput('1');
    validateNamePrompt();
    conversation.handleInput('Existingname');
    expect(getLastMsg()).toEqual('Name already in use. Name:');
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    conversation.handleInput('Newname');
    expect(getLastMsg()).toEqual('Create new character with name Newname? (Y/N)');
  });

  test('shows error if not y or n on confirming new name', () => {
    const conversation = startConversation([]);
    validateNoCharacterPrompt();
    conversation.handleInput('1');
    validateNamePrompt();
    conversation.handleInput('Newname');
    expect(getLastMsg()).toEqual('Create new character with name Newname? (Y/N)');
    conversation.handleInput('Z');
    expect(getLastMsg()).toEqual('Enter Y or N for creating new character with name Newname.');
    conversation.handleInput('Y');
    validateRacePrompt();
  });

  test('supports rejecting new name', () => {
    const conversation = startConversation([]);
    validateNoCharacterPrompt();
    conversation.handleInput('1');
    validateNamePrompt();
    conversation.handleInput('Newname');
    expect(getLastMsg()).toEqual('Create new character with name Newname? (Y/N)');
    conversation.handleInput('N');
    validateNoCharacterPrompt();
  });

  test('shows error if invalid race', () => {
    const conversation = startConversation([]);
    validateNoCharacterPrompt();
    conversation.handleInput('1');
    validateNamePrompt();
    conversation.handleInput('Newname');
    expect(getLastMsg()).toEqual('Create new character with name Newname? (Y/N)');
    conversation.handleInput('Y');
    validateRacePrompt();
    conversation.handleInput('notarace');
    expect(getLastMsg()).toEqual(`Invalid choice.
Choose race:
Dragonborn, Dwarf, Elf, Gnome, Half-Orc, Halfling, Human, Tiefling.
Choice (or "help <race>"):`);
  });

  test('shows error if invalid class', () => {
    const conversation = startConversation([]);
    validateNoCharacterPrompt();
    conversation.handleInput('1');
    validateNamePrompt();
    conversation.handleInput('Newname');
    expect(getLastMsg()).toEqual('Create new character with name Newname? (Y/N)');
    conversation.handleInput('Y');
    validateRacePrompt();
    conversation.handleInput('dwarf');
    validateClassPrompt();
    conversation.handleInput('notaclass');
    expect(getLastMsg()).toEqual(`Invalid choice.
Choose class:
Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard.
Choice (or "help <class>"):`);
  });

  test('shows error if invalid ability', () => {
    const conversation = startConversation([]);
    validateNoCharacterPrompt();
    conversation.handleInput('1');
    validateNamePrompt();
    conversation.handleInput('Newname');
    expect(getLastMsg()).toEqual('Create new character with name Newname? (Y/N)');
    conversation.handleInput('Y');
    validateRacePrompt();
    conversation.handleInput('elf');
    validateClassPrompt();
    conversation.handleInput('rogue');
    validateAnyAbilityPrompt();
    conversation.handleInput('notanability');
    expect(getLastMsg()).toEqual(`Invalid choice.
Abilities:
       strength: -- + 0 = --
      dexterity: -- + 2 = --
   constitution: -- + 0 = --
   intelligence: -- + 0 = --
         wisdom: -- + 1 = --
       charisma: -- + 0 = --

Which ability do you want to be 15? strength, dexterity, constitution, intelligence, wisdom, charisma. Choice:`);
  });

  test('shows error if duplicate ability', () => {
    const conversation = startConversation([]);
    validateNoCharacterPrompt();
    conversation.handleInput('1');
    validateNamePrompt();
    conversation.handleInput('Newname');
    expect(getLastMsg()).toEqual('Create new character with name Newname? (Y/N)');
    conversation.handleInput('Y');
    validateRacePrompt();
    conversation.handleInput('elf');
    validateClassPrompt();
    conversation.handleInput('rogue');
    validateAnyAbilityPrompt();
    conversation.handleInput('strength');
    validateAnyAbilityPrompt();
    conversation.handleInput('strength');
    expect(getLastMsg()).toEqual(`Invalid choice.
Abilities:
       strength: 15 + 0 = 15
      dexterity: -- + 2 = --
   constitution: -- + 0 = --
   intelligence: -- + 0 = --
         wisdom: -- + 1 = --
       charisma: -- + 0 = --

Which ability do you want to be 14? dexterity, constitution, intelligence, wisdom, charisma. Choice:`);
  });

  test('restarts abilities if they are rejected', () => {
    const conversation = startConversation([]);
    validateNoCharacterPrompt();
    conversation.handleInput('1');
    validateNamePrompt();
    conversation.handleInput('Newname');
    expect(getLastMsg()).toEqual('Create new character with name Newname? (Y/N)');
    conversation.handleInput('Y');
    validateRacePrompt();
    conversation.handleInput('elf');
    validateClassPrompt();
    conversation.handleInput('rogue');
    validateAnyAbilityPrompt();
    conversation.handleInput('strength');
    validateAnyAbilityPrompt();
    conversation.handleInput('dexterity');
    validateAnyAbilityPrompt();
    conversation.handleInput('constitution');
    validateAnyAbilityPrompt();
    conversation.handleInput('intelligence');
    validateAnyAbilityPrompt();
    conversation.handleInput('wisdom');
    validateAnyAbilityPrompt();
    conversation.handleInput('charisma');
    expect(getLastMsg()).toEqual(`
Abilities:
       strength: 15 + 0 = 15
      dexterity: 14 + 2 = 16
   constitution: 13 + 0 = 13
   intelligence: 12 + 0 = 12
         wisdom: 10 + 1 = 11
       charisma: 8 + 0 = 8

These are the attributes you want? (Y/N)`);
    conversation.handleInput('N');
    expect(getLastMsg()).toEqual(`
Abilities:
       strength: -- + 0 = --
      dexterity: -- + 2 = --
   constitution: -- + 0 = --
   intelligence: -- + 0 = --
         wisdom: -- + 1 = --
       charisma: -- + 0 = --

Which ability do you want to be 15? strength, dexterity, constitution, intelligence, wisdom, charisma. Choice:`);
  });

  test('restarts entire process if character rejected', () => {
    const conversation = startConversation([]);
    validateNoCharacterPrompt();
    conversation.handleInput('1');
    validateNamePrompt();
    conversation.handleInput('Newname');
    expect(getLastMsg()).toEqual('Create new character with name Newname? (Y/N)');
    conversation.handleInput('Y');
    validateRacePrompt();
    conversation.handleInput('elf');
    validateClassPrompt();
    conversation.handleInput('rogue');
    validateAnyAbilityPrompt();
    conversation.handleInput('strength');
    validateAnyAbilityPrompt();
    conversation.handleInput('dexterity');
    validateAnyAbilityPrompt();
    conversation.handleInput('constitution');
    validateAnyAbilityPrompt();
    conversation.handleInput('intelligence');
    validateAnyAbilityPrompt();
    conversation.handleInput('wisdom');
    validateAnyAbilityPrompt();
    conversation.handleInput('charisma');
    conversation.handleInput('Y');
    expect(getLastMsg()).toEqual(`
Name: Newname
Race: Elf
Class: Rogue

Abilities:
       strength: 15 + 0 = 15
      dexterity: 14 + 2 = 16
   constitution: 13 + 0 = 13
   intelligence: 12 + 0 = 12
         wisdom: 10 + 1 = 11
       charisma: 8 + 0 = 8

Create this character? (Y/N)`);
    conversation.handleInput('N');
    validateNoCharacterPrompt();
  });
});
