# Chupim Web
Chupim is a simple pipeline constructor that allows you to compose an API
from different resources and present them as if they were just one.
Go ahead and create something new using pipelines.


## Start a New Project with Chupim Web
Try it yourself. Chupim is based on ExpressJS
```bash
mkdir my-pipeline
cd my-pipeline

# Here you need to answer some questions about your new project
# If you are new on nodejs just press enter key for each questions
npm init
npm install -s chupim-web
```

Create a new `index.js` file like this
```javascript
// index.js
const chupim = require('chupim-web');
chupim.start();
```

```bash
# Start chupim
node index.js
```

## Access to Server 
[http://localhost:3000](http://localhost:3000)