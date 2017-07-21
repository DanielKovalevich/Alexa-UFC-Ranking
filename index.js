var rankings = require('./ranking.js');
var Alexa = require("alexa-sdk");

var APP_ID = 'e241512e-76ad-407e-b765-b885d1e058a6';

exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

rankings.getRankings((cb) => {
    console.log(cb);
});