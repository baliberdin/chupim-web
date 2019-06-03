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

var createError = require('http-errors');
const chupim = require('chupim');

module.exports = {

  unloggedErrors: [
    createError.Unauthorized, 
    createError.NotFound,
    createError.MethodNotAllowed,
    createError.Forbidden
  ],

  addComponentError: function(totalTime, res, key, error) {
    if(!this.unloggedErrors.includes(error.constructor)){ 
      chupim.errors.addError(key,error);
      chupim.metrics.addError(key);
    }

    totalTime = new Date() - totalTime;
    chupim.metrics.addMetric(key, totalTime);

    if(error.status){
      res.status(error.status).send(error);  
    }else{
      res.status(500).send();
    }
  },

  notFound: (res) => {
    let error = createError(404,"Resource not found.");
    res.status(error.statusCode).send(error);
  },

  methodNotAllowed: (res) => {
    let error = createError(405,"Method not allowed.");
    res.status(error.statusCode).send(error);
  },

  serviceUnavailable: (res) => {
    let error = createError(503,"Service is unavailable.");
    res.status(error.statusCode).send(error);
  }
}