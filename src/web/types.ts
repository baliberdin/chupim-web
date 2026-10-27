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


import type { IncomingHttpHeaders } from 'http';
import type { ChupimMetadata, Component, Context } from 'chupim';

// Request information added by chupim-web to the pipeline context
export interface RequestInfo {
  method: string;
  query: Record<string, unknown>;
  headers: IncomingHttpHeaders;
  path: string;
  requestedComponent?: Component;
  body?: unknown;
}

export interface WebContext extends Context {
  _chupim_: ChupimMetadata & RequestInfo;
}
