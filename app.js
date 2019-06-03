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
var express = require('express');
var path = require('path');
var fs = require('fs');
var logger = require('morgan');
var compression = require('compression');
var filter = require('./web/filter');

const chupim = require('chupim');

var app = express();
app.use(compression());

var indexRouter = require('./routes/index');
var apiRouter = require('./routes/api');
var errorsRouter = require('./routes/errors');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('tiny'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
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
app.use(function(err, req, res, next) {
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
if(process.env['CHUPIM_EXAMPLES'] == 1){
  console.info("Loading example project: Stages and Pipelines for testing purpose. Set CHUPIM_EXAMPLES=0 to disable.");
  require('./web/default');
}

module.exports = app;
