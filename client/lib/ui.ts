/**
 * Small UI helpers shared by the pages.
 * The markup they rely on lives in views/includes/dialogs.pug.
 */

export function qs<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  return element;
}

export function qsa<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

type ToastKind = 'success' | 'error' | 'info';

const toastStyles: Record<ToastKind, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-zinc-200 bg-white text-zinc-800',
};

export function toast(message: string, kind: ToastKind = 'info', timeout = 4000): void {
  const container = qs('#toasts');
  const element = document.createElement('div');
  element.setAttribute('role', kind == 'error' ? 'alert' : 'status');
  element.className = `pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg transition-all duration-300 starting:translate-y-2 starting:opacity-0 ${toastStyles[kind]}`;
  element.textContent = message;
  container.append(element);

  setTimeout(() => {
    element.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => element.remove(), 300);
  }, timeout);
}

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
}

/**
 * Asks for confirmation with the shared dialog. Resolves true when confirmed.
 */
export function confirmAction(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  const dialog = qs<HTMLDialogElement>('#confirm-dialog');
  qs('#confirm-dialog-title').textContent = options.title ?? 'Are you sure?';
  qs('#confirm-dialog-message').textContent = message;
  qs('#confirm-dialog-confirm').textContent = options.confirmLabel ?? 'Confirm';

  dialog.returnValue = '';
  dialog.showModal();

  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue == 'confirm'), { once: true });
  });
}

/**
 * Filters a stage list as the user types. Expects the data attributes used in
 * the stage lists: data-stage-search, data-stage-group, data-stage-item, data-stage-empty.
 */
export function setupStageSearch(root: ParentNode = document): void {
  const input = root.querySelector<HTMLInputElement>('[data-stage-search]');
  if (!input) return;

  input.addEventListener('input', () => {
    const term = input.value.trim().toLowerCase();
    let visible = 0;

    for (const group of qsa('[data-stage-group]', root)) {
      let groupVisible = 0;
      for (const item of qsa('[data-stage-item]', group)) {
        const match = (item.dataset.search ?? '').includes(term);
        item.hidden = !match;
        if (match) groupVisible++;
      }
      group.hidden = groupVisible == 0;
      visible += groupVisible;
    }

    root.querySelector<HTMLElement>('[data-stage-empty]')?.classList.toggle('hidden', visible > 0);
  });
}

/**
 * Marks a form field as invalid and shows its message ([data-error-for=id]).
 */
export function setFieldError(field: HTMLElement, invalid: boolean): void {
  field.setAttribute('aria-invalid', String(invalid));
  document.querySelector(`[data-error-for="${field.id}"]`)?.classList.toggle('block', invalid);
}
