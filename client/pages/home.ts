import { confirmAction, qsa, setupStageSearch, toast } from '../lib/ui';

for (const toggle of qsa<HTMLInputElement>('[data-toggle-resource]')) {
  toggle.addEventListener('change', async () => {
    const enabled = toggle.checked;
    const id = toggle.dataset.toggleResource!;
    toggle.disabled = true;

    try {
      const response = await fetch(`/pipeline/update/${id}?enabled=${enabled}`);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      toast(`/api/${id} ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (e) {
      toggle.checked = !enabled;
      toast(`Could not change /api/${id}: ${(e as Error).message}`, 'error');
    } finally {
      toggle.disabled = false;
    }
  });
}

for (const button of qsa('[data-delete-resource]')) {
  button.addEventListener('click', async () => {
    const id = button.dataset.deleteResource!;
    const confirmed = await confirmAction(`The endpoint /api/${id} will stop responding. This cannot be undone.`, {
      title: `Delete "${button.dataset.name}"?`,
      confirmLabel: 'Delete',
    });

    if (confirmed) {
      window.location.href = `/pipeline/remove/${id}`;
    }
  });
}

setupStageSearch();
