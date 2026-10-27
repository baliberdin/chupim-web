import { qsa } from '../lib/ui';

// Applies the source filter as soon as it changes
for (const select of qsa<HTMLSelectElement>('[data-autosubmit]')) {
  select.addEventListener('change', () => select.form?.requestSubmit());
}
