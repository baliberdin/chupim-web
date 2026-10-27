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



import createError from 'http-errors';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'path';
import logger from 'morgan';
import compression from 'compression';
import * as chupim from 'chupim';
import filter from './web/filter';
import { icon, jsonForScript, prefixColor, viewLocals } from './web/views';
import { registerExamples } from './web/default';
import indexRouter from './routes/index';
import apiRouter from './routes/api';
import errorsRouter from './routes/errors';

var app = express();
app.use(compression());

// view engine setup
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'pug');
app.locals.icon = icon;
app.locals.prefixColor = prefixColor;
app.locals.jsonForScript = jsonForScript;

app.use(logger('tiny'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(viewLocals);
app.use(filter.environment);

app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use('/errors', errorsRouter);

//catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

if(process.env['CHUPIM_ENV'] == undefined || process.env['CHUPIM_ENV'] !== 'production'){
  console.warn("Development Environment! \nSet CHUPIM_ENV=production for production environments.")
  process.env['CHUPIM_ENV'] = 'development';
  app.set('env','development');
}

// error handler
app.use(function(err: any, req: Request, res: Response, next: NextFunction) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  let status = err.status || 500;
  res.status(status);
  if([401,403,404].includes(status)){
    res.render('errors/'+status);
  }else{
    res.render('error');
  }
  
});

chupim.metrics.startDataUpdater();
 
if(process.env['CHUPIM_EXAMPLES'] == '1'){
  console.info("Loading example project: Stages and Pipelines for testing purpose. Set CHUPIM_EXAMPLES=0 to disable.");
  registerExamples();
}

export default app;
