const { expect, assert } = require('chai');
const testConfig = require('../json/test/stageHandlerTestConfig.json');
const testConfigConds = require('../json/test/stageHandlerTestConfigConds.json');
const DevConfig = require('../json/devConfig.json');

const StageHandler = require('../src/StageHandler');


describe('Get length days', () => {
    describe('No conditions', () => {
        it('Should return correct number of days', () => {

            let returnObj = StageHandler.getStageLengthDays(testConfig, undefined, "Post")
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(testConfig.experimentStages[1].lengthDays)
        })
        it('Should return -1', () => {

            let returnObj = StageHandler.getStageLengthDays(testConfig, undefined, "Pre")
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

            let returnObj = StageHandler.getNextStageName(testConfig, undefined, "Pre")
            console.log(returnObj)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(testConfig.experimentStages[1].name)
        })
        it('Should return -1 when no next stage', () => {

            let returnObj = StageHandler.getNextStageName(testConfig, undefined, "Post")
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