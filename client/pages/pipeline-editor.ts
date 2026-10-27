import cytoscape, { type Core, type ElementDefinition, type NodeSingular } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import edgehandles from 'cytoscape-edgehandles';
import { graphToStages, type PipelineResult } from '../pipeline/graph';
import { icon } from '../lib/icons';
import { qs, qsa, setFieldError, setupStageSearch, toast } from '../lib/ui';

cytoscape.use(dagre);
cytoscape.use(edgehandles);

const INPUT = 'Input';
const OUTPUT = 'Output';
const BRAND = '#7c3aed';
const editable = document.querySelector('[data-action="save"]') != null;

// Saved graph, in the format produced by chupim's graph.parseElements
interface SavedElements {
  nodes: Array<{ data: { id: string; label: string; type: string; configName?: string } }>;
  edges: Array<{ data: { source: string; target: string } }>;
}

const prefixColors = new Map(qsa('[data-add-stage]').map(b => [b.dataset.prefix!, b.dataset.color!]));
let nodeCounter = 0;
let dirty = false;

function stageNode(id: string, configName: string): ElementDefinition {
  const separator = configName.indexOf('.');
  const prefix = configName.slice(0, separator);
  const label = configName.slice(separator + 1);
  return { group: 'nodes', data: { id, label, prefix, configName, color: prefixColors.get(prefix) ?? '#71717a' } };
}

function terminalNode(id: string): ElementDefinition {
  return { group: 'nodes', data: { id, label: id }, classes: 'terminal' };
}

function initialElements(): { elements: ElementDefinition[]; saved: boolean } {
  const saved = JSON.parse(qs('#pipeline-elements').textContent || 'null') as SavedElements | null;

  if (!saved) {
    return {
      saved: false,
      elements: [
        { ...terminalNode(INPUT), position: { x: 0, y: 0 } },
        { ...terminalNode(OUTPUT), position: { x: 240, y: 0 } },
        { group: 'edges', data: { source: INPUT, target: OUTPUT } },
      ],
    };
  }

  const nodes = saved.nodes.map(n => n.data.configName ? stageNode(n.data.id, n.data.configName) : terminalNode(n.data.id));
  const edges = saved.edges.map(e => ({ group: 'edges' as const, data: { source: e.data.source, target: e.data.target } }));
  return { saved: true, elements: [...nodes, ...edges] };
}

const { elements, saved } = initialElements();

const cy: Core = cytoscape({
  container: qs('#canvas'),
  elements,
  minZoom: 0.3,
  maxZoom: 2.5,
  boxSelectionEnabled: editable,
  autoungrabify: !editable,
  selectionType: 'additive',
  style: [
    {
      selector: 'node',
      style: {
        'shape': 'round-rectangle',
        'label': 'data(label)',
        'width': (node: NodeSingular) => Math.max(72, String(node.data('label')).length * 7.2 + 32),
        'height': 36,
        'background-color': '#ffffff',
        'border-width': 2,
        'color': '#18181b',
        'font-size': 12,
        'font-weight': 500,
        'font-family': getComputedStyle(document.body).fontFamily,
        'text-valign': 'center',
        'text-halign': 'center',
        'underlay-color': BRAND,
        'underlay-padding': 6,
        'underlay-opacity': 0,
        'underlay-shape': 'round-rectangle',
      },
    },
    {
      selector: 'node[color]',
      style: { 'border-color': 'data(color)' },
    },
    {
      selector: 'node.terminal',
      style: { 'background-color': '#27272a', 'border-width': 0, 'color': '#ffffff', 'width': 72 },
    },
    {
      selector: 'node:selected, node.eh-hover, node.eh-source',
      style: { 'border-color': BRAND, 'underlay-opacity': 0.15 },
    },
    {
      selector: 'edge',
      style: {
        'width': 1.5,
        'curve-style': 'taxi',
        'taxi-direction': 'rightward',
        'line-color': '#a1a1aa',
        'target-arrow-color': '#a1a1aa',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.9,
      },
    },
    {
      selector: 'edge:selected',
      style: { 'width': 2.5, 'line-color': BRAND, 'target-arrow-color': BRAND },
    },
    {
      selector: '.eh-preview, .eh-ghost-edge',
      style: { 'line-color': BRAND, 'target-arrow-color': BRAND, 'line-style': 'dashed', 'curve-style': 'bezier' },
    },
    {
      selector: '.eh-ghost-edge.eh-preview-active',
      style: { 'opacity': 0 },
    },
    {
      selector: '.eh-ghost-node',
      style: { 'width': 1, 'height': 1, 'opacity': 0, 'label': '' },
    },
  ],
});

// Exposed for debugging and end-to-end tests
(window as unknown as { cy: Core }).cy = cy;

const MAX_FIT_ZOOM = 1.2;

// Fits the graph, below the toolbar, without zooming small graphs too much
function fit(): void {
  cy.fit(undefined, 72);
  if (cy.zoom() > MAX_FIT_ZOOM) {
    cy.zoom(MAX_FIT_ZOOM);
    cy.center();
  }
}

function layout(animate = true): void {
  const options = { name: 'dagre', rankDir: 'LR', nodeSep: 24, rankSep: 56, animate, animationDuration: 200, fit: false };
  const run = cy.layout(options as cytoscape.LayoutOptions);
  run.one('layoutstop', fit);
  run.run();
}

if (saved) layout(false);
else {
  cy.zoom(1);
  cy.center();
}

if (editable && !saved) cy.getElementById(INPUT).select();

// --- Pipeline validation --------------------------------------------------

function currentPipeline(): PipelineResult {
  const graphEdges = cy.edges().not('.eh-preview, .eh-ghost-edge') as cytoscape.EdgeCollection;
  return graphToStages(
    (cy.nodes().not('.eh-ghost-node') as cytoscape.NodeCollection).map(n => ({ id: n.id(), configName: n.data('configName') })),
    graphEdges.map(e => ({ source: e.source().id(), target: e.target().id() })),
  );
}

const status = qs('[data-status]');

function updateStatus(): PipelineResult {
  const result = currentPipeline();
  const stageCount = cy.nodes().filter(n => n.data('configName')).length;

  if (stageCount == 0) {
    status.innerHTML = `${icon('info', 'mt-0.5 size-4 shrink-0 text-zinc-400')}<span class="text-zinc-600">Add stages from the list on the left.</span>`;
  } else if (result.errors.length > 0) {
    status.innerHTML = `${icon('triangle-alert', 'mt-0.5 size-4 shrink-0 text-amber-500')}<span class="text-zinc-700"></span>`;
    status.querySelector('span')!.textContent = result.errors[0];
  } else if (result.unreachable.length > 0) {
    status.innerHTML = `${icon('triangle-alert', 'mt-0.5 size-4 shrink-0 text-amber-500')}<span class="text-zinc-700"></span>`;
    status.querySelector('span')!.textContent = `Ready, but ${result.unreachable.length} unconnected stage${result.unreachable.length > 1 ? 's' : ''} will be ignored.`;
  } else {
    status.innerHTML = `${icon('circle-check', 'mt-0.5 size-4 shrink-0 text-emerald-500')}<span class="text-zinc-700">Ready to save · ${stageCount} stage${stageCount > 1 ? 's' : ''}</span>`;
  }

  return result;
}

function changed(): void {
  dirty = true;
  updateStatus();
}

updateStatus();

// --- Editing --------------------------------------------------------------

if (editable) {
  const deleteButton = qs<HTMLButtonElement>('[data-action="delete"]');

  function deletable() {
    return cy.$(':selected').filter(e => !(e.isNode() && e.hasClass('terminal')));
  }

  cy.on('select unselect', () => { deleteButton.disabled = deletable().empty(); });

  function hasEdge(a: NodeSingular, b: NodeSingular): boolean {
    return a.edgesWith(b).nonempty();
  }

  // Adds a stage. With a single node selected, it is inserted right after it.
  function addStage(configName: string): void {
    const selected = cy.nodes(':selected');
    const source = selected.length == 1 && selected[0].id() != OUTPUT ? selected[0] : undefined;
    const id = `n${Date.now().toString(36)}${nodeCounter++}`;
    const extent = cy.extent();

    cy.add({
      ...stageNode(id, configName),
      position: source
        ? { x: source.position('x') + 120, y: source.position('y') }
        : { x: (extent.x1 + extent.x2) / 2, y: (extent.y1 + extent.y2) / 2 + (nodeCounter % 5) * 12 },
    });
    const node = cy.getElementById(id);

    if (source) {
      const outgoing = source.outgoers('edge');
      if (outgoing.length == 1) {
        const next = outgoing[0].target();
        outgoing.remove();
        cy.add({ group: 'edges', data: { source: id, target: next.id() } });
      }
      cy.add({ group: 'edges', data: { source: source.id(), target: id } });
      layout();
    }

    cy.$(':selected').unselect();
    node.select();
    changed();
  }

  for (const button of qsa('[data-add-stage]')) {
    button.addEventListener('click', () => addStage(button.dataset.addStage!));
  }

  // Deletes the selection. A removed stage with one input and one output
  // has its neighbors connected, so the chain is kept.
  function deleteSelection(): void {
    const selection = deletable();
    if (selection.empty()) return;

    selection.nodes().forEach(node => {
      const incomers = node.incomers('node');
      const outgoers = node.outgoers('node');
      if (incomers.length == 1 && outgoers.length == 1 && !hasEdge(incomers[0], outgoers[0])) {
        cy.add({ group: 'edges', data: { source: incomers[0].id(), target: outgoers[0].id() } });
      }
    });

    selection.remove();
    deleteButton.disabled = true;
    changed();
  }

  deleteButton.addEventListener('click', deleteSelection);

  document.addEventListener('keydown', e => {
    const target = e.target as HTMLElement;
    const typing = target.matches('input, textarea, select') || target.isContentEditable;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() == 's') {
      e.preventDefault();
      openSaveDialog();
    } else if (!typing && (e.key == 'Delete' || e.key == 'Backspace')) {
      e.preventDefault();
      deleteSelection();
    } else if (!typing && e.key == 'Escape') {
      cy.$(':selected').unselect();
    }
  });

  // Connecting nodes: drag the handle shown on the hovered node to another node
  const eh = cy.edgehandles({
    canConnect: (source, target) =>
      !source.same(target) && target.id() != INPUT && source.id() != OUTPUT && !hasEdge(source, target),
    edgeParams: () => ({}),
    snap: true,
    snapThreshold: 30,
  });

  const handle = qs('[data-edge-handle]');
  let handleNode: NodeSingular | undefined;
  let hideTimer: number | undefined;
  let drawing = false;

  function placeHandle(): void {
    if (drawing) return;
    if (!handleNode || handleNode.removed()) return hideHandle();
    const box = handleNode.renderedBoundingBox({ includeLabels: false, includeUnderlays: false });
    handle.style.left = `${box.x2}px`;
    handle.style.top = `${(box.y1 + box.y2) / 2}px`;
    handle.hidden = false;
  }

  function hideHandle(): void {
    handle.hidden = true;
    handleNode = undefined;
  }

  function hideHandleLater(): void {
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hideHandle, 400);
  }

  cy.on('mouseover', 'node', e => {
    if (drawing || e.target.id() == OUTPUT || e.target.hasClass('eh-ghost-node')) return;
    clearTimeout(hideTimer);
    handleNode = e.target;
    placeHandle();
  });
  cy.on('mouseout', 'node', hideHandleLater);
  cy.on('pan zoom position', placeHandle);
  cy.on('grab', 'node', hideHandle);

  handle.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  handle.addEventListener('mouseleave', hideHandleLater);
  handle.addEventListener('mousedown', e => {
    if (!handleNode) return;
    e.preventDefault();
    drawing = true;
    clearTimeout(hideTimer);
    eh.start(handleNode);
    hideHandle();
  });
  // Capture phase: cytoscape handles mouseup on the canvas before it bubbles
  window.addEventListener('mouseup', () => {
    if (drawing) eh.stop();
  }, true);

  cy.on('ehstop', () => { drawing = false; });
  cy.on('ehcomplete', () => changed());

  // --- Saving -------------------------------------------------------------

  const dialog = qs<HTMLDialogElement>('#save-dialog');
  const form = qs<HTMLFormElement>('#pipeline-form');
  const nameField = qs<HTMLInputElement>('#pipeline-name');
  const pathField = qs<HTMLInputElement>('#pipeline-path');
  const methodsField = qs('#pipeline-methods');

  function openSaveDialog(): void {
    const result = updateStatus();
    if (cy.nodes().filter(n => n.data('configName')).empty()) {
      toast('Add at least one stage before saving.', 'error');
      return;
    }
    if (result.errors.length > 0) {
      toast(result.errors[0], 'error');
      return;
    }

    qs<HTMLInputElement>('input[name="stages"]', form).value = JSON.stringify(result.stages);
    qs<HTMLInputElement>('input[name="elements"]', form).value = JSON.stringify(cy.json().elements ?? {});
    qs('[data-stages-preview]').textContent = JSON.stringify(result.stages, null, 2);
    dialog.showModal();
    nameField.focus();
  }

  qs('[data-action="save"]').addEventListener('click', openSaveDialog);
  qs('[data-action="cancel-save"]').addEventListener('click', () => dialog.close());

  for (const field of [nameField, pathField]) {
    field.addEventListener('input', () => setFieldError(field, false));
  }
  methodsField.addEventListener('change', () => setFieldError(methodsField, false));

  form.addEventListener('submit', e => {
    pathField.value = pathField.value.trim().replace(/^\/+|\/+$/g, '');
    const checks: Array<[HTMLElement, boolean]> = [
      [nameField, nameField.value.trim().length > 0],
      [pathField, /^[\w.~-]+(\/[\w.~-]+)*$/.test(pathField.value)],
      [methodsField, qsa('input[name="methods"]:checked', form).length > 0],
    ];
    for (const [field, valid] of checks) setFieldError(field, !valid);

    const firstInvalid = checks.find(([, valid]) => !valid);
    if (firstInvalid) {
      e.preventDefault();
      (firstInvalid[0].matches('input') ? firstInvalid[0] : qs('input', firstInvalid[0])).focus();
      return;
    }
    dirty = false;
  });

  window.addEventListener('beforeunload', e => {
    if (dirty) e.preventDefault();
  });

  setupStageSearch();
}

qs('[data-action="layout"]').addEventListener('click', () => layout());
qs('[data-action="fit"]').addEventListener('click', fit);
