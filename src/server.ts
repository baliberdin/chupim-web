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


import http from 'http';
import createDebug from 'debug';
import app from './app';

var debug = createDebug('search-pipeline:server');

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val: string): number | string | false {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Creates the HTTP server and listen on the port from environment.
 */
export function listen(): http.Server {
  var port = normalizePort(process.env.PORT || '3000');
  app.set('port', port);

  var server = http.createServer(app);

  /**
   * Event listener for HTTP server "error" event.
   */
  function onError(error: NodeJS.ErrnoException) {
    if (error.syscall !== 'listen') {
      throw error;
    }

    var bind = typeof port === 'string'
      ? 'Pipe ' + port
      : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
  }

  /**
   * Event listener for HTTP server "listening" event.
   */
  function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr?.port;
    debug('Listening on ' + bind);
  }

  server.listen(port);
  server.on('error', onError);
  server.on('listening', onListening);

  return server;
}
