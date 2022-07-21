const colorMarker = '<';
const colorEndMarker = '>';
const colorStart = '\x1b[';
const dark = '0';
const light = '1';

const colors: Record<string, string> = {
  n: '0', // none
  d: '30', // black/dark
  r: '31', // red
  g: '32', // green
  y: '33', // yellow
  b: '34', // blue
  p: '35', // magenta
  c: '36', // cyan
  w: '37', // white
};

export const colorMessage = (input: string): string => {
  let lastIndex: number | undefined = undefined;
  let output = '';
  while (input.indexOf(colorMarker, lastIndex) > -1) {
    const markerIndex = input.indexOf(colorMarker, lastIndex);
    if (Object.keys(colors).includes(input[markerIndex + 1]) && input[markerIndex + 2] === colorEndMarker) {
      output += input.substring(lastIndex ?? 0, markerIndex);
      output += `${colorStart}${dark};${colors[input[markerIndex + 1]] ?? colors['n']}m`;
      lastIndex = markerIndex + 3;
    } else if (Object.keys(colors).includes(input[markerIndex + 1].toLowerCase()) && input[markerIndex + 2] === colorEndMarker) {
      output += input.substring(lastIndex ?? 0, markerIndex);
      output += `${colorStart}${light};${colors[input[markerIndex + 1].toLowerCase()] ?? colors['n']}m`;
      lastIndex = markerIndex + 3;
    } else {
      output += input.substring(lastIndex ?? 0, markerIndex + 1);
      lastIndex = markerIndex + 1;
    }
  }
  output += input.substring(lastIndex ?? 0);
  output = output.replace(/</g, '&lt;');
  output = output.replace(/>/g, '&gt;');
  return output;
};

export const stripColors = (input: string): string => {
  let lastIndex: number | undefined = undefined;
  let output = '';
  while (input.indexOf(colorMarker, lastIndex) > -1) {
    const markerIndex = input.indexOf(colorMarker, lastIndex);
    if (Object.keys(colors).includes(input[markerIndex + 1]) && input[markerIndex + 2] === colorEndMarker) {
      output += input.substring(lastIndex ?? 0, markerIndex);
      lastIndex = markerIndex + 3;
    } else if (Object.keys(colors).includes(input[markerIndex + 1].toLowerCase()) && input[markerIndex + 2] === colorEndMarker) {
      output += input.substring(lastIndex ?? 0, markerIndex);
      lastIndex = markerIndex + 3;
    } else {
      output += input.substring(lastIndex ?? 0, markerIndex + 1);
      lastIndex = markerIndex + 1;
    }
  }
  output += input.substring(lastIndex ?? 0);
  output = output.replace(/</g, '&lt;');
  output = output.replace(/>/g, '&gt;');
  return output;
};
