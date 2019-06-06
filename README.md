# Chupim Web

Chupim is a simple pipeline constructor that allows you to compose an API
from different resources and present them as if they were just one.
Go ahead and create something new using pipelines.

- [Quick Start](#quick-start)
  - [Access to Server](#access-to-server)
- [Creating Stages](#creating-stages)
  - [Programmatically](#programmatically)
  - [Runtime Stages](#runtime-stages)
  - [Stage Functions](#stage-functions)

## Quick Start

Try it yourself. Chupim is based on ExpressJS

```bash
mkdir my-pipeline
cd my-pipeline

# Here you will need to answer some questions about your new project
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
# Enable examples (stages and pipeline)
export CHUPIM_EXAMPLES=1
# Start chupim
node index.js
```

## Access to Server

[http://localhost:3000](http://localhost:3000)

![home_exemple](/images/home_example.png)

---

## Creating Stages

You can create stages on Chupim through two different ways.

- Programmatically
- On The Fly (Runtime only, not persistent)

### Programmatically

Stages are Javascript Objects that must be structured like this:

```javascript
let myStage = {
  prefix: 'myPackage', // Just for organization and prevent name collisions
  name: 'My First Stage',
  fn: async (c) => {  // Function to execute. See the details about this functions on the section [Stage Functions]
    console.log('Hello World!');
    return c;
  }
  // There are another optional properties that can be setted. These are the minimal structure. Optional properties are discussed on the appropriate sections.
};
```

And we must tell to Chupim to register that:

```javascript
chupim.registerStage(myStage);
```

After that, your stage will be available to be used on any pipeline.

### Runtime Stages

We are assuming that you are with your Chupim Server started up like at [Quick Start](#quick-start) section. Follow this steps to create a new Stage:

1. Click on **File** menu then **New Stage** to goes to Stage Code Editor
![new_stage](/images/new_stage.png)

2. Write your code then click on **File** menu, **Save**. (For more information about how to code stage functions goes to: [Stage Functions](#stage-functions))

3. Here you will need to give a Prefix and a Name to your Stage.
![stage_save](/images/stage_save.png)

# Stage Functions

Each stage must be a single javascript Async Function and must contain only one parameter, called here as context.

```javascript
 // x as context parameter
async (x) => {
  // TODO: Stage code here
  return x;
}
```

Context parameter is such a Object that carry all data through pipeline stages. This object has no fixed structure, then you can put almost anything on it. Just keep in mind some rules:

 - Context must be lightweight, because it is the API response.
 - Avoid to use data from context provided by previous stages. It makes the stages tight coupled
 - But if your stage need some data from the context, remember to put it on context at previous stage.
 - You can also return a promise, since at the end, even concluding the promise or not, you must either return the context or throw an exception

```javascript
 // Stage returning a Promise
 // x as context parameter
async (x) => {
  return new Promise( (resolve, reject) => {
    /* Promise code here */
    resolve(x);
  }).then(r => {
    /* then code here */
    return x;
  }).catch(e => {
    /* handle error or */
    throw new Error(e);
  });
}
```
