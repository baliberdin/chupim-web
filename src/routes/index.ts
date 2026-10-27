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
import createError from 'http-errors';
import * as chupim from 'chupim';
import type { CircuitBreakerAction, StageDefinition, StageList } from 'chupim';

var router = express.Router();

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
	let key = req.query.key as string | undefined;
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
	var body = req.body || {};
	var path: string | undefined = body.path;
	var name: string | undefined = body.name;
	// A single checked method is submitted as a string
	var methods: string[] = [].concat(body.methods ?? []);
	var enabled = (body.enabled == 'true');
	var stages: StageList | undefined, elements: unknown;

	// Missing or invalid fields are handled below by redirecting back to the editor
	try {
		stages = JSON.parse(body.stages);
		elements = JSON.parse(body.elements);
	} catch(e) {}

  if(stages == undefined || path == undefined || name == undefined || elements == undefined){
    res.redirect("/pipeline/new");  
  }else{
    chupim.registerComponent({id:path,name:name,stages:stages, methods:methods, enabled:enabled});
	  res.redirect("/");
  }
});


/* Edit a pipeline */
router.get('/pipeline/edit/*splat', function(req, res, next) {
	var componentName = req.params.splat.join('/');
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

/* Enable or disable a pipeline */
router.get('/pipeline/update/*splat', function(req, res, next) {
	var componentName = req.params.splat.join('/');
	var component = chupim.getPipelineComponent(componentName);
	
	if( component != undefined ){
		if(req.query.enabled == 'true'){
			component.enabled = true;
		}else if(req.query.enabled == 'false'){
			component.enabled = false;
		}

		res.setHeader('Content-Type', 'application/json');
    res.send({status:"success"});
	}else{
		res.status(404).send();
	}
});

/* Remove a pipeline */
router.get('/pipeline/remove/*splat', function(req, res, next) {
	var componentName = req.params.splat.join('/');
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
	var body = req.body || {};
	let stage: StageDefinition = {
		prefix: body.prefix,
		name: body.name,
		circuitbreaker: {
			enabled: body['circuitBreaker.enabled'] == 'true',
			action: Number(body['circuitBreaker.action']) as CircuitBreakerAction,
			fn: body['circuitBreaker.fn'],
			timeout: Number(body['circuitBreaker.timeout']),
		},
		// WARNING: Evaluation of an user submitted source. Only for development purpose.
		// Direct eval on purpose: stage sources can use require.
		fn: eval(body.source),
	};

	chupim.registerStage(stage);

	res.redirect("/");
});


/* Edit Stage source code */
router.get('/stage/:prefix/*splat', function(req, res, next) {
	var prefix = req.params.prefix;
	var stageName = req.params.splat.join('/');

	var stage = chupim.getStageByPackage(prefix, stageName);

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

export default router;
