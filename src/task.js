"use strict";
exports.__esModule = true;
var Tesseract = require("tesseract.js");
var exec = require('child_process').exec;
function Task3(edge_req) {
    return new Promise(function (resolve, reject) {
        var edge_rsp = {
            cmd_id: edge_req.cmd_id,
            result: edge_req.payload + " C",
            type: "cldmsg",
            task_id: edge_req.task_id,
            ttl: edge_req.ttl - 1,
            sentTime: edge_req.sentTime
        };
        resolve(edge_rsp);
    });
}
exports.Task3 = Task3;
function stressTask(edge_req) {
    return new Promise(function (resolve, reject) {
        var edge_rsp = {
            cmd_id: edge_req.cmd_id,
            result: edge_req.payload + " sC",
            type: "cldmsg",
            task_id: edge_req.task_id,
            ttl: edge_req.ttl - 1,
            sentTime: edge_req.sentTime
        };
        exec("stress-ng --cpu 1 --cpu-ops 90", function (error, stdout, stderr) {
            if (error !== null) {
                console.log('exec error: ' + error);
            }
            else {
                resolve(edge_rsp);
            }
        });
    });
}
exports.stressTask = stressTask;
function visionTask1(message) {
    return new Promise(function (resolve, reject) {
        var base64Image = message["payload"];
        var decodedImage = new Buffer(base64Image, "base64");
        Tesseract.recognize(decodedImage)
            .then(function (txtdata) {
            console.log("Recognized Text: ", txtdata.text);
            var edge_rsp = {
                cmd_id: message["cmd_id"],
                result: txtdata.text,
                type: "cldmsg",
                task_id: message.task_id,
                ttl: message.ttl - 1,
                sentTime: message.sentTime
            };
            resolve(edge_rsp);
        })["catch"](function (err) {
            console.log("catch: ", err);
            var edge_rsp = {
                cmd_id: message.cmd_id,
                result: "Error",
                type: "cldmsg",
                task_id: message.task_id,
                ttl: 0,
                sentTime: message.sentTime
            };
            reject(edge_rsp);
        })["finally"](function (e) {
            //console.log('finally\n');
            //process.exit();
        });
    });
}
exports.visionTask1 = visionTask1;
function visionTask1WS(message, edgews) {
    var base64Image = message["payload"];
    var decodedImage = new Buffer(base64Image, "base64");
    Tesseract.recognize(decodedImage)
        .then(function (txtdata) {
        console.log("Recognized Text: ", txtdata.text);
        edgews.send(JSON.stringify({
            cmd_id: message["cmd_id"],
            result: txtdata.text,
            type: "cldmsg",
            task_id: message.task_id,
            ttl: message.ttl - 1,
            sentTime: message.sentTime
        }));
    })["catch"](function (err) {
        console.log("catch: ", err);
        edgews.send(JSON.stringify({
            cmd_id: message.cmd_id,
            result: "Error",
            type: "cldmsg",
            task_id: message.task_id,
            ttl: 0,
            sentTime: message.sentTime
        }));
    })["finally"](function (e) {
        //console.log('finally\n');
        //process.exit();
    });
}
exports.visionTask1WS = visionTask1WS;
