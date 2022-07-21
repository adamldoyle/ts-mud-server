import * as color from './color';

describe('share/color', () => {
  describe('colorMessage', () => {
    test('returns original string if no color codes', () => {
      expect(color.colorMessage('message without colors')).toEqual('message without colors');
    });

    test('swaps out defined dark color codes with actual color code', () => {
      expect(color.colorMessage('message with <b>color')).toEqual(`message with \x1b[0;34mcolor`);
    });

    test('swaps out defined light color codes with actual color code', () => {
      expect(color.colorMessage('message with <B>color')).toEqual(`message with \x1b[1;34mcolor`);
    });

    test('replaces multiple colors', () => {
      expect(color.colorMessage('<n>message <d>with <R>lots <G>of <y>colors <P>in <c>it<w>')).toEqual(
        '\x1b[0;0mmessage \x1b[0;30mwith \x1b[1;31mlots \x1b[1;32mof \x1b[0;33mcolors \x1b[1;35min \x1b[0;36mit\x1b[0;37m'
      );
    });

    test('replaces chevrons that are not a color code with safe versions', () => {
      expect(color.colorMessage('message with <z> code')).toEqual('message with &lt;z&gt; code');
    });
  });

  describe('stripColors', () => {
    test('returns original string if no color codes', () => {
      expect(color.stripColors('message without colors')).toEqual('message without colors');
    });

    test('strips out defined dark color codes', () => {
      expect(color.stripColors('message with <b>color')).toEqual(`message with color`);
    });

    test('strips out defined light color codes', () => {
      expect(color.stripColors('message with <B>color')).toEqual(`message with color`);
    });

    test('strips out multiple colors', () => {
      expect(color.stripColors('<n>message <d>with <R>lots <G>of <y>colors <P>in <c>it<w>')).toEqual('message with lots of colors in it');
    });

    test('replaces chevrons that are not a color code with safe versions', () => {
      expect(color.stripColors('message with <z> code')).toEqual('message with &lt;z&gt; code');
    });
  });
});
