require('dotenv').config();
export default class Config{
    public static CLOUD_PORT = 9070;
//{ error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
    public static LOGGING_LVL="verbose";
    public static DB_HOST="localhost";
    public static DB_USER="root";
    public static DB_PASS= "s1mpl3";
    public static CLOUD_HOST="localhost";
//# Either host should be 0.0.0.0 or left blank to be accessible from other machine
//#UUID=73760f54-1d5b-493d-b7b7-851836b85133
    public static SERVICES_SUPPORT_COUNT=3;
    public static SERVICE_1="vision";
    public static SERVICE_2= "ml";
    public static SERVICE_3="state estimation";
    public static peerHeartbeatInterval=6000;
    public static pingTimeout=4;
    public static osInterval=3000;
    public static localTopicPublishPeriod=8000;

}