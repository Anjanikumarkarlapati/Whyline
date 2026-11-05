/**
 * Keyboard 3D-press effect for buttons.
 * Adds `data-pressing` on Enter/Space keydown, removes on keyup/blur.
 * CSS `.btn[data-pressing]` mirrors the :active sink style.
 */
export function useKbPress(onClick) {
  return {
    onKeyDown(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.currentTarget.setAttribute('data-pressing', '');
        onClick?.(e);
      }
    },
    onKeyUp(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.currentTarget.removeAttribute('data-pressing');
      }
    },
    onBlur(e) {
      e.currentTarget.removeAttribute('data-pressing');
    },
  };
}
