/**
 * Monaco Editor Architecture-Studio Theme Definitions.
 * Light: canvas #F7F4EC, surface #FCFAF5, ink #1B1A16, ink-muted #6B675C, hairline #E3DECF, accent #4A4A2A
 * Dark:  canvas #151510, surface #1D1D16, ink #ECE8DA, ink-muted #A39F90, hairline #2E2D22, accent #C8C49C
 */

export const whylineLightTheme = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: '', foreground: '1B1A16' },
    { token: 'comment', foreground: '6B675C', fontStyle: 'italic' },
    { token: 'keyword', foreground: '4A4A2A', fontStyle: 'bold' },
    { token: 'string', foreground: '9A6B1F' },
    { token: 'number', foreground: '3F6B4A' },
    { token: 'type', foreground: '4A4A2A', fontStyle: 'bold' },
    { token: 'delimiter', foreground: '6B675C' },
    { token: 'identifier', foreground: '1B1A16' },
  ],
  colors: {
    'editor.background': '#FCFAF5',
    'editor.foreground': '#1B1A16',
    'editorLineNumber.foreground': '#6B675C',
    'editorLineNumber.activeForeground': '#1B1A16',
    'editorGutter.background': '#F7F4EC',
    'editor.lineHighlightBackground': '#F1EDE1',
    'editor.lineHighlightBorder': '#E3DECF',
    'editor.selectionBackground': '#E3DECF',
    'editorCursor.foreground': '#4A4A2A',
    'editorWhitespace.foreground': '#E3DECF',
    'editorWidget.background': '#FCFAF5',
    'editorWidget.border': '#E3DECF',
    'editorHoverWidget.background': '#FCFAF5',
    'editorHoverWidget.border': '#E3DECF',
  },
};

export const whylineDarkTheme = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'ECE8DA' },
    { token: 'comment', foreground: 'A39F90', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'C8C49C', fontStyle: 'bold' },
    { token: 'string', foreground: 'DFA94B' },
    { token: 'number', foreground: '6DB37D' },
    { token: 'type', foreground: 'C8C49C', fontStyle: 'bold' },
    { token: 'delimiter', foreground: 'A39F90' },
    { token: 'identifier', foreground: 'ECE8DA' },
  ],
  colors: {
    'editor.background': '#1D1D16',
    'editor.foreground': '#ECE8DA',
    'editorLineNumber.foreground': '#A39F90',
    'editorLineNumber.activeForeground': '#ECE8DA',
    'editorGutter.background': '#151510',
    'editor.lineHighlightBackground': '#25251C',
    'editor.lineHighlightBorder': '#2E2D22',
    'editor.selectionBackground': '#2E2D22',
    'editorCursor.foreground': '#C8C49C',
    'editorWhitespace.foreground': '#2E2D22',
    'editorWidget.background': '#1D1D16',
    'editorWidget.border': '#2E2D22',
    'editorHoverWidget.background': '#1D1D16',
    'editorHoverWidget.border': '#2E2D22',
  },
};

export function defineMonacoThemes(monaco) {
  if (!monaco || !monaco.editor) return;
  monaco.editor.defineTheme('whyline-cream-light', whylineLightTheme);
  monaco.editor.defineTheme('whyline-cream-dark', whylineDarkTheme);
}
