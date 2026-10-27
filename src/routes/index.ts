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
import type { CircuitBreakerAction, CircuitBreakerConfig, StageDefinition, StageList } from 'chupim';
import { dedent, resourceRows, stageGroups } from '../web/views';

interface StageDraft {
	prefix: string;
	name: string;
	source: string;
	circuitbreaker?: CircuitBreakerConfig;
}

var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	const resources = resourceRows();
	const groups = stageGroups();

	res.render('index', { 
		title: 'Resources',
		resources: resources,
		stageGroups: groups,
		stats: {
			resources: resources.length,
			enabled: resources.filter(r => r.enabled).length,
			stages: groups.reduce((total, g) => total + g.stages.length, 0),
			errors: chupim.errors.errorsLog.length,
		},
	});
});

router.get('/metrics', function(req, res, next) {
	res.render('metrics', { 
		title: 'Metrics',
		resources: resourceRows(),
		stageGroups: stageGroups(),
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
		title: 'New Pipeline',
		stageGroups: stageGroups(),
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
			stageGroups: stageGroups(),
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


const newStageSource = `async (context) => {
  // context carries the pipeline data from stage to stage.
  // Request data is in context._chupim_ (method, query, headers, path, body).
  context.message = "Hello from my stage";
  return context;
}`;

/**
 * Renders the stage editor. The draft holds the values shown on the form,
 * from an existing stage or from a submission that failed.
 */
function renderStageEditor(res: express.Response, draft: StageDraft, options: {editing?: boolean, formError?: string} = {}) {
	const groups = stageGroups();
	const ownKey = options.editing ? `${draft.prefix}.${draft.name}` : undefined;

	res.render('stages/new', {
		title: options.editing ? 'Edit Stage' : 'New Stage',
		editing: options.editing ?? false,
		formError: options.formError,
		draft: draft,
		prefixes: groups.map(g => g.prefix),
		fallbackOptions: groups.flatMap(g => g.stages.map(s => `${g.prefix}.${s}`)).filter(k => k != ownKey),
	});
}

/* Editor for new Stage */
router.get('/stage/new', function(req, res, next) {
	renderStageEditor(res, {prefix: '', name: '', source: newStageSource});
});


/* Create a new Stage from source */
router.post('/stage', function(req, res, next) {
	var body = req.body || {};
	let draft: StageDraft = {
		prefix: body.prefix ?? '',
		name: body.name ?? '',
		source: body.source ?? '',
		circuitbreaker: {
			enabled: body['circuitBreaker.enabled'] == 'true',
			action: Number(body['circuitBreaker.action']) as CircuitBreakerAction,
			fn: body['circuitBreaker.fn'],
			timeout: Number(body['circuitBreaker.timeout']),
		},
	};

	try {
		let stage: StageDefinition = {
			prefix: draft.prefix,
			name: draft.name,
			circuitbreaker: draft.circuitbreaker,
			// WARNING: Evaluation of an user submitted source. Only for development purpose.
			// Direct eval on purpose: stage sources can use require.
			fn: eval(draft.source),
		};

		chupim.registerStage(stage);
	} catch(e) {
		res.status(400);
		return renderStageEditor(res, draft, {editing: body.editing == 'true', formError: (e as Error).message});
	}

	res.redirect("/");
});


/* Edit Stage source code */
router.get('/stage/:prefix/*splat', function(req, res, next) {
	var prefix = req.params.prefix;
	var stageName = req.params.splat.join('/');

	var stage = chupim.getStageByPackage(prefix, stageName);

	if(stage){
		renderStageEditor(res, {
			prefix: stage.prefix,
			name: stage.name,
			source: dedent(stage.source),
			circuitbreaker: stage.circuitbreaker,
		}, {editing: true});
	}else{
    	next(createError(404));
	}
});

export default router;
