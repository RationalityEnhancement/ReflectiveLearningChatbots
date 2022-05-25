const { expect, assert } = require('chai');
const testConfig = require('../json/test/stageHandlerTestConfig.json');
const testConfigConds = require('../json/test/stageHandlerTestConfigConds.json');
const DevConfig = require('../json/devConfig.json');

const StageHandler = require('../src/StageHandler');
const {MongoMemoryServer} = require("mongodb-memory-server");
const mongo = require("mongoose");
const participants = require("../src/apiControllers/participantApiController");
const config = require("../json/config.json");

describe('Get length days', () => {
    describe('No conditions', () => {
        it('Should return correct number of days', () => {

            let returnObj = StageHandler.getStageLengthDays(testConfig, undefined, "Post-Test")
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(testConfig.experimentStages[2].lengthDays)
        })
        it('Should return -1', () => {

            let returnObj = StageHandler.getStageLengthDays(testConfig, undefined, "Pre-Test")
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(-1)
        })
        it('Should fail when stage doesnt exist', () => {
            let returnObj = StageHandler.getStageLengthDays(testConfig, undefined, "Prep")
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
    })
    describe('Yes conditions', () => {
        it('Should return correct number of days', () => {

            let returnObj = StageHandler.getStageLengthDays(testConfigConds, "Experimental", "Post")
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(testConfigConds.experimentStages.Experimental[1].lengthDays)
        })
        it('Should return -1', () => {

            let returnObj = StageHandler.getStageLengthDays(testConfigConds, "Experimental", "Pre")
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(-1)
        })
        it('Should fail when stage doesnt exist', () => {
            let returnObj = StageHandler.getStageLengthDays(testConfigConds, "Experimental", "Prep")
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when condition doesnt exist', () => {
            let returnObj = StageHandler.getStageLengthDays(testConfigConds, "FakeCondition", "Prep")
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when stages not array', () => {
            let returnObj = StageHandler.getStageLengthDays(testConfigConds, "Fail1", "Prep")
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when not all stages have a name', () => {
            let returnObj = StageHandler.getStageLengthDays(testConfigConds, "Fail2", "Prep")
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when length days is not a number', () => {
            let returnObj = StageHandler.getStageLengthDays(testConfigConds, "Experimental", "FailStage")
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when stage name is not a string', () => {
            let returnObj = StageHandler.getStageLengthDays(testConfigConds, "Experimental", true)
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

            let returnObj = StageHandler.getNextStageName(testConfigConds, "Experimental", "FailStage")
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
            expect(newPart.stages.stageDay).to.equal(0);
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
            expect(newPart.stages.stageDay).to.be.undefined;
            expect(newPart.stages.stageName).to.be.undefined;
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
            expect(newPart.stages.stageDay).to.equal(0);
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
            expect(newPart.stages.stageDay).to.equal(0);
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