import { describe, test, expect } from 'vitest';
import { graphToStages, type GraphEdge, type GraphNode } from '../client/pipeline/graph';

function graph(spec: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  // "Input>A A>B B>Output": edges between nodes; stage nodes become p.<id>
  const edges = spec.split(/\s+/).map(e => {
    const [source, target] = e.split('>');
    return { source, target };
  });
  const ids = [...new Set(edges.flatMap(e => [e.source, e.target]))];
  const nodes = ids.map(id => ['Input', 'Output'].includes(id) ? { id } : { id, configName: `p.${id}` });
  return { nodes, edges };
}

function stagesOf(spec: string) {
  const { nodes, edges } = graph(spec);
  return graphToStages(nodes, edges);
}

describe('graphToStages', () => {
  test('serial pipeline', () => {
    expect(stagesOf('Input>A A>B B>Output')).toEqual({ stages: ['p.A', 'p.B'], errors: [], unreachable: [] });
  });

  test('parallel branches with one stage each', () => {
    expect(stagesOf('Input>A A>B A>C B>D C>D D>Output').stages).toEqual(['p.A', [['p.B'], ['p.C']], 'p.D']);
  });

  test('parallel branches with many stages keep the stages after the join', () => {
    const result = stagesOf('Input>A A>B B>C A>D D>E C>F E>F F>Output');
    expect(result.errors).toEqual([]);
    expect(result.stages).toEqual(['p.A', [['p.B', 'p.C'], ['p.D', 'p.E']], 'p.F']);
  });

  test('parallel branches straight from Input and into Output', () => {
    expect(stagesOf('Input>A Input>B A>Output B>Output').stages).toEqual([[['p.A'], ['p.B']]]);
  });

  test('nested parallel branches', () => {
    const result = stagesOf('Input>A A>B A>C B>D B>E D>F E>F F>G C>G G>Output');
    expect(result.errors).toEqual([]);
    expect(result.stages).toEqual(['p.A', [['p.B', [['p.D'], ['p.E']], 'p.F'], ['p.C']], 'p.G']);
  });

  test('a branch going straight to the join is ignored', () => {
    expect(stagesOf('Input>A A>B A>C B>C C>Output').stages).toEqual(['p.A', [['p.B']], 'p.C']);
  });

  test('requires Input to be connected', () => {
    const { nodes } = graph('A>Output');
    expect(graphToStages([{ id: 'Input' }, ...nodes], [{ source: 'A', target: 'Output' }]).errors)
      .toEqual(['Connect Input to the first stage.']);
  });

  test('requires the pipeline to reach Output', () => {
    expect(stagesOf('Input>A A>B').errors).toEqual(['Connect the last stage to Output.']);
  });

  test('reports stages not connected to the pipeline', () => {
    const { nodes, edges } = graph('Input>A A>Output');
    const result = graphToStages([...nodes, { id: 'X', configName: 'p.X' }], edges);
    expect(result.errors).toEqual([]);
    expect(result.unreachable).toEqual(['p.X']);
  });

  test('rejects branches joining on different stages', () => {
    expect(stagesOf('Input>A A>B A>C B>D C>E X>D X>E D>Output E>Output').errors[0])
      .toMatch(/must join on the same stage/);
  });

  test('rejects cycles', () => {
    expect(stagesOf('Input>A A>B B>A B>Output').errors[0]).toMatch(/cycle/);
  });
});

test('rejects a join that does not come from parallel branches', () => {
  expect(stagesOf('Input>A A>B X>B B>Output').errors[0]).toMatch(/more than one incoming connection/);
});
