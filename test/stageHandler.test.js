const { expect, assert } = require('chai');
const testConfig = require('../json/test/stageHandlerTestConfig.json');
const testConfigConds = require('../json/test/stageHandlerTestConfigConds.json');

const ConfigReader = require('../src/configReader');
const DevConfig = ConfigReader.getDevConfig();

const StageHandler = require('../src/StageHandler');
const {MongoMemoryServer} = require("mongodb-memory-server");
const mongo = require("mongoose");
const participants = require("../src/apiControllers/participantApiController");
const config = ConfigReader.getExpConfig();

describe('Get stage list', () => {
    describe('Fails', () => {
        it('Should fail when condition doesnt exist', () => {
            let returnObj = StageHandler.getStageList(testConfigConds, "FakeCondition")
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when condition not in experiment stages', () => {
            let returnObj = StageHandler.getStageList(testConfigConds, "Extra")
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when stages not array', () => {
            let returnObj = StageHandler.getStageList(testConfigConds, "Fail1")
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when conditions exist but pass undefined', () => {
            let returnObj = StageHandler.getStageList(testConfigConds, undefined)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when not all stages have a name', () => {
            let returnObj = StageHandler.getStageList(testConfigConds, "Fail2")
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when stage list empty', () => {
            let returnObj = StageHandler.getStageList(testConfigConds, "Fail3")
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
    })

    describe('No conds', () => {
        it('Should succeed normally', () => {
            let returnObj = StageHandler.getStageList(testConfig, undefined)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(testConfig.experimentStages);
        })
    })
    describe('Yes conds', () => {
        it('Should succeed normally', () => {
            let returnObj = StageHandler.getStageList(testConfigConds, "Experimental")
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(testConfigConds.experimentStages.Experimental);
        })
    })
})
describe('Get stage params', () => {
    describe('No conditions', () => {
        it('Should return correct number of days', () => {

            let returnObj = StageHandler.getStageParam(testConfig, undefined, "Post-Test", DevConfig.STAGE_PARAMS.LENGTH_DAYS)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(testConfig.experimentStages[2].lengthDays)
        })
        it('Should return -1 when no current days', () => {

            let returnObj = StageHandler.getStageParam(testConfig, undefined, "Pre-Test", DevConfig.STAGE_PARAMS.LENGTH_DAYS)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(-1)
        })
        it('Should return correct onDays', () => {

            let returnObj = StageHandler.getStageParam(testConfig, undefined, "Test", DevConfig.STAGE_PARAMS.ON_DAYS)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(testConfig.experimentStages[1].onDays)
        })
        it('Should return -1 when no onDays', () => {

            let returnObj = StageHandler.getStageParam(testConfig, undefined, "Pre-Test", DevConfig.STAGE_PARAMS.ON_DAYS)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(-1)
        })
        it('Should fail when stage doesnt exist', () => {
            let returnObj = StageHandler.getStageParam(testConfig, undefined, "Prep", DevConfig.STAGE_PARAMS.LENGTH_DAYS)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
    })
    describe('Yes conditions', () => {
        it('Should return correct number of days', () => {

            let returnObj = StageHandler.getStageParam(testConfigConds, "Experimental", "Post", DevConfig.STAGE_PARAMS.LENGTH_DAYS)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(testConfigConds.experimentStages.Experimental[1].lengthDays)
        })
        it('Should return -1 when no length', () => {

            let returnObj = StageHandler.getStageParam(testConfigConds, "Experimental", "Pre", DevConfig.STAGE_PARAMS.LENGTH_DAYS)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(-1)
        })
        it('Should return correct onDays', () => {

            let returnObj = StageHandler.getStageParam(testConfigConds, "Experimental", "Pre", DevConfig.STAGE_PARAMS.ON_DAYS)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(testConfigConds.experimentStages.Experimental[0].onDays)
        })
        it('Should return -1 when no onDays', () => {

            let returnObj = StageHandler.getStageParam(testConfigConds, "Experimental", "Post", DevConfig.STAGE_PARAMS.ON_DAYS)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(-1)
        })
        it('Should fail when stage doesnt exist', () => {
            let returnObj = StageHandler.getStageParam(testConfigConds, "Experimental", "Prep", DevConfig.STAGE_PARAMS.LENGTH_DAYS)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when stage name is not a string', () => {
            let returnObj = StageHandler.getStageParam(testConfigConds, "Experimental", true, DevConfig.STAGE_PARAMS.LENGTH_DAYS)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when stage onDays contains invalid day', () => {
            let returnObj = StageHandler.getStageParam(testConfigConds, "Experimental", "FailStage", DevConfig.STAGE_PARAMS.ON_DAYS)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when length days is not a number', () => {
            let returnObj = StageHandler.getStageParam(testConfigConds, "Experimental", "FailStage", DevConfig.STAGE_PARAMS.LENGTH_DAYS)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when stage onDays is not an array', () => {
            let returnObj = StageHandler.getStageParam(testConfigConds, "Experimental", "FailStage2", DevConfig.STAGE_PARAMS.ON_DAYS)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
    })
})

describe('Get next stage name', () => {
    describe('No conditions', () => {
        it('Should return next stage name', () => {

            let returnObj = StageHandler.getNextStageName(testConfig, undefined, "Pre-Test")
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(testConfig.experimentStages[1].name)
        })
        it('Should return -1 when no next stage', () => {

            let returnObj = StageHandler.getNextStageName(testConfig, undefined, "Post-Test")
            expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
            expect(returnObj.successData).to.equal(-1)
        })
        it('Should fail when stage doesnt exist', () => {
            let returnObj = StageHandler.getNextStageName(testConfig, undefined, "Prep")
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
    })
    describe('Yes conditions', () => {
        it('Should return next stage name', () => {
            let returnObj = StageHandler.getNextStageName(testConfigConds, "Experimental", "Pre")
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(testConfigConds.experimentStages.Experimental[1].name)
        })
        it('Should return -1 when no next stage', () => {

            let returnObj = StageHandler.getNextStageName(testConfigConds, "Experimental", "FailStage2")
            expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
            expect(returnObj.successData).to.equal(-1)
        })
        it('Should fail when stage doesnt exist', () => {
            let returnObj = StageHandler.getNextStageName(testConfigConds, "Experimental", "Prep")
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when condition doesnt exist', () => {
            let returnObj = StageHandler.getNextStageName(testConfigConds, "FakeCondition", "Prep")
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when stages not array', () => {
            let returnObj = StageHandler.getNextStageName(testConfigConds, "Fail1", "Prep")
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when not all stages have a name', () => {
            let returnObj = StageHandler.getNextStageName(testConfigConds, "Fail2", "Prep")
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when stage name is not a string', () => {
            let returnObj = StageHandler.getNextStageName(testConfigConds, "Experimental", true)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
    })
})

const testPartId = "12345";

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
            assert("stages" in participant);
            assert("activity" in participant.stages);
            assert("stageName" in participant.stages);
            assert("stageDay" in participant.stages);
        });
    })
})

describe('End/Begin Stage', () => {
    describe('No current stage - End', () => {
        let returnObj;
        it('Should return failure', async () => {
            let participant = await participants.get(testPartId);
            returnObj = await StageHandler.endCurrentStage(participant);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
    })
    describe('No current stage - begin', () => {
        let returnObj, newPart;
        let stageName = "Pre-Test";
        it('Should return success', async () => {
            let participant = await participants.get(testPartId);
            returnObj = await StageHandler.startStage(participant, stageName);
            console.log(returnObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        })
        it('Should have added start to stage activity', async () => {
            newPart = await participants.get(testPartId);
            expect(newPart.stages.activity.length).to.equal(1);
            let newActivity = newPart.stages.activity[newPart.stages.activity.length-1];
            expect(newActivity.name).to.equal(stageName);
            expect(newActivity.what).to.equal(DevConfig.BEGIN_STAGE_STRING);
            expect(typeof newActivity.when).to.equal("string");
        })
        it('Should have updated stage day and stage name', async () => {
            expect(newPart.stages.stageDay).to.equal(1);
            expect(newPart.stages.stageName).to.equal(stageName);
        })
    })

    describe('Yes current stage - end', () => {
        let returnObj, newPart;
        let stageName = "Pre-Test";
        it('Should return success', async () => {
            let participant = await participants.get(testPartId);
            returnObj = await StageHandler.endCurrentStage(participant, stageName);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        })
        it('Should have added end to stage activity', async () => {
            newPart = await participants.get(testPartId);
            expect(newPart.stages.activity.length).to.equal(2);
            let newActivity = newPart.stages.activity[newPart.stages.activity.length-1];
            expect(newActivity.name).to.equal(stageName);
            expect(newActivity.what).to.equal(DevConfig.END_STAGE_STRING);
            expect(typeof newActivity.when).to.equal("string");
        })
        it('Should have erased stage day and stage name', async () => {
            expect(newPart.stages.stageDay).to.equal(0);
            expect(newPart.stages.stageName).to.equal("");
        })
    })

    describe('No current stage - begin 2', () => {
        let returnObj, newPart;
        let stageName = "Test";
        it('Should return success', async () => {
            let participant = await participants.get(testPartId);
            returnObj = await StageHandler.startStage(participant, stageName);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        })
        it('Should have added start to stage activity', async () => {
            newPart = await participants.get(testPartId);
            expect(newPart.stages.activity.length).to.equal(3);
            let newActivity = newPart.stages.activity[newPart.stages.activity.length-1];
            expect(newActivity.name).to.equal(stageName);
            expect(newActivity.what).to.equal(DevConfig.BEGIN_STAGE_STRING);
            expect(typeof newActivity.when).to.equal("string");
        })
        it('Should have updated stage day and stage name', async () => {
            expect(newPart.stages.stageDay).to.equal(1);
            expect(newPart.stages.stageName).to.equal(stageName);
        })
    })

    describe('Yes current stage - begin', () => {
        let returnObj, newPart;
        let stageName = "Post-Test";
        it('Should return success', async () => {
            let participant = await participants.get(testPartId);
            returnObj = await StageHandler.startStage(participant, stageName);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        })
        it('Should have added end of last stage to stage activity', async () => {
            newPart = await participants.get(testPartId);
            expect(newPart.stages.activity.length).to.equal(5);
            let newActivity = newPart.stages.activity[newPart.stages.activity.length-2];
            expect(newActivity.name).to.equal("Test");
            expect(newActivity.what).to.equal(DevConfig.END_STAGE_STRING);
            expect(typeof newActivity.when).to.equal("string");
        })
        it('Should have added start to stage activity', async () => {
            newPart = await participants.get(testPartId);
            expect(newPart.stages.activity.length).to.equal(5);
            let newActivity = newPart.stages.activity[newPart.stages.activity.length-1];
            expect(newActivity.name).to.equal(stageName);
            expect(newActivity.what).to.equal(DevConfig.BEGIN_STAGE_STRING);
            expect(typeof newActivity.when).to.equal("string");
        })
        it('Should have updated stage day and stage name', async () => {
            expect(newPart.stages.stageDay).to.equal(1);
            expect(newPart.stages.stageName).to.equal(stageName);
        })
    })

    describe('Fail when stages not present - begin', () => {
        let returnObj, newPart;
        let stageName = "Test";
        it('Should return success', async () => {
            let participant = await participants.get(testPartId);
            let copyPart = JSON.parse(JSON.stringify(participant));
            delete copyPart["stages"]
            returnObj = await StageHandler.startStage(copyPart, stageName);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
    })
    describe('Fail when stages not present - end', () => {
        let returnObj, newPart;
        let stageName = "Test";
        it('Should return success', async () => {
            let participant = await participants.get(testPartId);
            let copyPart = JSON.parse(JSON.stringify(participant));
            delete copyPart["stages"]
            returnObj = await StageHandler.endCurrentStage(copyPart);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
    })
})

describe('Update Stage Day', () => {

    describe('Current stage, update normally', () => {
        let returnObj, newPart;
        let stageName = "Test";
        it('Should update participant to test stage', async () => {
            let participant = await participants.get(testPartId);
            returnObj = await StageHandler.startStage(participant, stageName);
            newPart = await participants.get(testPartId);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(newPart.stages.stageDay).to.equal(1);
            expect(newPart.stages.stageName).to.equal(stageName);
        })
        it('Should update stage day', async () => {
            returnObj = await StageHandler.updateStageDay(testConfig, testPartId);
            newPart = await participants.get(testPartId);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(2);
            expect(newPart.stages.stageDay).to.equal(2);
            expect(newPart.stages.stageName).to.equal(stageName);
        })
    })

    describe('Switch to next stage after exceed days', () => {
        let returnObj, newPart;
        let stageName = "Test";
        let nextStageName = "Post-Test";
        it('Should update participant days to 7', async () => {
            await participants.updateStageParameter(testPartId, "stageDay", 7)
            newPart = await participants.get(testPartId);
            expect(newPart.stages.stageDay).to.equal(7);
            expect(newPart.stages.stageName).to.equal(stageName);
        })
        it('Should update stage', async () => {
            returnObj = await StageHandler.updateStageDay(testConfig, testPartId);
            newPart = await participants.get(testPartId);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(nextStageName);
            expect(newPart.stages.stageDay).to.equal(1);
            expect(newPart.stages.stageName).to.equal(nextStageName);
        })
        it('Should have added new activity', async () => {
            let activity = newPart.stages.activity;
            expect(activity[activity.length-1].name).to.equal(nextStageName);
            expect(activity[activity.length-1].what).to.equal(DevConfig.BEGIN_STAGE_STRING);
            expect(typeof activity[activity.length-1].when).to.equal("string");
            expect(activity[activity.length-2].name).to.equal(stageName);
            expect(activity[activity.length-2].what).to.equal(DevConfig.END_STAGE_STRING);
            expect(typeof activity[activity.length-2].when).to.equal("string");
        })

    })

    describe('End experiment when no next stage', () => {
        let returnObj, newPart;
        let stageName = "Post-Test";
        it('Should update participant days to 2', async () => {
            await participants.updateStageParameter(testPartId, "stageDay", 2)
            newPart = await participants.get(testPartId);
            expect(newPart.stages.stageDay).to.equal(2);
            expect(newPart.stages.stageName).to.equal(stageName);
        })
        it('Should end experiment', async () => {
            returnObj = await StageHandler.updateStageDay(testConfig, testPartId);
            newPart = await participants.get(testPartId);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(-1);
            expect(newPart.stages.stageDay).to.equal(0);
            expect(newPart.stages.stageName).to.equal("");
            expect(newPart.currentState).to.equal("experimentEnd")
        })
        it('Should have added new activity', async () => {
            let activity = newPart.stages.activity;
            expect(activity[activity.length-1].name).to.equal(stageName);
            expect(activity[activity.length-1].what).to.equal(DevConfig.END_STAGE_STRING);
            expect(typeof activity[activity.length-1].when).to.equal("string");
        })
    })

    describe('Fails', () => {
        it('Should fail when stage day not present', async () => {
            await participants.updateStageParameter(testPartId, "stageDay", undefined);
            let returnObj = await StageHandler.updateStageDay(config, testPartId);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when stage name not present', async () => {
            await participants.updateStageParameter(testPartId, "stageDay", 3);
            await participants.updateStageParameter(testPartId, "stageName", undefined);
            let returnObj = await StageHandler.updateStageDay(config, testPartId);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
    })

})

describe('End experiment', () => {

    describe('End experiment when no current stage', () => {
        let returnObj, newPart, stageLen;
        it('Should end experiment', async () => {
            await participants.updateStageParameter(testPartId, "stageName", "");
            await participants.updateField(testPartId, "currentState", "answerReceived");
            let participant = await participants.get(testPartId);
            stageLen = participant.stages.activity.length;
            expect(participant.stages.stageName).to.equal("");
            returnObj = await StageHandler.endExperiment(testPartId);
            newPart = await participants.get(testPartId);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(-1);
            expect(newPart.stages.stageName).to.equal("");
            expect(newPart.currentState).to.equal("experimentEnd")
        })
        it('Should have not added activity', () => {
            expect(newPart.stages.activity.length).to.equal(stageLen);
        })
    })
    describe('End experiment when yes current stage', () => {
        let returnObj, newPart, stageLen;
        it('Should end experiment', async () => {
            await participants.updateStageParameter(testPartId, "stageName", "stageName");
            await participants.updateField(testPartId, "currentState", "answerReceived");
            let participant = await participants.get(testPartId);
            stageLen = participant.stages.activity.length;
            expect(participant.stages.stageName).to.equal("stageName");
            returnObj = await StageHandler.endExperiment(testPartId);
            newPart = await participants.get(testPartId);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(-1);
            expect(newPart.stages.stageDay).to.equal(0);
            expect(newPart.stages.stageName).to.equal("");
            expect(newPart.currentState).to.equal("experimentEnd")
        })
        it('Should have added activity', () => {
            expect(newPart.stages.activity.length).to.equal(stageLen+1);
            let newActivity = newPart.stages.activity[newPart.stages.activity.length-1];
            expect(newActivity.name).to.equal("stageName");
            expect(newActivity.what).to.equal(DevConfig.END_STAGE_STRING);
            expect(typeof newActivity.when).to.equal("string");
        })
    })
})

describe('Creating action list', () => {
    describe('Getting on days object', () => {
        let allDaysKey = DevConfig.DAY_INDEX_ORDERING.slice().sort().join();
        it('Should work when no on days are present', () => {
            let stageList = [
                {
                    name: "Test1",
                },
                {
                    name: "Test2",
                },
                {
                    name: "Test3",
                }
            ]
            let returnObj = StageHandler.createOnDaysObj(stageList);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(typeof returnObj.data).to.equal("object");
            expect(Object.keys(returnObj.data).length).to.equal(1);
            assert(allDaysKey in returnObj.data);
            expect(returnObj.data[allDaysKey].length).to.equal(3);
            stageList.forEach(stage => assert(returnObj.data[allDaysKey].includes(stage.name)));
        })
        it('Should default when onDays array is empty', () => {
            let stageList = [
                {
                    name: "Test1",
                    onDays : []
                },
                {
                    name: "Test2",
                },
                {
                    name: "Test3",
                }
            ]
            let returnObj = StageHandler.createOnDaysObj(stageList);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(typeof returnObj.data).to.equal("object");
            expect(Object.keys(returnObj.data).length).to.equal(1);
            assert(allDaysKey in returnObj.data);
            expect(returnObj.data[allDaysKey].length).to.equal(3);
            stageList.forEach(stage => assert(returnObj.data[allDaysKey].includes(stage.name)));
        })
        it('Should work when some on days are present', () => {
            let stageList = [
                {
                    name: "Test1",
                },
                {
                    name: "Test2",
                    onDays : ["Mon", "Tue", "Sat"]
                },
                {
                    name: "Test3",
                }
            ]
            let returnObj = StageHandler.createOnDaysObj(stageList);
            let expKey = stageList[1].onDays.sort().join()
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(typeof returnObj.data).to.equal("object");
            expect(Object.keys(returnObj.data).length).to.equal(2);
            assert(allDaysKey in returnObj.data);
            assert(expKey in returnObj.data);
            expect(returnObj.data[allDaysKey].length).to.equal(2);
            expect(returnObj.data[expKey].length).to.equal(1);
            assert(returnObj.data[allDaysKey].includes(stageList[0].name));
            assert(returnObj.data[expKey].includes(stageList[1].name));
            assert(returnObj.data[allDaysKey].includes(stageList[2].name));
        })
        it('Should work when two have same non-default on days', () => {
            let stageList = [
                {
                    name: "Test1",
                },
                {
                    name: "Test2",
                    onDays : ["Mon", "Tue", "Sat"]
                },
                {
                    name: "Test3",
                    onDays : ["Sat", "Mon", "Tue"]
                }
            ]
            let returnObj = StageHandler.createOnDaysObj(stageList);
            let expKey = stageList[1].onDays.sort().join()
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(typeof returnObj.data).to.equal("object");
            expect(Object.keys(returnObj.data).length).to.equal(2);
            assert(allDaysKey in returnObj.data);
            assert(expKey in returnObj.data);
            expect(returnObj.data[allDaysKey].length).to.equal(1);
            expect(returnObj.data[expKey].length).to.equal(2);
            assert(returnObj.data[allDaysKey].includes(stageList[0].name));
            assert(returnObj.data[expKey].includes(stageList[1].name));
            assert(returnObj.data[expKey].includes(stageList[2].name));
        })
        it('Should work when all have same non-default on days', () => {
            let stageList = [
                {
                    name: "Test1",
                    onDays : ["Tue", "Sat", "Mon"]
                },
                {
                    name: "Test2",
                    onDays : ["Mon", "Tue", "Sat"]
                },
                {
                    name: "Test3",
                    onDays : ["Sat", "Mon", "Tue"]
                }
            ]
            let returnObj = StageHandler.createOnDaysObj(stageList);
            let expKey = stageList[1].onDays.sort().join()
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(typeof returnObj.data).to.equal("object");
            expect(Object.keys(returnObj.data).length).to.equal(1);
            assert(expKey in returnObj.data);
            expect(returnObj.data[expKey].length).to.equal(3);
            assert(returnObj.data[expKey].includes(stageList[0].name));
            assert(returnObj.data[expKey].includes(stageList[1].name));
            assert(returnObj.data[expKey].includes(stageList[2].name));
        })

    })
    describe('Creating action list', () => {
        it('Should create one action', () => {
            let dayList = ["Mon", "Tue", "Wed", "Thu", "Fri"];
            let returnObj = StageHandler.createStageUpdateActionList(testConfigConds, "TestOneGroup");
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.length).to.equal(1);
            expect(returnObj.data[0].onDays.sort()).to.eql(dayList.sort());
            expect(returnObj.data[0].if).to.equal("${STAGE_NAME} != $S{}");
            expect(returnObj.data[0].aType).to.equal("incrementStageDay");
            expect(returnObj.data[0].atTime).to.equal(DevConfig.STAGE_UPDATE_TIME);
        })
        it('Should create multiple actions', () => {
            let dayList2 = ["Mon", "Tue", "Wed", "Thu", "Fri"];
            let dayList13 = ["Mon", "Tue", "Wed"];
            let dayList4 = DevConfig.DAY_INDEX_ORDERING;
            let returnObj = StageHandler.createStageUpdateActionList(testConfigConds, "TestManyGroup");
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.length).to.equal(3);
            returnObj.data.forEach(actionObj => {
                expect(actionObj.aType).to.equal("incrementStageDay");
                expect(actionObj.atTime).to.equal(DevConfig.STAGE_UPDATE_TIME);
                try{
                    expect(actionObj.onDays.sort()).to.eql(dayList2.sort());
                    expect(actionObj.if).to.equal("${STAGE_NAME} == $S{2}");
                } catch(e){
                    try{
                        expect(actionObj.onDays.sort()).to.eql(dayList13.sort());
                        let possConditions = ["(${STAGE_NAME} == $S{1}) OR (${STAGE_NAME} == $S{3})",
                            "(${STAGE_NAME} == $S{3}) OR (${STAGE_NAME} == $S{1})"]
                        assert(possConditions.includes(actionObj.if));
                    } catch(err){
                        expect(actionObj.onDays.sort()).to.eql(dayList4.sort());
                        expect(actionObj.if).to.equal("${STAGE_NAME} == $S{4}");
                    }
                }


            })

        })
        it('Should fail if days are invalid', () => {
            let returnObj = StageHandler.createStageUpdateActionList(testConfigConds, "Experimental");
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data)
        })
    })
})

describe('Severing DB connection', () => {
    it('Should remove participant', async () => {
        await participants.remove(testPartId);
        let participant = await participants.get(testPartId);
        expect(participant).to.be.null;
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