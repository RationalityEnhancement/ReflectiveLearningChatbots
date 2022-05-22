const { MongoMemoryServer } = require('mongodb-memory-server');

const participants = require('../src/apiControllers/participantApiController');
const experiments = require('../src/apiControllers/experimentApiController');
const idMaps = require('../src/apiControllers/idMapApiController');

const mongo = require('mongoose');

const { assert, expect } = require('chai');

const DevConfig = require('../json/devConfig.json');
const config = require('../json/config.json');

const bot = {
    telegram : {
        sendMessage : () => { return; },
        getChat : (id) => { return { first_name : "John" }}
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
            await participants.initializeParticipant(testPartId, config)
            let participant = await participants.get(testPartId);
            expect(participant).to.not.be.null;
            expect(participant.uniqueId).to.equal(testPartId);
            expect(participant.parameters.language).to.equal("English");
            assert("parameterTypes" in participant);

        });
        it('Should add and update experiment', async () => {

            await experiments.add(config.experimentId);
            await experiments.initializeExperiment(config.experimentId, config.experimentName, config.experimentConditions, config.conditionAssignments);

            let experiment = await experiments.get(config.experimentId);
            expect(experiment).to.not.be.null;
            expect(experiment.experimentId).to.equal(config.experimentId);

        });
        it('Should add and update id map', async () => {

            await idMaps.addExperiment(config.experimentId);
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
        assert(!ret);
    })
    it('Should fail when action type undefined', () => {
        let actionObj = {
            "args" : ["1", "2"]
        }
        let ret = ActionHandler.validateActionObject(actionObj);
        assert(!ret);
    })
    it('Should fail when args not array', () => {
        let actionObj = {
            "aType" : "testAction",
            "args" : "test"
        }
        let ret = ActionHandler.validateActionObject(actionObj);
        assert(!ret);
    })
    it('Should fail when number of args doesnt match atype', () => {
        let actionObj = {
            "aType" : "setBooleanVar",
            "args" : ["1"]
        }
        let ret = ActionHandler.validateActionObject(actionObj);
        assert(!ret);
    })
    it('Should fail when one arg is undefined', () => {
        let actionObj = {
            "aType" : "setBooleanVar",
            "args" : ["1", undefined]
        }
        let ret = ActionHandler.validateActionObject(actionObj);
        assert(!ret);
    })
    it('Should succeed when all is correct', () => {
        let actionObj = {
            "aType" : "setBooleanVar",
            "args" : ["1", "2"]
        }
        let ret = ActionHandler.validateActionObject(actionObj);
        assert(ret);
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
                expect(returnObj.data).to.equal("Europe/Berlin")
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
                expect(returnObj.data).to.eql(outString)
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
                expect(returnObj.data).to.equal(expectedOut)
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

        })
    })
    describe('SetBooleanVar', ()=>{
        describe('Set to true', () => {
            let returnObj;
            let actionObj = {
                aType : "setBooleanVar",
                args : ["testBool", true]
            }
            let outString = true;
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                participant.parameters.testBool = false;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(outString)
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
                args : ["testBool", false]
            }
            let outString = false;
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                participant.parameters.testBool = true;
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(outString)
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
                    args : [234, true]
                }
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data);
            })
            it('Should fail when new value not bool', async () => {
                let actionObj = {
                    aType : "setBooleanVar",
                    args : ["testBool", "true"]
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
                    args : ["testBoolbs", true]
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
                    args : ["testNum", true]
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
                expect(returnObj.data).to.equal(outString)
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
                expect(returnObj.data).to.equal(outString)
            })
            it('Should have saved the parameter as string in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(Array.isArray(participant.parameters[actionObj.args[0]]));
                expect(participant.parameters[actionObj.args[0]].length).to.equal(2);
                expect(participant.parameters[actionObj.args[0]]).to.eql(["ans1", outString]);
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
                expect(returnObj.data).to.equal(expectedAns)
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
                expect(returnObj.data).to.equal(expectedAns)
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

        })
    })
    describe('ClearArrVar', ()=>{
        describe('String array', () => {
            let returnObj;
            let actionObj = {
                aType : "clearArrVar",
                args : ["testStrArr"]
            }
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                console.log(participant.parameters);
                assert(participant.parameters[actionObj.args[0]].length > 0);
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.eql([])
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
                aType : "clearArrVar",
                args : ["testNumArr"]
            }
            it('Should return success', async () => {
                let participant = await participants.get(testPartId);
                participant.currentState = "answerReceived";
                assert(participant.parameters[actionObj.args[0]].length > 0);
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.eql([])
            })
            it('Should have cleared the num array in the participant', async ()=>{
                let participant = await participants.get(testPartId);
                assert(Array.isArray(participant.parameters[actionObj.args[0]]));
                expect(participant.parameters[actionObj.args[0]].length).to.equal(0);
            })
        })
        describe('Fails', () => {
            let returnObj;
            let outString = "23";
            let expectedOut = 23;

            it('Should fail when variable name not string', async () => {
                let actionObj = {
                    aType : "clearArrVar",
                    args : [234]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["hello"];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data)
            })
            it('Should fail when variable not recognized', async () => {
                let actionObj = {
                    aType : "clearArrVar",
                    args : ["timezone2"]
                }
                let participant = await participants.get(testPartId);
                participant.currentAnswer = ["Europe/Berlin"];
                participant.currentState = "answerReceived";
                returnObj = await ActionHandler.processAction(bot, config, participant, actionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data)
            })
            it('Should fail when cannot clear variable type', async () => {
                let actionObj = {
                    aType : "clearArrVar",
                    args : ["testBool"]
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
        await idMaps.remove(config.experimentId);
        let experiment = await idMaps.getExperiment(config.experimentId);
        expect(experiment).to.be.null;
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