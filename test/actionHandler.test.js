const { MongoMemoryServer } = require('mongodb-memory-server');

const participants = require('../src/apiControllers/participantApiController');
const experiments = require('../src/apiControllers/experimentApiController');
const idMaps = require('../src/apiControllers/idMapApiController');

const mongo = require('mongoose');

const { assert, expect } = require('chai');
const ConfigReader = require('../src/configReader');
const DevConfig = ConfigReader.getDevConfig();
const config = ConfigReader.getExpConfig();

const bot = {
    telegram : {
        sendMessage : () => { return; },
        getChat : (id) => { return { first_name : "John" }},
        sendChatAction: () => { return; },
        token: "testToken"
    }
}

const ActionHandler = require('../src/actionHandler');

const testPartId = "123";
const testChatId = "324235";

describe('DB Connection', () => {

    describe('Connecting to DB', () => {
        it('Should connect to memory server', async () => {
            let mongoServer = await MongoMemoryServer.create()
            try {
                await mongo.connect(mongoServer.getUri(), {dbName: "verifyMASTER"});
                console.log('\tConnection successful!');
            } catch (err) {
                console.log(err);
            }

            const result = mongo.connection.readyState;
            expect(result).to.equal(1);
        });
        it('Should add and update participant parameter', async () => {

            await participants.add(testPartId);
            await participants.initializeParticipant(testPartId, config, bot.telegram.token)
            let participant = await participants.get(testPartId);
            expect(participant).to.not.be.null;
            expect(participant.uniqueId).to.equal(testPartId);
            expect(participant.parameters.language).to.equal("English");
            assert("parameterTypes" in participant);

        });
        it('Should add and update experiment', async () => {

            await experiments.add(config.experimentId);
            await experiments.initializeExperiment(config.experimentId, config.experimentName, config.experimentConditions, config.relConditionSizes);

            let experiment = await experiments.get(config.experimentId);
            expect(experiment).to.not.be.null;
            expect(experiment.experimentId).to.equal(config.experimentId);

        });
        it('Should add and update id map', async () => {

            await idMaps.addIDMapping(config.experimentId, testChatId, testPartId);

            let idMap = await idMaps.getExperiment(config.experimentId);
            expect(idMap).to.not.be.null;
            assert(idMaps.hasUniqueId(idMap.IDMappings, testPartId));
        });

    })
})

describe('Validate action object', () => {
    it('Should fail when action type not valid', () => {
        let actionObj = {
            "aType" : "testAction",
            "args" : ["1", "2"]
        }
        let ret = ActionHandler.validateActionObject(actionObj);
        expect(ret.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail when action type undefined', () => {
        let actionObj = {
            "args" : ["1", "2"]
        }
        let ret = ActionHandler.validateActionObject(actionObj);
        expect(ret.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail when args not array', () => {
        let actionObj = {
            "aType" : "testAction",
            "args" : "test"
        }
        let ret = ActionHandler.validateActionObject(actionObj);
        expect(ret.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail when number of args doesnt match atype', () => {
        let actionObj = {
            "aType" : "setBooleanVar",
            "args" : ["1"]
        }
        let ret = ActionHandler.validateActionObject(actionObj);
        expect(ret.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail when args are empty (-1)', () => {
        let actionObj = {
            "aType" : "clearVars",
            "args" : []
        }
        let ret = ActionHandler.validateActionObject(actionObj);
        expect(ret.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail when one arg is undefined', () => {
        let actionObj = {
            "aType" : "setBooleanVar",
            "args" : ["1", undefined]
        }
        let ret = ActionHandler.validateActionObject(actionObj);
        expect(ret.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should succeed when all is correct', () => {
        let actionObj = {
            "aType" : "setBooleanVar",
            "args" : ["1", "2"]
        }
        let ret = ActionHandler.validateActionObject(actionObj);
        expect(ret.returnCode).to.equal(DevConfig.SUCCESS_CODE);
    })
    it('Should succeed when at least one arg present for (-1)', () => {
        let actionObj = {
            "aType" : "clearVars",
            "args" : ["1", "2"]
        }
        let ret = ActionHandler.validateActionObject(actionObj);
        expect(ret.returnCode).to.equal(DevConfig.SUCCESS_CODE);
    })
})

describe('Processing actions', ()=>{
    describe('Fails', () => {
        let returnObj;
        let outString = "23";
        let expectedOut = 23;

        it('Should fail when participant not received', async () => {
            let actionObj = {
                aType : "saveAnswerTo",
                args : [234]
            }
            returnObj = await ActionHandler.processAction(bot, config, undefined, actionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when participant not in answerReceived state', async () => {
            let actionObj = {
                aType : "saveAnswerTo",
                args : ["timezone"]
            }
            let participant = await participants.get(testPartId);
            returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when action object not valid', async () => {
            let actionObj = {
                aType : "saveAnswerTooth",
                args : ["timezone2"]
            }
            let participant = await participants.get(testPartId);
            participant.currentAnswer = ["Europe/Berlin"];
            participant.currentState = "answerReceived";
            returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })

    })
    describe('AddValueTo', ()=>{
        describe('Add to undefined', () => {
            let returnObj;
            let actionObj = {
                aType : "addValueTo",
                args : ["testNum", "$N{3}"]
            }
            let outString = 3;
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.equal(outString)
            })
            it('Should have added the number to participant parameter', async ()=>{
                let participant = await participants.get(testPartId);
                expect(typeof participant.parameters[actionObj.args[0]]).to.equal("number");
                expect(participant.parameters[actionObj.args[0]]).to.equal(3);
            })
        })
        describe('Add to pre-existing value', () => {
            let returnObj;
            let actionObj = {
                aType : "addValueTo",
                args : ["testNum", "$N{5}"]
            }
            let outString = 8;
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                expect(participant.parameters.testNum).to.equal(3);
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.equal(outString)
            })
            it('Should have added the number to participant parameter', async ()=>{
                let participant = await participants.get(testPartId);
                expect(typeof participant.parameters[actionObj.args[0]]).to.equal("number");
                expect(participant.parameters[actionObj.args[0]]).to.equal(outString);
            })
        })
        describe('Fails', () => {
            let returnObj;

            it('Should fail when variable name not string', async () => {
                let actionObj = {
                    aType : "addValueTo",
                    args : [234, "$N{23}"]
                }
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);
            })
            it('Should fail when new value not string', async () => {
                let actionObj = {
                    aType : "addValueTo",
                    args : ["testNum", 23]
                }
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);
            })
            it('Should fail when variable not recognized', async () => {
                let actionObj = {
                    aType : "addValueTo",
                    args : ["testNumbs", "$N{34}"]
                }
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);
            })
            it('Should fail when cannot save to variable type', async () => {
                let actionObj = {
                    aType : "addValueTo",
                    args : ["testBool", "$N{12}"]
                }
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);
            })
            it('Should fail when number token is invalid', async () => {
                let actionObj = {
                    aType : "addValueTo",
                    args : ["testNum", "$N{12three}"]
                }
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);
            })
            it('Should fail when trying to save to reserved variable', async () => {
                let actionObj = {
                    aType : "addValueTo",
                    args : ["STAGE_DAY", "$N{1}"]
                }
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);
            })

        })
    })
    describe('SaveAnswerTo', ()=>{
        describe('String answer', () => {
            let returnObj;
            let actionObj = {
                aType : "saveAnswerTo",
                args : ["timezone"]
            }
            let outString = "Europe/Berlin";
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentAnswer = [outString];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.equal("Europe/Berlin")
            })
            it('Should have saved the parameter as string in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(!Array.isArray(participant.parameters[actionObj.args[0]]));
                expect(typeof participant.parameters[actionObj.args[0]]).to.equal("string");
                expect(participant.parameters[actionObj.args[0]]).to.equal(outString);
            })
        })
        describe('String array', () => {
            let returnObj;
            let actionObj = {
                aType : "saveAnswerTo",
                args : ["testStrArr"]
            }
            let outString = ["1", "2", "3"];
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentAnswer = outString;
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.eql(outString)
            })
            it('Should have saved the parameter as string array in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(Array.isArray(participant.parameters[actionObj.args[0]]));
                expect(participant.parameters[actionObj.args[0]]).to.eql(outString);
            })
        })
        describe('Number answer', () => {
            let returnObj;
            let actionObj = {
                aType : "saveAnswerTo",
                args : ["testNum"]
            }
            let outString = "23";
            let expectedOut = 23;
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentAnswer = [outString];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.equal(expectedOut)
            })
            it('Should have saved the parameter as number in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(!Array.isArray(participant.parameters[actionObj.args[0]]));
                expect(typeof participant.parameters[actionObj.args[0]]).to.equal("number");
                expect(participant.parameters[actionObj.args[0]]).to.equal(expectedOut);
            })
            it('Should fail when answer is not num', async () => {
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["hello"];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            })
        })
        describe('Fails', () => {
            let returnObj;
            let outString = "23";
            let expectedOut = 23;

            it('Should fail when variable name not string', async () => {
                let actionObj = {
                    aType : "saveAnswerTo",
                    args : [234]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["hello"];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            })
            it('Should fail when current answer missing', async () => {
                let actionObj = {
                    aType : "saveAnswerTo",
                    args : ["timezone"]
                }
                let participant = await participants.get(testPartId);
                delete participant.currentAnswer;
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            })
            it('Should fail when variable not recognized', async () => {
                let actionObj = {
                    aType : "saveAnswerTo",
                    args : ["timezone2"]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["Europe/Berlin"];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            })
            it('Should fail when cannot save to variable type', async () => {
                let actionObj = {
                    aType : "saveAnswerTo",
                    args : ["testNumArr"]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["Europe/Berlin"];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            })
            it('Should fail when trying to save to reserved variable', async () => {
                let actionObj = {
                    aType : "saveAnswerTo",
                    args : ["STAGE_DAY"]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["4"];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);
            })

        })
    })
    describe('SaveOptionIdxTo', ()=>{
        describe('Number answer - single choice', () => {
            let returnObj;
            let actionObj = {
                aType : "saveOptionIdxTo",
                args : ["testNum"]
            }
            let question = {
                "qType" : "singleChoice",
                "options" : ["a", "b", "c"]
            }
            let outString = "b";
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentAnswer = [outString];
                participant.currentState = "answerReceived";
                participant.currentQuestion = question;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.equal(question.options.indexOf(outString))
            })
            it('Should have saved the parameter as number in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(!Array.isArray(participant.parameters[actionObj.args[0]]));
                expect(typeof participant.parameters[actionObj.args[0]]).to.equal("number");
                expect(participant.parameters[actionObj.args[0]]).to.equal(question.options.indexOf(outString));
            })
        })
        describe('Number array answer - multi choice', () => {
            let returnObj;
            let actionObj = {
                aType : "saveOptionIdxTo",
                args : ["testNumArr"]
            }
            let question = {
                "qType" : "multiChoice",
                "options" : ["a", "b", "c"]
            }
            let outString = ["b","c"];
            let expectedAns = []
            outString.forEach(el => {
                expectedAns.push(question.options.indexOf(el));
            })
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentAnswer = outString;
                participant.currentState = "answerReceived";
                participant.currentQuestion = question;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.eql(expectedAns)
            })
            it('Should have saved the parameter as number array in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(Array.isArray(participant.parameters[actionObj.args[0]]));
                expect(typeof participant.parameters[actionObj.args[0]][0]).to.equal("number");
                expect(participant.parameters[actionObj.args[0]]).to.eql(expectedAns);
            })
        })
        describe('Number answer - multi choice', () => {
            let returnObj;
            let actionObj = {
                aType : "saveOptionIdxTo",
                args : ["testNum"]
            }
            let question = {
                "qType" : "multiChoice",
                "options" : ["a", "b", "c"]
            }
            let outString = ["b","c"];

            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentAnswer = outString;
                participant.currentState = "answerReceived";
                participant.currentQuestion = question;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.equal(question.options.indexOf(outString[0]))
            })
            it('Should have saved the parameter as string in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(!Array.isArray(participant.parameters[actionObj.args[0]]));
                expect(typeof participant.parameters[actionObj.args[0]]).to.equal("number");
                expect(participant.parameters[actionObj.args[0]]).to.equal(question.options.indexOf(outString[0]));
            })
        })
        describe('Number array answer - single choice', () => {
            let returnObj;
            let actionObj = {
                aType : "saveOptionIdxTo",
                args : ["testNumArr"]
            }
            let question = {
                "qType" : "singleChoice",
                "options" : ["a", "b", "c"]
            }
            let outString = ["b"];
            let expectedAns = []
            outString.forEach(el => {
                expectedAns.push(question.options.indexOf(el));
            })
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentAnswer = outString;
                participant.currentState = "answerReceived";
                participant.currentQuestion = question;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.eql(expectedAns)
            })
            it('Should have saved the parameter as string in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(Array.isArray(participant.parameters[actionObj.args[0]]));
                expect(typeof participant.parameters[actionObj.args[0]][0]).to.equal("number");
                expect(participant.parameters[actionObj.args[0]]).to.eql(expectedAns);
            })
        })
        describe('Fails', () => {
            let returnObj;
            let outString = "23";
            let expectedOut = 23;

            it('Should fail when variable name not string', async () => {
                let actionObj = {
                    aType : "",
                    args : [234]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["hello"];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            })
            it('Should fail when current question not choice question', async () => {
                let actionObj = {
                    aType : "saveOptionIdxTo",
                    args : ["testNumArr"]
                }
                let question = {
                    "qType" : "freeform",
                    "options" : ["a", "b", "c"]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["b"];
                participant.currentState = "answerReceived";
                participant.currentQuestion = question;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);
            })
            it('Should fail when current question doesnt have options', async () => {
                let actionObj = {
                    aType : "saveOptionIdxTo",
                    args : ["testNumArr"]
                }
                let question = {
                    "qType" : "singleChoice"
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["b"];
                participant.currentState = "answerReceived";
                participant.currentQuestion = question;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);
            })
            it('Should fail when current answer missing', async () => {
                let actionObj = {
                    aType : "saveOptionIdxTo",
                    args : ["timezone"]
                }
                let question = {
                    "qType" : "singleChoice",
                    "options" : ["a", "b", "c"]
                }
                let participant = await participants.get(testPartId);
                delete participant.currentAnswer;
                participant.currentState = "answerReceived";
                participant.currentQuestion = question;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);

            })
            it('Should fail when variable not recognized', async () => {
                let actionObj = {
                    aType : "saveOptionIdxTo",
                    args : ["timezone2"]
                }
                let question = {
                    "qType" : "singleChoice",
                    "options" : ["a", "b", "c"]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["Europe/Berlin"];
                participant.currentState = "answerReceived";
                participant.currentQuestion = question;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);

            })
            it('Should fail when cannot save to variable type', async () => {
                let actionObj = {
                    aType : "saveOptionIdxTo",
                    args : ["testStr"]
                }
                let question = {
                    "qType" : "singleChoice",
                    "options" : ["a", "b", "c"]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["Europe/Berlin"];
                participant.currentState = "answerReceived";
                participant.currentQuestion = question;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);

            })
            it('Should fail when trying to save to reserved variable', async () => {
                let actionObj = {
                    aType : "saveOptionIdxTo",
                    args : ["STAGE_DAY"]
                }
                let question = {
                    "qType" : "singleChoice",
                    "options" : ["a", "b", "c"]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["4"];
                participant.currentState = "answerReceived";
                participant.currentQuestion = question;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);
            })

        })
    })
    describe('SetBooleanVar', ()=>{
        describe('Set to true', () => {
            let returnObj;
            let actionObj = {
                aType : "setBooleanVar",
                args : ["testBool", "$B{true}"]
            }
            let outString = true;
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                participant.parameters.testBool = false;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.equal(outString)
            })
            it('Should have saved the parameter as string in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                expect(typeof participant.parameters[actionObj.args[0]]).to.equal("boolean");
                expect(participant.parameters[actionObj.args[0]]).to.equal(outString);
            })
        })
        describe('Set to false', () => {
            let returnObj;
            let actionObj = {
                aType : "setBooleanVar",
                args : ["testBool", "$B{false}"]
            }
            let outString = false;
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                participant.parameters.testBool = true;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.equal(outString)
            })
            it('Should have saved the parameter as string in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                expect(typeof participant.parameters[actionObj.args[0]]).to.equal("boolean");
                expect(participant.parameters[actionObj.args[0]]).to.equal(outString);
            })
        })
        describe('Fails', () => {
            let returnObj;
            let outString = "23";
            let expectedOut = 23;

            it('Should fail when variable name not string', async () => {
                let actionObj = {
                    aType : "setBooleanVar",
                    args : [234, "$B{true}"]
                }
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);
            })
            it('Should fail when new value not string', async () => {
                let actionObj = {
                    aType : "setBooleanVar",
                    args : ["testBool", true]
                }
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);
            })
            it('Should fail when variable not recognized', async () => {
                let actionObj = {
                    aType : "setBooleanVar",
                    args : ["testBoolbs", "$B{true}"]
                }
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);
            })
            it('Should fail when cannot save to variable type', async () => {
                let actionObj = {
                    aType : "setBooleanVar",
                    args : ["testNum", "$B{true}"]
                }
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);
            })
            it('Should fail when trying to save to reserved variable', async () => {
                let actionObj = {
                    aType : "setBooleanVar",
                    args : ["STAGE_DAY", "$B{true}"]
                }
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);
            })

        })
    })

    describe('AddAnswerTo', ()=>{
        describe('String answer', () => {
            let returnObj;
            let actionObj = {
                aType : "addAnswerTo",
                args : ["testStrArr"]
            }
            let outString = "ans1";
            it('Should return success', async () => {
                await participants.updateParameter(testPartId, "testStrArr", [])
                let participant = await participants.get(testPartId);
                participant.currentAnswer = [outString];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.eql([outString])
            })
            it('Should have saved the parameter as string in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(Array.isArray(participant.parameters[actionObj.args[0]]));
                expect(participant.parameters[actionObj.args[0]].length).to.equal(1);
                expect(participant.parameters[actionObj.args[0]]).to.eql([outString]);
            })
        })
        describe('String answer - 2', () => {
            let returnObj;
            let actionObj = {
                aType : "addAnswerTo",
                args : ["testStrArr"]
            }
            let outString = "ans2";
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentAnswer = [outString];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.eql(["ans1", outString])
            })
            it('Should have saved the parameter as string in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(Array.isArray(participant.parameters[actionObj.args[0]]));
                expect(participant.parameters[actionObj.args[0]].length).to.equal(2);
                expect(participant.parameters[actionObj.args[0]]).to.eql(["ans1", outString]);
            })
        })
        describe('String array answer', () => {
            let returnObj;
            let actionObj = {
                aType : "addAnswerTo",
                args : ["testStrArr"]
            }
            let outString = ["ans3", "ans4"];
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentAnswer = outString;
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.eql(["ans1", "ans2"].concat(outString))
            })
            it('Should have saved the parameter as string in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(Array.isArray(participant.parameters[actionObj.args[0]]));
                expect(participant.parameters[actionObj.args[0]].length).to.equal(4);
                expect(participant.parameters[actionObj.args[0]]).to.eql(["ans1", "ans2"].concat(outString));
            })
        })
        describe('Number answer', () => {
            let returnObj;
            let actionObj = {
                aType : "addAnswerTo",
                args : ["testNumArr"]
            }
            let outString = "1";
            let expectedAns = 1;
            it('Should return success', async () => {
                await participants.updateParameter(testPartId, "testNumArr", [])
                let participant = await participants.get(testPartId);
                participant.currentAnswer = [outString];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.eql([expectedAns])
            })
            it('Should have saved the parameter as number in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(Array.isArray(participant.parameters[actionObj.args[0]]));
                expect(participant.parameters[actionObj.args[0]].length).to.equal(1);
                expect(participant.parameters[actionObj.args[0]]).to.eql([expectedAns]);
            })
        })
        describe('Number answer - 2', () => {
            let returnObj;
            let actionObj = {
                aType : "addAnswerTo",
                args : ["testNumArr"]
            }
            let outString = "2";
            let expectedAns = 2;
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentAnswer = [outString];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.eql([1,expectedAns])
            })
            it('Should have saved the parameter as number in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(Array.isArray(participant.parameters[actionObj.args[0]]));
                expect(participant.parameters[actionObj.args[0]].length).to.equal(2);
                expect(participant.parameters[actionObj.args[0]]).to.eql([1, expectedAns]);
            })
        })
        describe('Number answer fails when not a number', () => {
            let returnObj;
            let actionObj = {
                aType : "addAnswerTo",
                args : ["testNumArr"]
            }
            let outString = "spork";
            let expectedAns = 2;
            it('Should return failure', async () => {
                let participant = await participants.get(testPartId);
                participant.currentAnswer = [outString];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);
            })
            it('Should not have saved the parameter as number in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(Array.isArray(participant.parameters[actionObj.args[0]]));
                expect(participant.parameters[actionObj.args[0]].length).to.equal(2);
                expect(participant.parameters[actionObj.args[0]]).to.eql([1, expectedAns]);
            })
        })
        describe('Fails', () => {
            let returnObj;
            let outString = "23";
            let expectedOut = 23;

            it('Should fail when variable name not string', async () => {
                let actionObj = {
                    aType : "addAnswerTo",
                    args : [234]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["hello"];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data)
            })
            it('Should fail when current answer missing', async () => {
                let actionObj = {
                    aType : "addAnswerTo",
                    args : ["timezone"]
                }
                let participant = await participants.get(testPartId);
                delete participant.currentAnswer;
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data)
            })
            it('Should fail when variable not recognized', async () => {
                let actionObj = {
                    aType : "addAnswerTo",
                    args : ["timezone2"]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["Europe/Berlin"];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data)
            })
            it('Should fail when cannot add to variable type', async () => {
                let actionObj = {
                    aType : "addAnswerTo",
                    args : ["testBool"]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["Europe/Berlin"];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data)
            })
            it('Should fail when cannot add to reserved var', async () => {
                let actionObj = {
                    aType : "addAnswerTo",
                    args : ["STAGE_NAME"]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["Europe/Berlin"];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data)
            })

        })
    })
    describe('ClearVar', ()=>{
        describe('String array', () => {
            let returnObj;
            let actionObj = {
                aType : "clearVars",
                args : ["testStrArr"]
            }
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                assert(participant.parameters[actionObj.args[0]].length > 0);
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.eql([])
            })
            it('Should have cleared the string array in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(Array.isArray(participant.parameters[actionObj.args[0]]));
                expect(participant.parameters[actionObj.args[0]].length).to.equal(0);
            })
        })
        describe('Number array', () => {
            let returnObj;
            let actionObj = {
                aType : "clearVars",
                args : ["testNumArr"]
            }
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                assert(participant.parameters[actionObj.args[0]].length > 0);
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.eql([])
            })
            it('Should have cleared the num array in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(Array.isArray(participant.parameters[actionObj.args[0]]));
                expect(participant.parameters[actionObj.args[0]].length).to.equal(0);
            })
        })
        describe('Number', () => {
            let returnObj;
            let actionObj = {
                aType : "clearVars",
                args : ["testNum"]
            }
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                expect(participant.parameters[actionObj.args[0]]).to.not.be.undefined;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.eql(0)
            })
            it('Should have cleared the num to default in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(actionObj.args[0] in participant.parameters);
                expect(participant.parameters[actionObj.args[0]]).to.equal(0);
            })
        })
        describe('String + Boolean', () => {
            let returnObj;
            let actionObj = {
                aType : "clearVars",
                args : ["timezone", "testBool"]
            }
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                expect(participant.parameters[actionObj.args[0]]).to.not.be.undefined;
                expect(participant.parameters[actionObj.args[1]]).to.not.be.undefined;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.eql("")
                expect(returnObj.data["parameters"][actionObj.args[1]]).to.eql(false)
            })
            it('Should have cleared the string to default in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(actionObj.args[0] in participant.parameters);
                expect(participant.parameters[actionObj.args[0]]).to.equal("");
                assert(actionObj.args[1] in participant.parameters);
                expect(participant.parameters[actionObj.args[1]]).to.equal(false);
            })
        })
        describe('String + String', () => {
            let returnObj;
            let actionObj = {
                aType : "clearVars",
                args : ["timezone", "testStr"]
            }
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                expect(participant.parameters[actionObj.args[0]]).to.not.be.undefined;
                expect(participant.parameters[actionObj.args[1]]).to.not.be.undefined;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.eql("")
                expect(returnObj.data["parameters"][actionObj.args[1]]).to.eql("")
            })
            it('Should have cleared the string to default in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(actionObj.args[0] in participant.parameters);
                expect(participant.parameters[actionObj.args[0]]).to.equal("");
                assert(actionObj.args[1] in participant.parameters);
                expect(participant.parameters[actionObj.args[1]]).to.equal("");
            })
        })
        describe('Boolean', () => {
            let returnObj;
            let actionObj = {
                aType : "clearVars",
                args : ["testBool", ]
            }
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                expect(participant.parameters[actionObj.args[0]]).to.not.be.undefined;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data["parameters"][actionObj.args[0]]).to.eql(false)
            })
            it('Should have cleared the boolean to default in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(actionObj.args[0] in participant.parameters);
                expect(participant.parameters[actionObj.args[0]]).to.equal(false);
            })
        })
        describe('Fails', () => {
            let returnObj;
            let outString = "23";
            let expectedOut = 23;

            it('Should fail when array length 0', async () => {
                let actionObj = {
                    aType : "clearVars",
                    args : []
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["hello"];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data)
            })
            it('Should fail when one variable name not string', async () => {
                let actionObj = {
                    aType : "clearVars",
                    args : [234]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["hello"];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data)
            })
            it('Should fail when one variable not recognized', async () => {
                let actionObj = {
                    aType : "clearVars",
                    args : ["timezone2", "timezone"]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["Europe/Berlin"];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data)
            })
            it('Should fail when cannot clear reserved var', async () => {
                let actionObj = {
                    aType : "clearVars",
                    args : ["STAGE_NAME", "timezone"]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["Europe/Berlin"];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data)
            })

        })
    })

})

describe('Severing DB connection', () => {
    it('Should remove participant', async () => {
        await participants.remove(testPartId);
        let participant = await participants.get(testPartId);
        expect(participant).to.be.null;
    });
    it('Should remove experiment', async () => {
        await experiments.remove(config.experimentId);
        let experiment = await experiments.get(config.experimentId);
        expect(experiment).to.be.null;
    });
    it('Should remove idMap', async () => {
        await idMaps.removeAllForExperiment(config.experimentId);
        let experiment = await idMaps.getExperiment(config.experimentId);
        expect(experiment.IDMappings.length).to.equal(0);
    });

    it('Should close connection', async () => {
        try
        {
            await mongo.connection.close();
            console.log('\tConnection closed!')
        } catch(err) {
            console.log(err)
        }

        const result = mongo.connection.readyState;
        expect(result).to.equal(0);
    });
})