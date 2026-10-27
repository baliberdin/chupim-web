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

interface ErrorView {
  key: string;
  date: Date;
  error: {
    name?: string;
    message?: string;
    status?: number;
    stack?: string;
  };
}

/**
 * Error log entries ready to render or to send as JSON. Error instances
 * have no enumerable properties, so their fields are copied explicitly.
 */
function errorViews(key?: string): ErrorView[] {
  let logs = key ? chupim.errors.filteredByKey(key) : chupim.errors.errorsLog;

  return logs.map(entry => {
    const e = (entry.error ?? {}) as Record<string, any>;
    return {
      key: entry.key,
      date: entry.date,
      error: {
        name: e.name,
        message: e.message ?? (typeof entry.error == 'string' ? entry.error : undefined),
        status: e.status ?? e.statusCode,
        stack: e.stack,
      },
    };
  });
}

router.get('/', function(req, res, next) {
  let key = req.query.key as string | undefined;

  // Newest first. Sorts a copy: the error log itself must stay ordered from oldest to newest
  let logs = errorViews(key).sort((a, b) => b.date.getTime() - a.date.getTime());

  res.render('errorlog', { 
    title: 'Errors',
    logs:logs,
    key:key,
    keys:chupim.errors.loggedKeys().sort()
  });
});

router.get('/api', function(req, res, next) {
  let key = req.query.key as string | undefined;
  res.setHeader('Content-Type', 'application/json');
  res.send({errors:errorViews(key)});
});

export default router;
