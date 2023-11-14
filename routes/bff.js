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

var express = require("express");
var router = express.Router();
var createError = require("http-errors");
const chupim = require("chupim");
const controller = require("../web/controller");

/* GET home page. */
router.get("/", async function (req, res, next) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  let stages = {};
  Object.keys(chupim.stages.container).map((k) => {
    stages[k] = Object.keys(chupim.stages.container[k]);
  });

  let components = Object.keys(chupim.components).map((k) => {
    return {
      id: chupim.components[k].id,
      name: chupim.components[k].name,
      enabled: chupim.components[k].enabled,
      metrics: {
        rpm: chupim.metrics.getRPM("/api/" + k),
        responseTime: chupim.metrics.getResponseTime("/api/" + k),
        errorPercent: chupim.metrics.getErrorsPercent("/api/" + k),
      },
    };
  });

  let response = {
    stages: stages,
    entrypoints: components,
  };

  res.send(response);
});

module.exports = router;
