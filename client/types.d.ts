declare module 'cytoscape-edgehandles' {
  import type { Ext } from 'cytoscape';
  const extension: Ext;
  export default extension;
}

declare namespace cytoscape {
  interface EdgeHandlesOptions {
    canConnect?: (source: NodeSingular, target: NodeSingular) => boolean;
    edgeParams?: (source: NodeSingular, target: NodeSingular) => ElementDefinition | object;
    hoverDelay?: number;
    snap?: boolean;
    snapThreshold?: number;
    snapFrequency?: number;
    noEdgeEventsInDraw?: boolean;
    disableBrowserGestures?: boolean;
  }

  interface EdgeHandlesInstance {
    start(source: NodeSingular): void;
    stop(): void;
    disable(): void;
    enable(): void;
    destroy(): void;
  }

  interface Core {
    edgehandles(options?: EdgeHandlesOptions): EdgeHandlesInstance;
  }
}
