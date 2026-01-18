/**
 * Tests for deprecation utility
 */

const {
  warnDeprecation,
  _resetDeprecationWarnings
} = require('../lib/utils/deprecation');

describe('deprecation utility', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    _resetDeprecationWarnings();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('warnDeprecation', () => {
    it('should emit warning with correct format', () => {
      warnDeprecation('testFunc', 'testFuncAsync');
      expect(warnSpy).toHaveBeenCalledWith(
        'DEPRECATED: testFunc() is synchronous and blocks the event loop. ' +
        'Use testFuncAsync() instead. Will be removed in v3.0.0.'
      );
    });

    it('should only warn once per function', () => {
      warnDeprecation('testFunc', 'testFuncAsync');
      warnDeprecation('testFunc', 'testFuncAsync');
      warnDeprecation('testFunc', 'testFuncAsync');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('should track different functions separately', () => {
      warnDeprecation('funcA', 'funcAAsync');
      warnDeprecation('funcB', 'funcBAsync');
      expect(warnSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('_resetDeprecationWarnings', () => {
    it('should allow warnings to fire again after reset', () => {
      warnDeprecation('testFunc', 'testFuncAsync');
      expect(warnSpy).toHaveBeenCalledTimes(1);

      _resetDeprecationWarnings();
      warnSpy.mockClear();

      warnDeprecation('testFunc', 'testFuncAsync');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('should reset all tracked functions', () => {
      warnDeprecation('funcA', 'funcAAsync');
      warnDeprecation('funcB', 'funcBAsync');
      expect(warnSpy).toHaveBeenCalledTimes(2);

      _resetDeprecationWarnings();
      warnSpy.mockClear();

      warnDeprecation('funcA', 'funcAAsync');
      warnDeprecation('funcB', 'funcBAsync');
      expect(warnSpy).toHaveBeenCalledTimes(2);
    });
  });
});
