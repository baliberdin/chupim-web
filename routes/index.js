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
var createError = require('http-errors');
const chupim = require('chupim');

var updateableKeys = ['enabled'];

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { 
  		title: 'Chupim - Pipeline Composer',
		chupim:chupim
	});
});

router.get('/metrics', function(req, res, next) {
	res.render('metrics', { 
		title: 'Chupim - Pipeline Composer',
	  chupim:chupim
  });
});

router.get('/metrics/api', function(req, res, next) {
	let key = req.query.key;
	res.setHeader('Content-Type', 'application/json');
	res.send(chupim.metrics.getData(key));
});


/* Editor for new Pipeline */
router.get('/pipeline/new', function(req, res, next) {
	res.render('pipeline/new', { 
		title: 'Create New Pipeline',
        chupim:chupim
	});
});


/* Create new chupim entry for a pipeline */
router.post('/pipeline', function(req, res, next) {
	var stages = eval(req.body.stages);
	var path = req.body.path;
  var elements = JSON.parse(req.body.elements);
	var name = req.body.name;
	var methods = req.body.methods;
	var enabled = (req.body.enabled == 'true');

  if(stages == undefined || path == undefined || name == undefined || elements == undefined){
    res.redirect("/pipeline/new");  
  }else{
    chupim.registerComponent({id:path,name:name,stages:stages, elements:elements, methods:methods, enabled:enabled});
	  res.redirect("/");
  }
});


/* Edit a pipeline */
router.get('/pipeline/edit/*', function(req, res, next) {
	var componentName = req.params['0'];
	var component = chupim.getPipelineComponent(componentName);
	
	if( component != undefined ){
		res.render('pipeline/new', { 
			title: 'Edit Pipeline',
			component:component,
			chupim:chupim
		});
	}else{
		res.status(404).send();
	}
});

/* Edit a pipeline */
router.get('/pipeline/update/*', function(req, res, next) {
	var componentName = req.params['0'];
	var component = chupim.getPipelineComponent(componentName);
	
	if( component != undefined ){
		Object.keys(req.query).forEach( k => {
			if(updateableKeys.includes(k)){
				if(k == 'enabled' && req.query[k] == 'true'){
					component[k] = true;
					//console.log(`Component key[${k}] updated to: ${req.query[k]}`);
				}else if(k == 'enabled' && req.query[k] == 'false'){
					component[k] = false;
					//console.log(`Component key[${k}] updated to: ${req.query[k]}`);
				}
			}
		});

		res.setHeader('Content-Type', 'application/json');
    res.send({status:"success"});
	}else{
		res.status(404).send();
	}
});

/* Edit a pipeline */
router.get('/pipeline/remove/*', function(req, res, next) {
	var componentName = req.params['0'];
	chupim.removePipelineComponent(componentName);
	res.redirect("/");
});


/* Editor for new Stage */
router.get('/stage/new', function(req, res, next) {
	res.render('stages/new', { 
		title: 'Create New Stage',
        chupim:chupim
	});
});


/* Create a new Stage from source */
router.post('/stage', function(req, res, next) {
	let stage = {};
	stage.circuitbreaker = {};
	stage.circuitbreaker.enabled = req.body['circuitBreaker.enabled'];
	stage.circuitbreaker.action = req.body['circuitBreaker.action'];
	stage.circuitbreaker.fn = req.body['circuitBreaker.fn'];
	stage.circuitbreaker.timeout = req.body['circuitBreaker.timeout'];
	stage.name = req.body.name;
	stage.prefix = req.body.prefix;

	if(stage.circuitbreaker.enabled == 'true')stage.circuitbreaker.enabled = true;

	// WARNING: Evaluation of an user submitted source. Only for development purpose.
	stage.fn = eval(req.body.source);
	chupim.registerStage(stage);

	res.redirect("/");
});


/* Edit Stage source code */
router.get('/stage/:prefix/*', function(req, res, next) {
	var prefix = req.params.prefix;
	var stageName = req.params['0'];
	var stageFullName = `${prefix}.${stageName}`;

	var stage = chupim.getStage(stageFullName);

	if(stage){
		res.render('stages/new', { 
			title: 'Edit Stage',
			prefix: prefix,
			stage: stage,
			chupim: chupim
		});
	}else{
    	next(createError(404));
	}
});

module.exports = router;
