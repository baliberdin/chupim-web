import {
  CategoryScale, Chart, Legend, LinearScale, LineController, LineElement, PointElement, Tooltip,
} from 'chart.js';
import { qs, qsa, setupStageSearch } from '../lib/ui';

Chart.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Legend, Tooltip);
Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
Chart.defaults.color = '#71717a';

const STORAGE_KEY = 'chupim.metrics.selected';
const REFRESH_MS = 10_000;

interface Metric {
  requests: number;
  errors: number;
  circuit_breaks: number;
  avgTime: number;
}

interface MetricsResponse {
  series: Record<string, Record<string, Metric>>;
}

const charts = new Map<string, { chart: Chart; element: HTMLElement }>();
const container = qs('[data-charts]');
const template = qs<HTMLTemplateElement>('#chart-template');

function selectedKeys(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveSelection(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...charts.keys()]));
  qs('[data-selected-count]').textContent = String(charts.size);
  qs('[data-charts-empty]').hidden = charts.size > 0;
}

function dataset(label: string, color: string, data: number[], yAxisID = 'count') {
  return { label, data, yAxisID, borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 0, tension: 0.3 };
}

function addChart(checkbox: HTMLInputElement): void {
  const key = checkbox.dataset.metric!;
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const element = fragment.firstElementChild as HTMLElement;

  qs('[data-chart-type]', element).textContent = checkbox.dataset.metricType == 'stage' ? 'Stage' : 'API';
  qs('[data-chart-title]', element).textContent = checkbox.dataset.metricLabel ?? key;
  qs('[data-chart-remove]', element).addEventListener('click', () => {
    checkbox.checked = false;
    removeChart(key);
  });
  container.append(element);

  const chart = new Chart(qs<HTMLCanvasElement>('canvas', element), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        dataset('Requests', '#6366f1', []),
        dataset('Errors', '#ef4444', []),
        dataset('Circuit breaks', '#a855f7', []),
        dataset('Avg. time (ms)', '#f59e0b', [], 'time'),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 2 } } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
        count: { position: 'left', beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'per minute' } },
        time: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'ms' } },
      },
    },
  });

  charts.set(key, { chart, element });
  saveSelection();
  refresh(key);
}

function removeChart(key: string): void {
  const entry = charts.get(key);
  if (!entry) return;
  entry.chart.destroy();
  entry.element.remove();
  charts.delete(key);
  saveSelection();
}

async function refresh(key: string): Promise<void> {
  const response = await fetch(`/metrics/api?key=${encodeURIComponent(key)}`);
  if (!response.ok) return;
  const { series } = await response.json() as MetricsResponse;
  const entry = charts.get(key);
  if (!entry) return;

  const times = Object.keys(series).sort();
  const value = (field: keyof Metric) => times.map(t => series[t][key]?.[field] ?? 0);

  entry.chart.data.labels = times.map(t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  entry.chart.data.datasets[0].data = value('requests');
  entry.chart.data.datasets[1].data = value('errors');
  entry.chart.data.datasets[2].data = value('circuit_breaks');
  entry.chart.data.datasets[3].data = value('avgTime').map(v => Number(v.toFixed(2)));
  entry.chart.update();
}

function refreshAll(): void {
  if (document.hidden) return;
  charts.forEach((_, key) => refresh(key));
  qs('[data-updated-at]').textContent = `Updated at ${new Date().toLocaleTimeString()}`;
}

const checkboxes = qsa<HTMLInputElement>('[data-metric]');
const previous = selectedKeys();

for (const checkbox of checkboxes) {
  checkbox.addEventListener('change', () => checkbox.checked ? addChart(checkbox) : removeChart(checkbox.dataset.metric!));

  if (previous.includes(checkbox.dataset.metric!)) {
    checkbox.checked = true;
    addChart(checkbox);
  }
}

saveSelection();
refreshAll();
setInterval(refreshAll, REFRESH_MS);
document.addEventListener('visibilitychange', refreshAll);
setupStageSearch();
