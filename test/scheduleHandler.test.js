const { MongoMemoryServer } = require('mongodb-memory-server');

const participants = require('../src/apiControllers/participantApiController');

const mongo = require('mongoose');

const { assert, expect } = require('chai');

const testConfig = require('../json/test/scheduleHandlerTestConfig.json');

const QuestionHandler = require('../src/questionHandler');

const qHandler = new QuestionHandler(testConfig);

const ScheduleHandler = require('../src/scheduleHandler')

const testId = 123;
const testCtx = {
    from : {
        id: testId
    }
};
describe('Scheduling one question', () =>{

    describe('Connecting to DB',  () => {
        it('Should connect to memory server', async () => {
            mongoServer = await MongoMemoryServer.create()
            try{
                await mongo.connect(mongoServer.getUri(), { dbName: "verifyMASTER" });
                console.log('\tConnection successful!');
            } catch (err) {
                console.log(err);
            }

            const result = mongo.connection.readyState;
            expect(result).to.equal(1);
        });
        it('Should add and update participant parameter', async () => {

            await participants.add(testId);
            await participants.updateParameter(testId, "language","English")
            var participant = await participants.get(testId);
            expect(participant).to.not.be.null;
            expect(participant.chatId).to.equal(testId);
            expect(participant.parameters.language).to.equal("English");

        });
    })

    const hours = 10;
    const mins = 0;
    const days = [1,2]
    describe('Scheduling new question correctly',    () => {
        const questionInfo = {
            qId: 'morningQuestions.mainGoal',
            atTime: '10:00',
            onDays: ["Mon", "Tue"]
        };

        let returnObj, returnJob;
        it('Should succeed',  async () => {
            returnObj = await ScheduleHandler.scheduleOneQuestion(testCtx, qHandler, questionInfo, true)
            expect(returnObj.returnCode).to.equal(1);
        });
        it('Should return jobId and job',  () => {
            returnJob =  returnObj.data;
            assert("jobId" in returnJob);
            assert("job" in returnJob);
        });
        it('Should have job with correct times',  () => {
            returnJob =  returnObj.data.job;
            let recObj = returnJob.pendingInvocations[0].recurrenceRule;
            expect(recObj.dayOfWeek).to.eql(days);
            expect(recObj.hour).to.equal(hours);
            expect(recObj.minute).to.equal(mins);
        });
        it('Should save job to scheduledOperations',  () => {
            let returnJobId =  returnObj.data.jobId;
            let savedJob = ScheduleHandler.scheduledOperations["questions"][returnJobId];
            expect(savedJob).to.eql(returnJob);
        });
        it('Should write job to database', async () => {
            let participant = await participants.get(testId);
            let scheduledQs = participant.scheduledOperations["questions"];

            let scheduledQ = scheduledQs[scheduledQs.length-1];
            expect(scheduledQ.jobId).to.equal(returnObj.data.jobId);
            expect(scheduledQ.qId).to.equal(questionInfo.qId);
            expect(scheduledQ.atTime).to.equal(questionInfo.atTime);
            expect(scheduledQ.onDays).to.eql(questionInfo.onDays);
        });
    });
    describe('Scheduling old question correctly',    () => {
        const questionInfo = {
            qId: 'morningQuestions.addGoal',
            atTime: '10:00',
            onDays: ["Mon", "Tue"]
        };

        let returnObj, returnJob;
        it('Should succeed',  async () => {
            returnObj = await ScheduleHandler.scheduleOneQuestion(testCtx, qHandler, questionInfo, false)
            expect(returnObj.returnCode).to.equal(1);
        });
        it('Should return jobId and job',  () => {
            returnJob =  returnObj.data;
            assert("jobId" in returnJob);
            assert("job" in returnJob);
        });
        it('Should have job with correct times',  () => {
            returnJob =  returnObj.data.job;
            let recObj = returnJob.pendingInvocations[0].recurrenceRule;
            expect(recObj.dayOfWeek).to.eql(days);
            expect(recObj.hour).to.equal(hours);
            expect(recObj.minute).to.equal(mins);
        });
        it('Should save job to scheduledOperations',  () => {
            let returnJobId =  returnObj.data.jobId;
            let savedJob = ScheduleHandler.scheduledOperations["questions"][returnJobId];
            expect(savedJob).to.eql(returnJob);
        });
        it('Should not write job to database', async () => {
            let participant = await participants.get(testId);
            let scheduledQs = participant.scheduledOperations["questions"];

            let scheduledQ = scheduledQs[scheduledQs.length-1];
            expect(scheduledQ.jobId).to.not.equal(returnObj.data.jobId);
            expect(scheduledQs.length).to.equal(1);
        });
    });

    describe('Scheduling question incorrectly',    () => {


        let returnObj, returnJob;
        it('Should fail with non-existent qId',  async () => {
            const questionInfo = {
                qId: 'morningQuestions.purple',
                atTime: '10:00',
                onDays: ["Mon", "Tue"]
            };
            returnObj = await ScheduleHandler.scheduleOneQuestion(testCtx, qHandler, questionInfo, false)
            expect(returnObj.returnCode).to.equal(-1);
            console.log(returnObj.data);
        });
        it('Should fail without qId',  async () => {
            const questionInfo = {
                atTime: '10:00',
                onDays: ["Mon", "Tue"]
            };
            returnObj = await ScheduleHandler.scheduleOneQuestion(testCtx, qHandler, questionInfo, false)
            expect(returnObj.returnCode).to.equal(-1);
            console.log(returnObj.data);
        });
        it('Should fail with incorrect time format',  async () => {
            const questionInfo = {
                qId: 'morningQuestions.mainGoal',
                atTime: '1000',
                onDays: ["Mon", "Tue"]
            };
            returnObj = await ScheduleHandler.scheduleOneQuestion(testCtx, qHandler, questionInfo, false)
            expect(returnObj.returnCode).to.equal(-1);
            console.log(returnObj.data);
        });
        it('Should fail with incorrect time format 2',  async () => {
            const questionInfo = {
                qId: 'morningQuestions.mainGoal',
                atTime: 'beans',
                onDays: ["Mon", "Tue"]
            };
            returnObj = await ScheduleHandler.scheduleOneQuestion(testCtx, qHandler, questionInfo, false)
            expect(returnObj.returnCode).to.equal(-1);
            console.log(returnObj.data);
        });
        it('Should fail without time',  async () => {
            const questionInfo = {
                qId: 'morningQuestions.mainGoal',
                onDays: ["Mon", "Tue"]
            };
            returnObj = await ScheduleHandler.scheduleOneQuestion(testCtx, qHandler, questionInfo, false)
            expect(returnObj.returnCode).to.equal(-1);
            console.log(returnObj.data);
        });
        it('Should fail with incorrect day',  async () => {
            const questionInfo = {
                qId: 'morningQuestions.mainGoal',
                atTime: '10:00',
                onDays: ["Mon", "Frog"]
            };
            returnObj = await ScheduleHandler.scheduleOneQuestion(testCtx, qHandler, questionInfo, false)
            expect(returnObj.returnCode).to.equal(-1);
            console.log(returnObj.data);
        });
        it('Should fail without on days',  async () => {
            const questionInfo = {
                qId: 'morningQuestions.mainGoal',
                atTime: '10:00'
            };
            returnObj = await ScheduleHandler.scheduleOneQuestion(testCtx, qHandler, questionInfo, false)
            expect(returnObj.returnCode).to.equal(-1);
            console.log(returnObj.data);
        });

    });

    describe('Severing DB connection', () => {
        it('Should remove participant', async () => {
            await participants.remove(testId);
            let participant = await participants.get(testId);
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
    // TODO: Test schedule all questions

});
