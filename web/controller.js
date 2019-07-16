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


const chupim = require("chupim");
const errors = require("./errors");

module.exports = {
  createContextFromRequest: function(req) {
    var context = chupim.createContext();
    var query = {};
    Object.assign(query, req.query);
    context._chupim_.method = req.method;
    context._chupim_.query = query;
    context._chupim_.headers = req.headers;
    context._chupim_.path = req.path;
    //context._chupim_.params.debug = true;

    context._chupim_.requestedComponent = chupim.getPipelineComponent(
      req.params["0"]
    );

    if (context._chupim_.method == "POST") {
      context._chupim_.body = req.body;
    }

    return context;
  },

  doRequest: function(req, res, next) {
    let totalTime = new Date();
    let context = this.createContextFromRequest(req);
    if (!context._chupim_.requestedComponent) {
      return errors.notFound(res);
    }

    let componentKey = "/api/" + context._chupim_.requestedComponent.id;
    let component = context._chupim_.requestedComponent;

    if (component) {
      if (!component.enabled) {
        return errors.serviceUnavailable(res);
      }

      if (!component.methods.includes(context._chupim_.method)) {
        return errors.methodNotAllowed(res);
      }
      component
        .fn(context)
        .then(response => {
          if (response) {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.send(response);
          } else {
            return errors.addComponentError(totalTime, res, componentKey, {
              message: "Invalid pipeline result."
            });
          }

          totalTime = new Date() - totalTime;
          chupim.metrics.addMetric(componentKey, totalTime);
        })
        .catch( e => {
          return errors.addComponentError(totalTime, res, componentKey, e);
        });
    } else {
      return errors.notFound(res);
    }
  },

  listResources: function(req, res, next){
    let host = req.headers['host'];
    res.setHeader('Content-Type','application/json');
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    var resources = {
        title:"Chupim Resources",
        resources: [],
        links: {
          self:`http://${host}/api`
        }
    };

    Object.keys(chupim.components).forEach(k => {
      let c = chupim.components[k];
      resources.resources.push({
        name: c.name,
        uri: c.id,
        link:`http://${host}/api/${c.id}`,
        state: c.enabled? 'enabled': 'unavailable'
      });
    });

    res.send(resources);
  }


};
