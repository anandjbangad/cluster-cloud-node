"use strict";
exports.__esModule = true;
require('dotenv').config();
var Config = /** @class */ (function () {
    function Config() {
    }
    Config.CLOUD_PORT = 9070;
    //{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
    Config.LOGGING_LVL = "verbose";
    Config.DB_HOST = "localhost";
    Config.DB_USER = "root";
    Config.DB_PASS = "s1mpl3";
    Config.CLOUD_HOST = "localhost";
    //# Either host should be 0.0.0.0 or left blank to be accessible from other machine
    //#UUID=73760f54-1d5b-493d-b7b7-851836b85133
    Config.SERVICES_SUPPORT_COUNT = 3;
    Config.SERVICE_1 = "vision";
    Config.SERVICE_2 = "ml";
    Config.SERVICE_3 = "state estimation";
    Config.peerHeartbeatInterval = 6000;
    Config.pingTimeout = 4;
    Config.osInterval = 3000;
    Config.localTopicPublishPeriod = 8000;
    return Config;
}());
exports["default"] = Config;
