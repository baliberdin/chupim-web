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
import controller from '../web/controller';

var router = express.Router();

router.get('/', function(req, res, next) {
    controller.listResources(req, res, next);
});

/* Execute pipeline */
router.get('/*splat', function(req, res, next) {
	return controller.doRequest(req,res,next);
});

router.post('/*splat', function(req, res, next) {
	return controller.doRequest(req,res,next);
});

router.put('/*splat', function(req, res, next) {
	return controller.doRequest(req,res,next);
});

router.head('/*splat', function(req, res, next) {
	return controller.doRequest(req,res,next);
});

router.delete('/*splat', function(req, res, next) {
	return controller.doRequest(req,res,next);
});

router.options('/*splat', function(req, res, next) {
	return controller.doRequest(req,res,next);
});



export default router;
