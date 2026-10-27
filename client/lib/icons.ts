import { CircleCheck, Info, TriangleAlert } from 'lucide-static';

// Icons used by client code. Server templates use the icon() helper instead.
const icons = {
  'circle-check': CircleCheck,
  'info': Info,
  'triangle-alert': TriangleAlert,
};

export function icon(name: keyof typeof icons, className = 'size-4'): string {
  return icons[name]
    .trim()
    .replace(/\s*class="[^"]*"/, '')
    .replace(/\s*width="24"\s*height="24"/, '')
    .replace('<svg', `<svg aria-hidden="true" class="${className}"`);
}
