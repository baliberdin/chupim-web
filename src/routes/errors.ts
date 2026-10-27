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


import express from 'express';
import * as chupim from 'chupim';

var router = express.Router();

router.get('/', function(req, res, next) {
  let key = req.query.key as string | undefined;
  let keys: string[] = [];
  let logs;

  keys = chupim.errors.loggedKeys();
  
  if(key){
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
  let key = req.query.key as string | undefined;
  res.setHeader('Content-Type', 'application/json');
  if(key){
    res.send({errors:chupim.errors.filteredByKey(key)});
  }else{
    res.send({errors:chupim.errors.errorsLog});
  }
	
});

export default router;
