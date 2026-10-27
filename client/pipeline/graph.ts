/**
 * Converts the pipeline graph drawn in the editor into the stage arrangement
 * used by chupim: strings run in serial, a matrix runs its rows in parallel.
 * e.g. Input → A → (B, C) → D → Output  =>  ['p.A', [['p.B'], ['p.C']], 'p.D']
 */

export type StageList = Array<string | StageList[]>;

export interface GraphNode {
  id: string;
  // Stage name (prefix.name). Input and Output have none.
  configName?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface PipelineResult {
  stages: StageList;
  errors: string[];
  // Stages that are not reachable from Input and will be ignored
  unreachable: string[];
}

export function graphToStages(nodes: GraphNode[], edges: GraphEdge[], inputId = 'Input', outputId = 'Output'): PipelineResult {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();

  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue;
    children.set(edge.source, [...(children.get(edge.source) ?? []), edge.target]);
    parents.set(edge.target, [...(parents.get(edge.target) ?? []), edge.source]);
  }

  const errors: string[] = [];
  const visited = new Set<string>();
  const label = (id: string) => byId.get(id)?.configName ?? id;

  // Follows a serial chain from start. Stops at the end of the graph or at a
  // node with more than one parent (where parallel branches join).
  function chain(start: string): { stages: StageList; join?: string } {
    const stages: StageList = [];
    let current: string | undefined = start;

    while (current != undefined) {
      visited.add(current);

      const configName = byId.get(current)?.configName;
      if (configName) stages.push(configName);

      const next: string[] = children.get(current) ?? [];
      if (next.length == 0) return { stages };

      if (next.length == 1) {
        if ((parents.get(next[0]) ?? []).length > 1) return { stages, join: next[0] };
        current = next[0];
        continue;
      }

      // Parallel branches: each one runs until the node where they join
      const branches = next.map(child => (parents.get(child) ?? []).length > 1 ? { stages: [], join: child } : chain(child));
      const parallel = branches.map(b => b.stages).filter(b => b.length > 0);
      if (parallel.length > 0) stages.push(parallel);

      const joins = [...new Set(branches.map(b => b.join).filter(j => j != undefined))];
      if (joins.length > 1) {
        errors.push(`Parallel branches after ${label(current)} must join on the same stage.`);
        return { stages };
      }
      if (branches.some(b => b.join == undefined) && joins.length > 0) {
        errors.push(`Some branches after ${label(current)} do not reach ${label(joins[0])}.`);
        return { stages };
      }

      current = joins[0];
    }

    return { stages };
  }

  if ((children.get(inputId) ?? []).length == 0) {
    errors.push('Connect Input to the first stage.');
    return { stages: [], errors, unreachable: stageIds(nodes) };
  }

  const cycle = findCycle(inputId, children);
  if (cycle) {
    errors.push(`The pipeline has a cycle at ${label(cycle)}.`);
    return { stages: [], errors, unreachable: [] };
  }

  const { stages, join } = chain(inputId);

  if (join != undefined) {
    errors.push(`${label(join)} has more than one incoming connection, but they do not come from parallel branches.`);
  }

  if (errors.length == 0 && !visited.has(outputId)) {
    errors.push('Connect the last stage to Output.');
  }
  if (errors.length == 0 && (children.get(outputId) ?? []).length > 0) {
    errors.push('Output must be the last node.');
  }

  const unreachable = stageIds(nodes).filter(id => !visited.has(id)).map(label);
  return { stages, errors, unreachable };
}

function stageIds(nodes: GraphNode[]): string[] {
  return nodes.filter(n => n.configName).map(n => n.id);
}

// Returns a node where a cycle is found, walking from start
function findCycle(start: string, children: Map<string, string[]>): string | undefined {
  const done = new Set<string>();
  const path = new Set<string>();

  function visit(id: string): string | undefined {
    if (path.has(id)) return id;
    if (done.has(id)) return undefined;
    path.add(id);
    for (const child of children.get(id) ?? []) {
      const found = visit(child);
      if (found) return found;
    }
    path.delete(id);
    done.add(id);
    return undefined;
  }

  return visit(start);
}
