"use strict";
exports.__esModule = true;
// import { config } from "dotenv";
// config({ path: "./.env" })
var config_1 = require("./config");
require('dotenv').config();
var rbush = require("rbush");
var knn = require("rbush-knn");
var os = require("../../cluster-common/common/utils/os");
var task_1 = require("./task");
var amqp = require("amqplib");
var ms_stats_1 = require("../../cluster-common/common/utils/ms_stats");
var MA = require("moving-average");
var winston = require("winston");
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
    timestamp: true,
    level: process.env.LOGGING_LVL,
    colorize: true
});
var ws_1 = require("ws");
var wss = new ws_1.Server({ port: config_1["default"].CLOUD_PORT });
var mongoose = require("mongoose");
var cloudDB = mongoose.createConnection("mongodb://localhost/cloudDB");
var Schema = mongoose.Schema;
var gpsCoordinate = new Schema({
    lat: Number,
    lon: Number
}, { _id: false });
var nodeListSchema = new Schema({
    uuid: { type: String, index: { unique: true, dropDups: true } },
    sessionID: { type: Number },
    ipAddr: { type: String },
    type: { type: String },
    description: String,
    hostname: String,
    createdOn: { type: Date, "default": Date.now },
    lastUpdate: { type: Date, "default": Date.now },
    isActive: { type: Boolean, "default": true },
    neighboursUUID: [String],
    servicesSupported: [String],
    gps: gpsCoordinate
});
nodeListSchema.methods.print = function () {
    winston.info("Client #" + this.uuid + " updated.");
};
//get model
var NodeList = cloudDB.model("NodeList", nodeListSchema);
//clean db
//NodeList.collection.drop();
// NodeList.remove({}, function () {
//   console.log("Nodelist db cleaned");
// });
var reqCounter = 0;
var rspCounter = 0;
var maNodeJobLatency = MA(5 * 1000); // 5sec
function getRemoteIPInfoOnServer(ws) {
    return {
        remoteIP: ws.upgradeReq.connection.remoteAddress,
        family: ws._socket._peername.family,
        port: ws._socket._peername.port
    };
}
;
var spatialTree = rbush(9, [".lat", ".lon", ".lat", ".lon"]);
var interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false)
            return ws.terminate();
        ws.isAlive = false;
        ws.ping('', false, true);
    });
}, 10000);
ms_stats_1.startMonitoringQueueStats('c_task1_req');
var amqpCloud = {};
amqp.connect('amqp://localhost')
    .then(function (conn) {
    return conn.createChannel();
})
    .then(function (ch) {
    amqpCloud.ch = ch;
    var q = 'c_task1_req';
    ch.assertQueue(q, { durable: false });
    winston.info(" started listening for messages in %s", q);
    ch.consume(q, function (msg) {
        reqCounter++;
        var startTime = Date.now();
        winston.debug("Received %s", msg.content.toString());
        ch.assertQueue(msg.properties.replyTo, { durable: false });
        winston.debug("reply to ", msg.properties.replyTo);
        var message = JSON.parse(msg.content);
        if (message.task_id == 1) {
            task_1.Task3(message)
                .then(function (edge_rsp) {
                ch.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(edge_rsp)), { correlationId: msg.properties.correlationId });
                rspCounter++;
            });
        }
        else if (message.task_id == 2) {
            task_1.visionTask1(message)
                .then(function (edge_rsp) {
                ch.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(edge_rsp)), { correlationId: msg.properties.correlationId });
                rspCounter++;
            });
        }
        else if (message.task_id == 3) {
            task_1.stressTask(message)
                .then(function (edge_rsp) {
                ch.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(edge_rsp)), { correlationId: msg.properties.correlationId });
                rspCounter++;
            });
        }
        maNodeJobLatency.push(Date.now(), Date.now() - startTime);
    }, { noAck: true });
})
    .then(function () {
    //pubsub
    var ex = "os_env_cloud";
    var msg1 = "this is testing in cloud";
    amqpCloud.ch.assertExchange(ex, 'fanout', { durable: false });
    setInterval(function () {
        Promise.all([os.getCPU(), ms_stats_1.getQueueStats("c_task1_req")]).then(function (values) {
            var msg = {
                // cpu: values[0] + (Math.random() * 0.1 - 0.05),
                // freemem: os.getFreeRam() + (Math.random() * 0.1 - 0.05),
                cpu: 1,
                freemem: os.getFreeRam(),
                //msgCount: values[1],
                jobLatency: maNodeJobLatency.movingAverage() || 1,
                activeCtx: reqCounter - rspCounter
            };
            amqpCloud.ch.publish(ex, '', new Buffer(JSON.stringify(msg)));
            winston.verbose("Published topics from Cloud ", msg);
        });
    }, config_1["default"].localTopicPublishPeriod);
})["catch"](function (err) {
    winston.log(err);
});
wss.on("connection", function connection(ws) {
    winston.info("someone trying to connect from " + getRemoteIPInfoOnServer(ws));
    ws.isAlive = true;
    ws.on('pong', function () {
        this.isAlive = true;
    });
    ws.on("message", function incoming(message) {
        //message is JSON object stingified string
        try {
            var data = JSON.parse(message);
        }
        catch (error) {
            winston.error("socket parse error: " + error.data);
        }
        if (typeof data["type"] == "undefined") {
            winston.error("type field is undefined");
            return;
        }
        // NodeList.findOne(
        //   {
        //     uuid: data["uuid"]
        //   },
        //   function (err, doc) {
        //     if (typeof data["sessionID"] != doc.sessionID) {
        //       console.error("type field is undefined");
        //       return;
        //     }
        //   });
        winston.verbose("-->Msg Rcvd:", data["type"]);
        switch (data["type"]) {
            case "init":
                //check for init msg
                if (typeof data["uuid"] != "undefined") {
                    NodeList.findOneAndUpdate({
                        uuid: data["uuid"]
                    }, { $set: { uuid: data["uuid"], sessionID: data["sessionID"], ipAddr: ws.upgradeReq.connection.remoteAddress } }, { upsert: true }, function (err, doc) {
                        if (err)
                            console.error(err);
                        winston.info("Init done. Received uuid is ", data["uuid"]);
                        ws.send(JSON.stringify({
                            type: "initDone"
                        }));
                    });
                }
                break;
            case "services":
                winston.info("Updating Services");
                if (typeof data["uuid"] != "undefined") {
                    NodeList.findOneAndUpdate({
                        uuid: data["uuid"]
                    }, {
                        $addToSet: { servicesSupported: { $each: data["services"] } },
                        $set: { gps: data["gps"] }
                    }, { upsert: false, "new": true }, function (err, doc) {
                        if (err)
                            console.error(err);
                        winston.info(data["gps"]);
                        //spatialTree.insert(data["gps"]);
                        var item = {
                            minX: data["gps"].lat,
                            minY: data["gps"].lon,
                            maxX: data["gps"].lat,
                            maxY: data["gps"].lon,
                            ipAddr: doc.ipAddr
                        };
                        spatialTree.remove(item, function (a, b) {
                            return a.ipAddr === b.ipAddr;
                        });
                        spatialTree.insert({
                            minX: data["gps"].lat,
                            minY: data["gps"].lon,
                            maxX: data["gps"].lat,
                            maxY: data["gps"].lon,
                            ipAddr: doc.ipAddr
                        });
                        winston.verbose("services updated");
                        //wait for 5sec time so that other nodes also register them with cloud
                        setTimeout(function () {
                            ws.send(JSON.stringify({
                                type: "servicesDone",
                                ipAddr: doc.ipAddr
                            }));
                        }, 5000);
                    });
                }
                break;
            case "getNeighbours":
                if (typeof data["uuid"] != "undefined") {
                    NodeList.findOne({
                        uuid: data["uuid"]
                    }, function (err, doc) {
                        if (err)
                            console.error(err);
                        winston.verbose(doc);
                        var neighbors = knn(spatialTree, doc.gps.lat, doc.gps.lat, data["count"], function (item) {
                            return item.ipAddr !== doc.ipAddr;
                        });
                        winston.info(neighbors);
                        ws.send(JSON.stringify({
                            type: "getNeighboursDone",
                            neighbors: neighbors,
                            ipAddr: doc.ipAddr
                        }));
                        winston.info("neighbours updated");
                    });
                }
                //console.log("init" + JSON.stringify(data));
                break;
            case "msg":
                var message_1 = data;
                task_1.Task3(message_1)
                    .then(function (edge_rsp) {
                    ws.send(JSON.stringify(edge_rsp));
                });
                break;
            // case "msg":
            //   //console.log('CLOUD Server: %s', data['clientID']);
            //   let message: itf.i_edge_req = data;
            //   var base64Image = message["payload"];
            //   var decodedImage = new Buffer(base64Image, "base64");
            //   //fs.writeFile('image_decoded.png', decodedImage, function (err) { });
            //   Tesseract.recognize(decodedImage)
            //     .then(txtdata => {
            //       console.log("Recognized Text: ", txtdata.text);
            //       ws.send(
            //         JSON.stringify({
            //           cmd_id: message["cmd_id"],
            //           result: txtdata.text,
            //           type: "cldmsg",
            //           task_id: message.task_id,
            //           ttl: message.ttl - 1
            //         })
            //       );
            //     })
            //     .catch(err => {
            //       console.log("catch: ", err);
            //       ws.send(
            //         JSON.stringify({
            //           cmd_id: message.cmd_id,
            //           result: "Error",
            //           type: "cldmsg",
            //           task_id: message.task_id,
            //           ttl: 0
            //         })
            //       );
            //     })
            //     .finally(e => {
            //       //console.log('finally\n');
            //       //process.exit();
            //     });
            //   break;
            default:
                winston.error("Unknown Msg type received");
        }
    });
});
