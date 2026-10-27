# Chupim Web
Chupim is a simple pipeline constructor that allows you to compose an API
from different resources and present them as if they were just one.
Go ahead and create something new using pipelines.


## Start a New Project with Chupim Web
Try it yourself. Chupim is based on ExpressJS
```bash
mkdir my-pipeline
cd my-pipeline

# Here you will need to answer some questions about your new project
# If you are new on nodejs just press enter key for each questions
npm init
npm install -s chupim-web
```

Create a new `index.js` file like this (or `index.ts`: chupim-web ships its type definitions)
```javascript
// index.js
const chupim = require('chupim-web');
chupim.start();
```

```bash
# Enable examples (stages and pipeline)
export CHUPIM_EXAMPLES=1
# Start chupim
node index.js
```

## Access to Server 
[http://localhost:3000](http://localhost:3000)

[Complete Documentation](https://baliberdin.github.io/chupim-web/)

## Development
Node version is pinned in `.tool-versions` (asdf). While chupim 0.2.0 is not
published on npm, the [chupim](https://github.com/baliberdin/chupim) repository
must be cloned and built next to this one (`../chupim`).

```shell
make install       # npm ci
make test          # typecheck + vitest
make run           # build and start with the examples on http://localhost:3000
make docker-up     # same, with Docker Compose
```
