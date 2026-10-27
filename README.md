# Chupim Web
Chupim lets you build an API by composing other APIs and services. You write
small async functions, called **stages**, and arrange them into **pipelines**
that run stages in sequence or in parallel. Each pipeline is published as an
HTTP endpoint, so clients see a single API instead of the many services
behind it.

Chupim Web is the server and web interface for the
[chupim](https://github.com/baliberdin/chupim) library. Built on Express, it
lets you:

- create and edit stages in a code editor, in the browser;
- build pipelines visually by connecting stages in a graph;
- enable, disable and remove endpoints without restarting the server;
- follow requests, errors, circuit breaks and response times per endpoint and per stage.

## Getting started
Chupim Web requires Node.js 22 or later.

```bash
mkdir my-pipelines
cd my-pipelines
npm init -y
npm install chupim-web
```

Create an `index.js` file:

```javascript
const chupim = require('chupim-web');

chupim.start();
```

Start the server with the example pipelines enabled:

```bash
CHUPIM_EXAMPLES=1 node index.js
```

Then open [http://localhost:3000](http://localhost:3000).

## Stages and pipelines in code
Stages and pipelines can also be registered in code, which is the way to keep
them under version control. `chupim-web` exposes the whole chupim API:

```javascript
const chupim = require('chupim-web');

// A stage receives the context, changes it and returns it
chupim.registerStage({
  prefix: 'Greetings',
  name: 'sayHi',
  fn: async (context) => {
    // Request data is available in context._chupim_ (method, query, headers, path, body)
    const name = context._chupim_.query.name || 'world';
    context.message = `Hi, ${name}!`;
    return context;
  }
});

// A pipeline published as GET /api/v1/hi
chupim.registerComponent({
  id: 'v1/hi',
  name: 'Say Hi',
  stages: ['Greetings.sayHi'],
  methods: ['GET'],
  enabled: true
});

chupim.start();
```

```bash
curl "http://localhost:3000/api/v1/hi?name=Ana"
# {"message":"Hi, Ana!"}
```

The context returned by the last stage is the API response. To run stages in
parallel, to protect slow stages with a circuit breaker and for the other
pipeline options, see the [chupim documentation](https://github.com/baliberdin/chupim#readme).

Chupim Web ships its type definitions, so the same code works in TypeScript
with `import * as chupim from 'chupim-web'`.

## Examples
With `CHUPIM_EXAMPLES=1`, Chupim starts with two example pipelines:

- **Hello World** (`/api/v1/helloworld`): the simplest pipeline, two stages in sequence.
- **Weather Dashboard** (`/api/v1/weather?city=Lisbon`): a backend for frontend
  that composes three [Open-Meteo](https://open-meteo.com) APIs, which need no
  API key. It finds the city, fetches the forecast and the air quality in
  parallel, and builds a compact report with some advice. The air quality stage
  has a circuit breaker with a fallback, so the report still works when that
  service is slow or down.

```
readCity → findCity → ┬ fetchForecast   ┬→ buildReport
                      └ fetchAirQuality ┘
```

Open them in the web interface to see and edit their stages.

## Configuration
Chupim Web is configured with environment variables:

| Variable          | Default       | Description |
|-------------------|---------------|-------------|
| `PORT`            | `3000`        | HTTP port. |
| `CHUPIM_ENV`      | `development` | Set it to `production` to make the web interface read-only. |
| `CHUPIM_EXAMPLES` | unset         | Set it to `1` to load the example stages and pipelines. |
| `MAX_LOGS_LINES`  | `10000`       | Maximum number of errors kept in the error log. |

> [!WARNING]
> The stage editor runs the code it receives on the server. Use it only in
> development, on a machine and network you trust. In production, set
> `CHUPIM_ENV=production` and register stages and pipelines in code.

## Development
The Node.js version is pinned in `.tool-versions` (asdf).

The server is in `src/` (TypeScript). The web interface is in `views/` (Pug and
Tailwind CSS) and in `client/` (TypeScript, bundled with esbuild into
`public/build`).

```shell
make install       # install dependencies (npm ci)
make test          # type check and run unit and API tests (Vitest)
make e2e           # build and run end-to-end tests with Playwright
                   # (run npx playwright install chromium once before)
make run           # build and start with the examples on http://localhost:3000
make docker-up     # the same, with Docker Compose
```

## License
[Apache 2.0](LICENSE.txt)
