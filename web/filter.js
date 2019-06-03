var createError = require('http-errors');

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
  },
  environment: function(req, res, next){
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

module.exports = filter;