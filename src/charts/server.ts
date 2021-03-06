
var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    fs = require('fs'),
    sys = require('util'),
    exec = require('child_process').exec,
    child;

import * as myTask from "../task"

// declare module "*!text" {
//     const content: string;
//     export default content;
// }
// import indexFile from "./index.html!text";

// If all goes well when you open the browser, load the index.html file
function handler(req, res) {
    fs.readFile(__dirname + '/../../index.html', function (err, data) {
        if (err) {
            // If no error, send an error message 500
            console.log(err);
            res.writeHead(500);
            return res.end('Error loading index.html');
        }
        res.writeHead(200);
        res.end(data);
    });
}
export function startCharting() {
    // Listen on port 8000
    app.listen(8002);
    // When we open the browser establish a connection to socket.io.
    // Every 5 seconds to send the graph a new value.

    io.sockets.on('connection', function (socket) {
        setInterval(function () {
            child = exec("cat /sys/class/thermal/thermal_zone0/temp", function (error, stdout, stderr) {
                if (error !== null) {
                    console.log('exec error: ' + error);
                } else {
                    // Promise.all([myTask.getMovingAverage()]).then(values => {
                    //     // You must send time (X axis) and a temperature value (Y axis)
                    //     var date = new Date().getTime();
                    //     var temp = parseFloat(stdout) / 1000;
                    //     socket.emit('temperatureUpdate', date, temp);
                    //     socket.emit('cpu', date, values[0]);
                    // })
                }
            });
        }, 3000);
    });
}