/**
 * Monaco Editor Architecture-Studio Theme Definitions.
 * Light: canvas #FDFBD4, surface #FFFEF0, ink #2A2919, ink-muted #545333, hairline #D9D7B6, accent #545333
 * Dark:  canvas #1C1C12, surface #25251A, ink #FDFBD4, ink-muted #D9D7B6, hairline #3A3A2A, accent #D9D7B6
 */

export const whylineLightTheme = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: '', foreground: '2A2919' },
    { token: 'comment', foreground: '545333', fontStyle: 'italic' },
    { token: 'keyword', foreground: '545333', fontStyle: 'bold' },
    { token: 'string', foreground: '8F5A08' },
    { token: 'number', foreground: '545333' },
    { token: 'type', foreground: '545333', fontStyle: 'bold' },
    { token: 'delimiter', foreground: '545333' },
    { token: 'identifier', foreground: '2A2919' },
  ],
  colors: {
    'editor.background': '#FFFEF0',
    'editor.foreground': '#2A2919',
    'editorLineNumber.foreground': '#545333',
    'editorLineNumber.activeForeground': '#2A2919',
    'editorGutter.background': '#FDFBD4',
    'editor.lineHighlightBackground': '#ECEAD0',
    'editor.lineHighlightBorder': '#D9D7B6',
    'editor.selectionBackground': '#D9D7B6',
    'editorCursor.foreground': '#545333',
    'editorWhitespace.foreground': '#D9D7B6',
    'editorWidget.background': '#FFFEF0',
    'editorWidget.border': '#D9D7B6',
    'editorHoverWidget.background': '#FFFEF0',
    'editorHoverWidget.border': '#D9D7B6',
  },
};

export const whylineDarkTheme = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'FDFBD4' },
    { token: 'comment', foreground: 'D9D7B6', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'D9D7B6', fontStyle: 'bold' },
    { token: 'string', foreground: 'D9A520' },
    { token: 'number', foreground: 'D9D7B6' },
    { token: 'type', foreground: 'D9D7B6', fontStyle: 'bold' },
    { token: 'delimiter', foreground: 'D9D7B6' },
    { token: 'identifier', foreground: 'FDFBD4' },
  ],
  colors: {
    'editor.background': '#25251A',
    'editor.foreground': '#FDFBD4',
    'editorLineNumber.foreground': '#D9D7B6',
    'editorLineNumber.activeForeground': '#FDFBD4',
    'editorGutter.background': '#1C1C12',
    'editor.lineHighlightBackground': '#343324',
    'editor.lineHighlightBorder': '#3A3A2A',
    'editor.selectionBackground': '#3A3A2A',
    'editorCursor.foreground': '#D9D7B6',
    'editorWhitespace.foreground': '#3A3A2A',
    'editorWidget.background': '#25251A',
    'editorWidget.border': '#3A3A2A',
    'editorHoverWidget.background': '#25251A',
    'editorHoverWidget.border': '#3A3A2A',
  },
};

export function defineMonacoThemes(monaco) {
  if (!monaco || !monaco.editor) return;
  monaco.editor.defineTheme('whyline-cream-light', whylineLightTheme);
  monaco.editor.defineTheme('whyline-cream-dark', whylineDarkTheme);
}
