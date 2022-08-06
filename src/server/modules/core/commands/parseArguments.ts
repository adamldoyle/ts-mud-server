import { Character, matchCharacters } from '@core/entities/character';
import { Item, matchItems } from '@core/entities/item';
import { Exit, DIRECTION_ALIASES } from '@core/entities/room';
import { Instance } from '@server/GameServerInstance';

interface CharacterCheck {
  (invoker: Character, target: Character): boolean;
}

const noselfCheck: CharacterCheck = (invoker: Character, target: Character) => invoker !== target;
const playerCheck: CharacterCheck = (invoker: Character, target: Character) => !target.npc;
const npcCheck: CharacterCheck = (invoker: Character, target: Character) => target.npc;

export const parseArguments = (invoker: Character, params: string[], syntax: string): any[] | undefined => {
  const syntaxPieces = syntax.split(' ');

  const response: any[] = [];

  let paramsPieceIndex = 0;
  let remainingOptional = false;
  for (let syntaxPieceIndex = 0; syntaxPieceIndex < syntaxPieces.length; syntaxPieceIndex++) {
    let syntaxPiece = syntaxPieces[syntaxPieceIndex];
    let paramsPiece = params[paramsPieceIndex];

    const optional = syntaxPiece.startsWith('[') && syntaxPiece.endsWith(']');
    if (optional) {
      syntaxPiece = syntaxPiece.substring(1, syntaxPiece.length - 1);
    }

    if (syntaxPiece === '|') {
      remainingOptional = true;
      continue;
    }

    if (!paramsPiece) {
      if (remainingOptional) {
        return response;
      }
      if (optional) {
        continue;
      }
      return undefined;
    }

    if (syntaxPiece.startsWith('char')) {
      const [charId, charIndex] = paramsPiece.split('.');
      let elements: Character[] = [];
      const checks: CharacterCheck[] = [];
      if (syntaxPiece.includes('zone')) {
        elements = invoker.zone.characters;
      } else {
        elements = invoker.room.characters;
      }
      if (syntaxPiece.includes('noself')) {
        checks.push(noselfCheck);
      }
      if (syntaxPiece.includes('npc')) {
        checks.push(npcCheck);
      } else if (syntaxPiece.includes('player')) {
        checks.push(playerCheck);
      }
      const matches = matchCharacters(
        elements.filter((target) => checks.every((check) => check(invoker, target))),
        charId
      );
      if (matches.length === 0) {
        return undefined;
      }
      const desiredIndex = charIndex ? parseInt(charIndex) - 1 : 0;
      if (desiredIndex >= matches.length) {
        return undefined;
      }
      response.push(matches[desiredIndex]);
      paramsPieceIndex++;
    } else if (syntaxPiece.startsWith('item')) {
      const [itemId, itemIndex] = paramsPiece.split('.');
      let elements: Item[] = [];
      if (syntaxPiece.includes('inv')) {
        elements = invoker.items;
      } else if (syntaxPiece.includes('eq')) {
        elements = Object.values(invoker.equipment).filter((item) => item) as Item[];
      } else if (syntaxPiece.includes('room')) {
        elements = invoker.room.items;
      } else {
        elements = [...invoker.items, ...(Object.values(invoker.equipment).filter((item) => item) as Item[]), ...invoker.room.items];
      }
      const matches = matchItems(elements, itemId);
      if (matches.length === 0) {
        return undefined;
      }
      const desiredIndex = itemIndex ? parseInt(itemIndex) - 1 : 0;
      if (desiredIndex >= matches.length) {
        return undefined;
      }
      response.push(matches[desiredIndex]);
      paramsPieceIndex++;
    } else if (syntaxPiece.startsWith('exit')) {
      let elements: Exit[] = Object.values(invoker.room.exits);
      if (syntaxPiece.includes('visible')) {
        elements = elements.filter((exit) => exit.canView(invoker));
      }
      if (syntaxPiece.includes('passable')) {
        elements = elements.filter((exit) => exit.canPass(invoker));
      }
      if (syntaxPiece.includes('peekable')) {
        elements = elements.filter((exit) => exit.canPeek(invoker));
      }
      if (syntaxPiece.includes('closeable')) {
        elements = elements.filter((exit) => exit.canClose(invoker));
      }
      if (syntaxPiece.includes('openable')) {
        elements = elements.filter((exit) => exit.canOpen(invoker));
      }
      const matches = elements.filter(
        (target) =>
          target.direction.toLowerCase() === paramsPiece.toLowerCase() || target.direction.toLowerCase() === DIRECTION_ALIASES[paramsPiece.toLowerCase()]
      );
      if (matches.length === 0) {
        return undefined;
      }
      response.push(matches[0]);
      paramsPieceIndex++;
    } else if (syntaxPiece.startsWith('zone')) {
      const zone = Instance.gameServer?.catalog.lookupZone(paramsPiece);
      if (!zone) {
        return undefined;
      }
      response.push(zone);
      paramsPieceIndex++;
    } else if (syntaxPiece === 'word') {
      if (!paramsPiece) {
        return undefined;
      }
      response.push(paramsPiece);
      paramsPieceIndex++;
    } else if (syntaxPiece === 'string') {
      response.push(params.slice(paramsPieceIndex).join(' '));
      paramsPieceIndex = params.length;
    } else if (syntaxPiece === paramsPiece) {
      paramsPieceIndex++;
    } else if (!optional) {
      return remainingOptional ? response : undefined;
    }
  }

  return response;
};
