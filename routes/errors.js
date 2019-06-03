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

var express = require('express');
var router = express.Router();
const chupim = require('chupim');
//const errors = require('../web/errors');

router.get('/', function(req, res, next) {
  let key = req.query.key;
  let keys = [];
  let logs;

  keys = chupim.errors.loggedKeys();
  // errors.errorsLog.forEach( e => {
  //   if(!keys.includes(e.key)){
  //     keys.push(e.key);
  //   }
  // });
  
  if(key){
    //logs = errors.errorsLog.filter(e => e.key == key);
    logs = chupim.errors.filteredByKey(key);
  }else{
    logs = chupim.errors.errorsLog;
  }

  logs = logs.sort((a,b) => {
    if(a.date < b.date){
      return 1;
    }

    if(a.date > b.date){
      return -1;
    }

    return 0;
  })

  res.render('errorlog', { 
    title: 'Errors',
    logs:logs,
    key:key,
    keys:keys
  });
	
});

router.get('/api', function(req, res, next) {
  let key = req.query.key;
  res.setHeader('Content-Type', 'application/json');
  if(key){
    res.send({errors:chupim.errors.filteredByKey(key)});
  }else{
    res.send({errors:chupim.errors.errorsLog});
  }
	
});

module.exports = router;
