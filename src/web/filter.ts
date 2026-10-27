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
import type { NextFunction, Request, Response } from 'express';

const filter = {
  developmentPaths: {
    GET:[
      "/pipeline/new",
      "/pipeline/update",
      "/pipeline/remove",
      "/stage/new"
    ],
    POST: [
      "/pipeline",
      "/stage",
    ]
  } as Record<string, string[]>,

  environment: function(req: Request, res: Response, next: NextFunction): void {
    if(process.env['CHUPIM_ENV'] !== 'production' || req.path.startsWith("/api") ){
      next();
      return
    }

    if(filter.developmentPaths[req.method]){
      for(let i=0; i<filter.developmentPaths[req.method].length;i++){
        let path = filter.developmentPaths[req.method][i];
        
        if(req.path.trim().startsWith(path)){
          console.warn('Production Environment does not allow editions!');
          next(createError(403, "The URI requested is not allowed on production environment."));
          return;
        }
      }
    }

    next();
  }
}

export default filter;
