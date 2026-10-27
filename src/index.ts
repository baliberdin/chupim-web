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


let ascii =
`
     ________                _              
    / ____/ /_  __  ______  (_)___ ___      
   / /   / __ \\/ / / / __ \\/ / __ \`__ \\ 
  / /___/ / / / /_/ / /_/ / / / / / / /     
  \\____/_/ /_/\\__,_/ .___/_/_/ /_/ /_/    
                  /_/                       

`;

console.log(ascii);

// chupim-web exposes the whole chupim API plus start()
export * from 'chupim';

export function start(): void {
  // Loaded on demand: the app registers routes, metrics and examples on load
  const { listen } = require('./server') as typeof import('./server');
  const app = (require('./app') as typeof import('./app')).default;
  listen();
  console.log(`Chupim started and listening on port[${app.get('port')}]\n`);
}
