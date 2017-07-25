var rankings = require('./ranking.js');
var Alexa = require("alexa-sdk");
// used to find fighter by comparing names
var stringSimilarity = require('string-similarity');

var APP_ID = 'amzn1.ask.skill.e241512e-76ad-407e-b765-b885d1e058a6';

var HELP_MESSAGE = "Ask about a weight class or fighter and I'll give you the rankings.";
var FIGHTER_ERROR_MESSAGE = "I couldn't recognize the fighter.";
var HELP_REPROMPT = "What weight class?";
var STOP_MESSAGE = "Thank you for your time.";

exports.handler = function (event, context, callback) {
    let alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    // Fix for hardcoded context from simulator
    if (event.context && event.context.System.application.applicationId == 'applicationId') {
        event.context.System.application.applicationId = event.session.application.applicationId;
    }
    alexa.registerHandlers(handlers);
    alexa.execute();
};

let handlers = {
    'GetFighterRank': function () {
        console.log('In fighter');

        let Object = this;
        let intentObj = this.event.request.intent;
        let fighter = intentObj.slots.fighter.value;

        if (this.event.request.dialogState !== 'COMPLETED' && !fighter) {
            console.log('Trying to delegate');
            this.emit(':delegate');
        }
        else {
            // once again make sure that I don't send empty or bad data.
            if (!fighter) {
                let slotToElicit = 'fighter';
                let speechOutput = "That doesn't seem to be a real fighter. Try another.";
                Object.emit(':elicitSlot', slotToElicit, speechOutput, speechOutput);
                let fighter = intentObj.slots.fighter.value;
            }
            rankings.getRankings((cb) => {
                if (fighter) {
                    let weightClass = -1;
                    let fighterRank = -1;
                    let similarity = 0;
                    // we have to skip the pound-for-pound ranking
                    for (let i = 1; i < 12; i++) {
                        for (let j = 0; j < 16; j++) {
                            if (cb[i].fighter[j]) {
                                let test = stringSimilarity.compareTwoStrings(fighter, cb[i].fighter[j]);
                                if (similarity < test) {
                                    similarity = test;
                                    weightClass = i;
                                    fighterRank = j;
                                }
                            }
                        }
                    }

                    console.log(fighter);

                    if (similarity >= .3) {
                        let speechOutput = "";
                        if (fighterRank == 0) {
                            speechOutput = cb[weightClass].fighter[fighterRank] + ' is the current reigning champion in the ' + cb[weightClass].weightClass + ' division';
                        }
                        else {
                            speechOutput = cb[weightClass].fighter[fighterRank] + ' is ranked number ' + fighterRank + ' in the ' + cb[weightClass].weightClass + ' division';
                        }

                        Object.emit(':tell', speechOutput);
                    }
                    else {
                        Object.emit(':tell', FIGHTER_ERROR_MESSAGE);
                    }
                }
            });
        }
    },
    'GetRanking': function () {
        console.log('In ranking');
        let Object = this;
        let intentObj = this.event.request.intent;
        let division = intentObj.slots.weightClass.value;
        let rank = intentObj.slots.rank.value;

        if (this.event.request.dialogState !== 'COMPLETED' && !division) {
            console.log('Trying to delegate');
            this.emit(':delegate');
        }
        else {
            if (division == 'pound for pound' || division == 'Pound-for-Pound') {
                division = 'pound-for-pound';
            }
            if (division) {
                if (!isRealDivision(division)) {
                    let slotToElicit = 'weightClass';
                    let speechOutput = "That doesn't seem to be a real divison. Try another.";
                    Object.emit(':elicitSlot', slotToElicit, speechOutput, speechOutput);
                    let division = intentObj.slots.weightClass.value;
                }
            }
            rankings.getRankings((cb) => {
                if (!rank) {
                    let fighterOrder = "";
                    let champion = "";
                    for (let i = 0; i < 12; i++) {
                        if (stringSimilarity.compareTwoStrings(division, cb[i].weightClass) >= .90) {
                            champion = cb[i].fighter[0];
                            let number = 0;
                            for (let person of cb[i].fighter) {
                                if (person != champion) {
                                    fighterOrder += number + ' ' + person + ',';
                                }
                                number++;
                            }
                        }
                    }

                    let speechOutput = "";
                    if (division == "pound-for-pound") {
                        speechOutput = "In the rankings for best pound for pound fighters, the ranking is as follows: " + fighterOrder;
                    }
                    // this is added because the current female featherweight division is empty
                    else if (champion == "") {
                        speechOutput = "The division seems to currently be empty!";
                    }
                    else {
                        speechOutput = "In the " + division + " division, the champion is " + champion +
                            " and the rest of the division is as follows: " + fighterOrder;
                    }

                    Object.emit(':tell', speechOutput);
                }
                else {
                    let fighterName = "";
                    let speechOutput = "";
                    if (isNaN(rank)) {
                        Object.emit(':tell', "That doesn't seem to be a proper rank!");
                    }
                    if (rank < 0 || rank > 15) {
                        Object.emit(':tell', "There are not that many ranks in the division!");
                    }

                    for (let i = 0; i < 12; i++) {
                        if (stringSimilarity.compareTwoStrings(division, cb[i].weightClass) >= .90) {
                            for (let j = 0; j < 16; j++) {
                                if (rank == j) {
                                    fighterName = cb[i].fighter[j];
                                }
                            }
                        }
                    }

                    if (fighterName == "") {
                        speechOutput = "It doesn't seem like anyone is occupying that rank currently";
                    }
                    else {
                        speechOutput = "The fighter who currently holds the number " + rank + " spot in the " + division + " divsion is " + fighterName;
                    }

                    Object.emit(':tell', speechOutput);
                }
            });
        }
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', STOP_MESSAGE);
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', STOP_MESSAGE);
    },
    'Unhandled': function () {
        console.log('UNHANDLED');
        this.emit(':ask', HELP_MESSAGE, HELP_REPROMPT);
    },
    'AMAZON.HelpIntent': function () {
        console.log('HELP');
        this.emit(':ask', HELP_MESSAGE, HELP_REPROMPT);
    },
    'LaunchRequest': function () {
        console.log('LAUNCH');
        this.emit(':ask', HELP_MESSAGE, HELP_REPROMPT);
    },
};


function isRealDivision(division) {
    if (division == "") {
        return false;
    }

    let divisions = ["pound-for-pound", "flyweight", "bantamweight", "featherweight",
        "lightweight", "welterweight", "middleweight", "light heavyweight",
        "heavyweight", "women's strawweight", "women's bantamweight",
        "women's featherweight"];
    let matching = false;

    for (let part of divisions) {
        if (stringSimilarity.compareTwoStrings(division, part) >= .90) {
            matching = true;
        }
    }

    return matching;
}