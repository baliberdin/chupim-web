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

const chupim = require('chupim');

/*
  DEFAULT CHUPIM STAGES.
  FEEL FREE TO REMOVE OR UPDATE THEM.
*/

chupim.registerStage({
  prefix: 'Chupim',
  name: 'Enable Debug',
  fn: async (c) => {
    c._chupim_.params.debug = true;
    return c;
  }
});

chupim.registerStage({
  prefix: 'Fallback',
  name: 'Return Context',
  fn: async (c) => {
    return c;
  }
});

chupim.registerStage({
  prefix: "HTTP Filters", 
  name: "Get?", 
  fn: async context => {
    if (context._chupim_.method == "GET") return context;
  }
});

chupim.registerStage({
  prefix: "HTTP Filters", 
  name: "Post?", 
  fn: async context => {
    if (context._chupim_.method == "POST") return context;
  }
});

chupim.registerStage({
  prefix: "HTTP Filters", 
  name: "Put?", 
  fn: async context => {
    if (context._chupim_.method == "PUT") return context;
  }
});

chupim.registerStage({
  prefix: "HTTP Filters", 
  name: "Head?", 
  fn: async context => {
    if (context._chupim_.method == "HEAD") return context;
  }
});

chupim.registerStage({
  prefix: "HTTP Filters", 
  name: "Options?", 
  fn: async context => {
    if (context._chupim_.method == "OPTIONS") return context;
  }
});

chupim.registerStage({
  prefix: "HTTP Filters", 
  name: "Delete?", 
  fn: async context => {
    if (context._chupim_.method == "DELETE") return context;
  }
});

chupim.registerComponent({
  id:'v1/something',
  name: 'Something API',
  stages:['HTTP Filters.Get?'],
  enabled: true,
  methods: ['GET','POST']
});