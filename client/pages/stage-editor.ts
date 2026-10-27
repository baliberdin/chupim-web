import { basicSetup, EditorView } from 'codemirror';
import { keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { qs, qsa, setFieldError } from '../lib/ui';

const form = qs<HTMLFormElement>('#stage-form');
const textarea = qs<HTMLTextAreaElement>('#stage-source');
const prefix = qs<HTMLInputElement>('#stage-prefix');
const name = qs<HTMLInputElement>('#stage-name');
const cbEnabled = qs<HTMLInputElement>('#cb-enabled');
const cbTimeout = qs<HTMLInputElement>('#cb-timeout');
const cbFallback = qs<HTMLSelectElement>('#cb-fallback');
const readOnly = textarea.readOnly;
let dirty = false;

// Code editor, replacing the plain textarea (kept as the submitted field)
const editor = new EditorView({
  parent: qs('[data-editor]'),
  state: EditorState.create({
    doc: textarea.value,
    extensions: [
      basicSetup,
      javascript(),
      oneDark,
      EditorState.readOnly.of(readOnly),
      keymap.of([{ key: 'Mod-s', preventDefault: true, run: () => { form.requestSubmit(); return true; } }]),
      EditorView.updateListener.of(update => { if (update.docChanged) dirty = true; }),
      EditorView.theme({ '&': { height: '100%', fontSize: '14px' }, '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } }),
    ],
  }),
});
textarea.hidden = true;
editor.focus();

// Ctrl/Cmd+S also works outside the code editor
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() == 's') {
    e.preventDefault();
    if (!readOnly) form.requestSubmit();
  }
});

// Full name preview: prefix.name
function updateFullName(): void {
  const full = prefix.value || name.value ? `${prefix.value}.${name.value}` : 'prefix.name';
  for (const element of qsa('[data-full-name]')) element.textContent = full;
}
prefix.addEventListener('input', updateFullName);
name.addEventListener('input', updateFullName);

// Circuit breaker options are only relevant when it is enabled
function selectedAction(): string {
  return form.querySelector<HTMLInputElement>('input[name="circuitBreaker.action"]:checked')?.value ?? '0';
}

function updateCircuitBreaker(): void {
  qs('[data-cb-options]').hidden = !cbEnabled.checked;
  qs('[data-cb-fallback]').hidden = selectedAction() != '1';
}
cbEnabled.addEventListener('change', updateCircuitBreaker);
for (const radio of qsa<HTMLInputElement>('input[name="circuitBreaker.action"]')) {
  radio.addEventListener('change', updateCircuitBreaker);
}

for (const field of [prefix, name, cbTimeout, cbFallback]) {
  field.addEventListener('input', () => { dirty = true; setFieldError(field, false); });
}

function validate(): boolean {
  const source = editor.state.doc.toString();
  const checks: Array<[HTMLElement, boolean]> = [
    [prefix, prefix.value.trim().length > 0],
    [name, name.value.trim().length > 0],
    [cbTimeout, !cbEnabled.checked || Number(cbTimeout.value) > 0],
    [cbFallback, !cbEnabled.checked || selectedAction() != '1' || cbFallback.value != ''],
    [textarea, /^\s*(\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*async\b/.test(source)],
  ];

  for (const [field, valid] of checks) setFieldError(field, !valid);
  qs('[data-editor]').setAttribute('aria-invalid', String(!checks[4][1]));

  const firstInvalid = checks.find(([, valid]) => !valid)?.[0];
  if (firstInvalid == textarea) editor.focus();
  else firstInvalid?.focus();

  return !firstInvalid;
}

form.addEventListener('submit', e => {
  textarea.value = editor.state.doc.toString();
  if (!validate()) {
    e.preventDefault();
    return;
  }
  dirty = false;
});

window.addEventListener('beforeunload', e => {
  if (dirty && !readOnly) e.preventDefault();
});
