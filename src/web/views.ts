/*
   Copyright 2019 Allan Mendes Silva Baliberdin

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

*/


import fs from 'fs';
import * as chupim from 'chupim';
import type { NextFunction, Request, Response } from 'express';

const iconsDir = require.resolve('lucide-static/package.json').replace(/package\.json$/, 'icons');
const iconCache = new Map<string, string>();

/**
 * Inline SVG icon from Lucide (https://lucide.dev), for use in templates:
 *   != icon('pencil', 'size-4')
 */
export function icon(name: string, className = 'size-4'): string {
  let svg = iconCache.get(name);
  if(svg == undefined){
    svg = fs.readFileSync(`${iconsDir}/${name}.svg`, 'utf8')
      .replace(/<!--.*?-->\s*/s, '')
      .replace(/\s*class="[^"]*"/, '')
      .replace(/\s*width="24"\s*height="24"/, '')
      .replace('<svg', '<svg aria-hidden="true" class="__class__"')
      .replace(/\s*\n\s*/g, ' ');
    iconCache.set(name, svg);
  }

  return svg.replace('__class__', className);
}

/**
 * Template variables shared by every page.
 */
export function viewLocals(req: Request, res: Response, next: NextFunction): void {
  res.locals.editable = process.env['CHUPIM_ENV'] !== 'production';
  res.locals.currentPath = req.path;
  next();
}

export interface StageGroup {
  prefix: string;
  stages: string[];
}

/**
 * Registered stages grouped by prefix, both sorted by name.
 */
export function stageGroups(): StageGroup[] {
  return Object.keys(chupim.stages.container).sort(byName).map(prefix => ({
    prefix,
    stages: Object.keys(chupim.stages.container[prefix]).sort(byName),
  }));
}

export interface ResourceRow {
  id: string;
  name: string;
  enabled: boolean;
  methods: string[];
  rpm: string;
  responseTime: string;
  errorsPercent: number;
}

/**
 * Registered components with their metrics, sorted by name.
 */
export function resourceRows(): ResourceRow[] {
  return Object.values(chupim.components)
    .map(c => {
      const key = `/api/${c.id}`;
      return {
        id: c.id,
        name: c.name ?? c.id,
        enabled: c.enabled,
        methods: c.methods as string[],
        rpm: chupim.metrics.getRPM(key),
        responseTime: chupim.metrics.getResponseTime(key),
        errorsPercent: Number(chupim.metrics.getErrorsPercent(key)),
      };
    })
    .sort((a, b) => byName(a.name, b.name));
}

function byName(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

const prefixPalette = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#64748b',
];

/**
 * Color for a stage prefix, used to tell prefixes apart in lists and graphs.
 * Assigned in prefix order, so up to ten prefixes never share a color.
 */
export function prefixColor(prefix: string): string {
  const index = Object.keys(chupim.stages.container).sort(byName).indexOf(prefix);
  return prefixPalette[Math.max(index, 0) % prefixPalette.length];
}

/**
 * Removes the indentation shared by all lines but the first, which
 * Function.toString() keeps from where the function was declared.
 */
export function dedent(source: string): string {
  const lines = source.split('\n');
  const indents = lines.slice(1)
    .filter(line => line.trim().length > 0)
    .map(line => line.match(/^[ \t]*/)![0].length);
  const indent = Math.min(...indents);

  if(!isFinite(indent) || indent == 0) return source;

  return [lines[0], ...lines.slice(1).map(line => line.slice(indent))].join('\n');
}

/**
 * JSON safe to embed in a <script type="application/json"> tag.
 */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value ?? null).replace(/</g, '\\u003c');
}
