import Tesseract = require("tesseract.js");
import * as itf from "../../common/interfaces.d"
import winston = require("winston")
var exec = require('child_process').exec;

export function Task3(edge_req: itf.i_edge_req) {
    return new Promise(function (resolve, reject) {
        let edge_rsp: itf.i_edge_rsp = {
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
export function stressTask(edge_req: itf.i_edge_req) {
    return new Promise(function (resolve, reject) {
        let edge_rsp: itf.i_edge_rsp = {
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
            } else {
                resolve(edge_rsp);
            }
        });

    });
}
export function visionTask1(message: itf.i_edge_req) {
    return new Promise(function (resolve, reject) {
        var base64Image = message["payload"];
        var decodedImage = new Buffer(base64Image, "base64");
        Tesseract.recognize(decodedImage)
            .then(txtdata => {
                console.log("Recognized Text: ", txtdata.text);
                let edge_rsp: itf.i_edge_rsp = {
                    cmd_id: message["cmd_id"],
                    result: txtdata.text,
                    type: "cldmsg",
                    task_id: message.task_id,
                    ttl: message.ttl - 1,
                    sentTime: message.sentTime
                }
                resolve(edge_rsp);
            })
            .catch(err => {
                console.log("catch: ", err);
                let edge_rsp: itf.i_edge_rsp = {
                    cmd_id: message.cmd_id,
                    result: "Error",
                    type: "cldmsg",
                    task_id: message.task_id,
                    ttl: 0,
                    sentTime: message.sentTime
                }
                reject(edge_rsp);
            })
            .finally(e => {
                //console.log('finally\n');
                //process.exit();
            });
    });
}
export function visionTask1WS(message: itf.i_edge_req, edgews) {
    var base64Image = message["payload"];
    var decodedImage = new Buffer(base64Image, "base64");
    Tesseract.recognize(decodedImage)
        .then(txtdata => {
            console.log("Recognized Text: ", txtdata.text);
            edgews.send(
                JSON.stringify({
                    cmd_id: message["cmd_id"],
                    result: txtdata.text,
                    type: "cldmsg",
                    task_id: message.task_id,
                    ttl: message.ttl - 1,
                    sentTime: message.sentTime
                })
            );
        })
        .catch(err => {
            console.log("catch: ", err);
            edgews.send(
                JSON.stringify({
                    cmd_id: message.cmd_id,
                    result: "Error",
                    type: "cldmsg",
                    task_id: message.task_id,
                    ttl: 0,
                    sentTime: message.sentTime
                })
            );
        })
        .finally(e => {
            //console.log('finally\n');
            //process.exit();
        });

}