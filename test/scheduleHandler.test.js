const { MongoMemoryServer } = require('mongodb-memory-server');
const moment = require('moment-timezone');

const participants = require('../src/apiControllers/participantApiController');
const idMaps = require('../src/apiControllers/idMapApiController')

const mongo = require('mongoose');

const { assert, expect } = require('chai');

const testConfig = require('../json/test/scheduleHandlerTestConfig.json');
const ConfigReader = require('../src/configReader');
const DevConfig = ConfigReader.getDevConfig();
const failConfig = require('../json/test/scheduleHandlerTestConfigFail.json');

const QuestionHandler = require('../src/questionHandler');

const qHandler = new QuestionHandler(testConfig);

const ScheduleHandler = require('../src/scheduleHandler')

const testId = "123";
const testId2 = "321";
const testId3 = "43210";
const testChatId = "abcdefg"
const testBot = {
    telegram: {
        sendMessage: () => {
            return;
        },
        getChat: (chatId) => {
            return {
                first_name: "John"
            }
        },
        sendChatAction : () =>{

            return;
        }
    }
};
let indScheduledJobs = [];
describe('Scheduling one Operation', () => {
    describe('Sorting time correctly', () => {
        const testSchQs = [{
            qId: "test1",
            atTime: "13:00",
            onDays: ["Sun", "Tue", "Thu"]
        }, {
            aType: "test2",
            args: ["a", "b", "c"],
            atTime: "11:14",
            onDays: ["Mon", "Wed", "Thu"]
        }, {
            qId: "test3",
            atTime: "08:59",
            onDays: ["Tue", "Wed", "Sat"]
        }, {
            qId: "test4",
            atTime: "23:44",
            onDays: ["Fri", "Sat", "Sun"]
        }]
        describe('Time sorting', () => {
            it('Should sort by time', () => {
                let sortedQs = ScheduleHandler.sortQInfoByTime(testSchQs);
                expect(sortedQs[0].qId).to.equal("test3")
                expect(sortedQs[1].aType).to.equal("test2")
                expect(sortedQs[2].qId).to.equal("test1")
                expect(sortedQs[3].qId).to.equal("test4")
            })
            it('Should return empty when not array', () => {
                let sortedQs = ScheduleHandler.sortQInfoByTime("lol");
                assert(Array.isArray(sortedQs));
                expect(sortedQs.length).to.equal(0)
            })
            it('Should return empty when array empty', () => {
                let sortedQs = ScheduleHandler.sortQInfoByTime([]);
                assert(Array.isArray(sortedQs));
                expect(sortedQs.length).to.equal(0)
            })
        })
        describe('Building array by temporal order', () => {
            it('Should build list in temporal order', () => {
                let tempOrd = ScheduleHandler.getTemporalOrderArray(testSchQs, 1);
                expect(tempOrd.length).to.equal(12);
                assert(tempOrd.every(qInfo => qInfo.onDays.length === 1));
                let idx = 0;
                expect(tempOrd[idx].qId).to.equal('test1')
                expect(tempOrd[idx].onDays).to.eql(["Sun"])
                idx++;
                expect(tempOrd[idx].qId).to.equal('test4')
                expect(tempOrd[idx].onDays).to.eql(["Sun"])
                idx++;
                expect(tempOrd[idx].aType).to.equal('test2')
                expect(tempOrd[idx].args).to.eql(["a", "b", "c"])
                expect(tempOrd[idx].onDays).to.eql(["Mon"])
                idx++;
                expect(tempOrd[idx].qId).to.equal('test3')
                expect(tempOrd[idx].onDays).to.eql(["Tue"])
                idx++;
                expect(tempOrd[idx].qId).to.equal('test1')
                expect(tempOrd[idx].onDays).to.eql(["Tue"])
                idx++;
                expect(tempOrd[idx].qId).to.equal('test3')
                expect(tempOrd[idx].onDays).to.eql(["Wed"])
                idx++;
                expect(tempOrd[idx].aType).to.equal('test2')
                expect(tempOrd[idx].args).to.eql(["a", "b", "c"])
                expect(tempOrd[idx].onDays).to.eql(["Wed"])

                idx++;
                expect(tempOrd[idx].aType).to.equal('test2')
                expect(tempOrd[idx].args).to.eql(["a", "b", "c"])
                expect(tempOrd[idx].onDays).to.eql(["Thu"])

                idx++;
                expect(tempOrd[idx].qId).to.equal('test1')
                expect(tempOrd[idx].onDays).to.eql(["Thu"])
                idx++;
                expect(tempOrd[idx].qId).to.equal('test4')
                expect(tempOrd[idx].onDays).to.eql(["Fri"])
                idx++;
                expect(tempOrd[idx].qId).to.equal('test3')
                expect(tempOrd[idx].onDays).to.eql(["Sat"])
                idx++;
                expect(tempOrd[idx].qId).to.equal('test4')
                expect(tempOrd[idx].onDays).to.eql(["Sat"])
                idx++;

            })
            it('Should repeat the array for multiple weeks', () => {
                let numWeeks = 3;
                let tempOrd = ScheduleHandler.getTemporalOrderArray(testSchQs, numWeeks);
                expect(tempOrd.length).to.equal(numWeeks * 12);
                assert(tempOrd.every(qInfo => qInfo.onDays.length === 1));
                let idx = 0;
                for (let i = 0; i < numWeeks; i++) {
                    expect(tempOrd[idx].qId).to.equal('test1')
                    expect(tempOrd[idx].onDays).to.eql(["Sun"])
                    idx++;
                    expect(tempOrd[idx].qId).to.equal('test4')
                    expect(tempOrd[idx].onDays).to.eql(["Sun"])
                    idx++;
                    expect(tempOrd[idx].aType).to.equal('test2')
                    expect(tempOrd[idx].args).to.eql(["a", "b", "c"])
                    expect(tempOrd[idx].onDays).to.eql(["Mon"])
                    idx++;
                    expect(tempOrd[idx].qId).to.equal('test3')
                    expect(tempOrd[idx].onDays).to.eql(["Tue"])
                    idx++;
                    expect(tempOrd[idx].qId).to.equal('test1')
                    expect(tempOrd[idx].onDays).to.eql(["Tue"])
                    idx++;
                    expect(tempOrd[idx].qId).to.equal('test3')
                    expect(tempOrd[idx].onDays).to.eql(["Wed"])
                    idx++;
                    expect(tempOrd[idx].aType).to.equal('test2')
                    expect(tempOrd[idx].args).to.eql(["a", "b", "c"])
                    expect(tempOrd[idx].onDays).to.eql(["Wed"])
                    idx++;
                    expect(tempOrd[idx].aType).to.equal('test2')
                    expect(tempOrd[idx].args).to.eql(["a", "b", "c"])
                    expect(tempOrd[idx].onDays).to.eql(["Thu"])
                    idx++;
                    expect(tempOrd[idx].qId).to.equal('test1')
                    expect(tempOrd[idx].onDays).to.eql(["Thu"])
                    idx++;
                    expect(tempOrd[idx].qId).to.equal('test4')
                    expect(tempOrd[idx].onDays).to.eql(["Fri"])
                    idx++;
                    expect(tempOrd[idx].qId).to.equal('test3')
                    expect(tempOrd[idx].onDays).to.eql(["Sat"])
                    idx++;
                    expect(tempOrd[idx].qId).to.equal('test4')
                    expect(tempOrd[idx].onDays).to.eql(["Sat"])
                    idx++;
                }

            })
            it('Should return empty when not array', () => {
                let sortedQs = ScheduleHandler.getTemporalOrderArray("lol", 1);
                assert(Array.isArray(sortedQs));
                expect(sortedQs.length).to.equal(0)
            })
            it('Should return empty when array empty', () => {
                let sortedQs = ScheduleHandler.getTemporalOrderArray([], 1);
                assert(Array.isArray(sortedQs));
                expect(sortedQs.length).to.equal(0)
            })
        })
        describe('Rotating temporal array', () => {
            let testQs = [
                {
                    "qId": "test1",
                    "atTime": "09:00",
                    "onDays": ["Sun"]
                },
                {
                    "qId": "test2",
                    "atTime": "18:00",
                    "onDays": ["Sun"]
                },
                {
                    "qId": "test3",
                    "atTime": "12:00",
                    "onDays": ["Mon"]
                },
                {
                    "qId": "test4",
                    "atTime": "19:00",
                    "onDays": ["Mon"]
                },
                {
                    "qId": "test5",
                    "atTime": "09:00",
                    "onDays": ["Thu"]
                },
                {
                    "qId": "test6",
                    "atTime": "17:00",
                    "onDays": ["Fri"]
                },
                {
                    "qId": "test7",
                    "atTime": "21:00",
                    "onDays": ["Sat"]
                },
                {
                    "qId": "test8",
                    "atTime": "07:00",
                    "onDays": ["Sun"]
                }

            ]
            it('Should return correct ordering - 1', () => {
                let date = moment.tz("2022-05-22 07:59:59", 'Europe/Berlin');
                let copyQs = JSON.parse(JSON.stringify(testQs));
                let shiftedQs = ScheduleHandler.shiftTemporalOrderArray(copyQs, date);
                expect(shiftedQs).to.eql(copyQs);
                expect(shiftedQs.length).to.equal(testQs.length);
                expect(shiftedQs[0].qId).to.equal("test1")
            })
            it('Should return correct ordering - 2', () => {
                let date = moment.tz("2022-05-23 16:59:59", 'Europe/Berlin');
                let copyQs = JSON.parse(JSON.stringify(testQs));
                let shiftedQs = ScheduleHandler.shiftTemporalOrderArray(copyQs, date);
                expect(shiftedQs).to.eql(copyQs);
                expect(shiftedQs.length).to.equal(testQs.length);
                expect(shiftedQs[0].qId).to.equal("test4")
            })
            it('Should return correct ordering - wrap around', () => {
                let date = moment.tz("2022-05-22 04:59:59", 'Europe/Berlin');
                let copyQs = JSON.parse(JSON.stringify(testQs));
                let shiftedQs = ScheduleHandler.shiftTemporalOrderArray(copyQs, date);
                expect(shiftedQs).to.eql(copyQs);
                expect(shiftedQs.length).to.equal(testQs.length);
                expect(shiftedQs[0].qId).to.equal("test8")
            })
            it('Should return empty when not array', () => {
                let sortedQs = ScheduleHandler.shiftTemporalOrderArray("lol", new Date());
                assert(Array.isArray(sortedQs));
                expect(sortedQs.length).to.equal(0)
            })
            it('Should return empty when array empty', () => {
                let sortedQs = ScheduleHandler.shiftTemporalOrderArray([], new Date());
                assert(Array.isArray(sortedQs));
                expect(sortedQs.length).to.equal(0)
            })

        })

    });
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
        it('Should add experiment ID mappings and add two subjects', async () => {
            await idMaps.addExperiment(testConfig.experimentId);
            // await idMaps.addExperiment(failConfig.experimentId);

            await idMaps.addIDMapping(testConfig.experimentId, "12455", testId)
            await idMaps.addIDMapping(testConfig.experimentId, "12345", testId2)
            await idMaps.addIDMapping(testConfig.experimentId, "12346", testId3)

            // await idMaps.addIDMapping(failConfig.experimentId, "12355", testId)
            // await idMaps.addIDMapping(failConfig.experimentId, "12345", testId2)

            let exp1 = await idMaps.getExperiment(testConfig.experimentId)
            // let exp2 = await idMaps.getExperiment(failConfig.experimentId)

            expect(exp1.IDMappings.length).to.equal(3)
            // expect(exp2.IDMappings.length).to.equal(2)
        })
        it('Should add and update participant parameter', async () => {

            await participants.add(testId);
            await participants.initializeParticipant(testId, testConfig);
            await participants.updateParameter(testId, "timezone", "Europe/Berlin")
            var participant = await participants.get(testId);
            expect(participant).to.not.be.null;
            expect(participant.uniqueId).to.equal(testId);
            expect(participant.parameters.language).to.equal("English");
            expect(participant.experimentId).to.equal(testConfig.experimentId)
            expect(participant.parameters.timezone).to.equal("Europe/Berlin");


        });
        it('Should add and update participant parameter 2', async () => {

            await participants.add(testId2);
            await participants.initializeParticipant(testId2, testConfig);
            await participants.updateParameter(testId2, "timezone", "Europe/Berlin")
            var participant = await participants.get(testId2);
            expect(participant).to.not.be.null;
            expect(participant.uniqueId).to.equal(testId2);
            expect(participant.parameters.language).to.equal("English");
            expect(participant.experimentId).to.equal(testConfig.experimentId)
            expect(participant.parameters.timezone).to.equal("Europe/Berlin");


        });
        it('Should add and update participant parameter 3', async () => {

            await participants.add(testId3);
            await participants.initializeParticipant(testId3, testConfig);
            await participants.updateParameter(testId3, "timezone", "Europe/Berlin")
            var participant = await participants.get(testId3);
            expect(participant).to.not.be.null;
            expect(participant.uniqueId).to.equal(testId3);
            expect(participant.parameters.language).to.equal("English");
            expect(participant.experimentId).to.equal(testConfig.experimentId)
            expect(participant.parameters.timezone).to.equal("Europe/Berlin");


        });
    })

    let DBHasJob = (jobArray, jobId) => {
        let foundJob = false;
        for(let i = 0; i < jobArray.length; i++){
            if(jobArray[i]["jobId"] === jobId){
                foundJob = true;
                break;
            }
        }
        return foundJob;
    }

    const hours = 17;
    const mins = 0;
    const days = [1, 2]
    describe('Scheduling one new question correctly', () => {
        const questionInfo = {
            qId: 'morningQuestions.addGoal',
            atTime: '17:00',
            onDays: ["Mon", "Tue"],
            tz : "Europe/Berlin"
        };

        let returnObj, returnJob;
        it('Should succeed', async () => {
            returnObj = await ScheduleHandler.scheduleOneQuestion(testBot, testId, qHandler, questionInfo, testConfig, true)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        });
        it('Should return jobId and job', () => {
            returnJob = returnObj.data;
            assert("jobId" in returnJob);
            assert("job" in returnJob);
            indScheduledJobs.push(returnJob);
        });
        it('Should have job with correct times', () => {
            returnJob = returnObj.data.job;
            let recObj = returnJob.pendingInvocations[0].recurrenceRule;
            expect(recObj.dayOfWeek).to.eql(days);
            expect(recObj.hour).to.equal(hours);
            expect(recObj.minute).to.equal(mins);
            expect(recObj.tz).to.equal(questionInfo.tz);
        });
        it('Should save job to scheduledOperations', () => {
            let returnJobId = returnObj.data.jobId;
            let savedJob = ScheduleHandler.scheduledOperations["questions"][returnJobId];
            expect(savedJob).to.eql(returnJob);
        });
        it('Should write job to database', async () => {
            let participant = await participants.get(testId);
            let scheduledQs = participant.scheduledOperations["questions"];

            let scheduledQ = scheduledQs[scheduledQs.length - 1];
            expect(scheduledQ.jobId).to.equal(returnObj.data.jobId);
            expect(scheduledQ.qId).to.equal(questionInfo.qId);
            expect(scheduledQ.atTime).to.equal(questionInfo.atTime);
            expect(scheduledQ.onDays).to.eql(questionInfo.onDays);
        });
    });

    describe('Scheduling one new question correctly - participant 2', () => {
        const questionInfo = {
            qId: 'morningQuestions.addGoal',
            atTime: '17:00',
            onDays: ["Mon", "Tue"]
        };

        let returnObj, returnJob;
        it('Should succeed', async () => {
            returnObj = await ScheduleHandler.scheduleOneQuestion(testBot, testId2, qHandler, questionInfo, testConfig, true)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        });
        it('Should return jobId and job', () => {
            returnJob = returnObj.data;
            assert("jobId" in returnJob);
            assert("job" in returnJob);
            indScheduledJobs.push(returnJob);
        });
        it('Should have job with correct times', () => {
            returnJob = returnObj.data.job;
            let recObj = returnJob.pendingInvocations[0].recurrenceRule;
            expect(recObj.dayOfWeek).to.eql(days);
            expect(recObj.hour).to.equal(hours);
            expect(recObj.minute).to.equal(mins);
            expect(recObj.tz).to.be.undefined;
        });
        it('Should save job to scheduledOperations', () => {
            let returnJobId = returnObj.data.jobId;
            let savedJob = ScheduleHandler.scheduledOperations["questions"][returnJobId];
            expect(savedJob).to.eql(returnJob);
        });
        it('Should write job to database', async () => {
            let participant = await participants.get(testId2);
            let scheduledQs = participant.scheduledOperations["questions"];

            let scheduledQ = scheduledQs[scheduledQs.length - 1];
            expect(scheduledQ.jobId).to.equal(returnObj.data.jobId);
            expect(scheduledQ.qId).to.equal(questionInfo.qId);
            expect(scheduledQ.atTime).to.equal(questionInfo.atTime);
            expect(scheduledQ.onDays).to.eql(questionInfo.onDays);
        });
    });

    describe('Scheduling multiple new questions correctly - participant 3', () => {
        let newHours = [15,16]
        const questionInfos = [
            {
                qId: 'morningQuestions.mainGoal',
                atTime: '15:00',
                onDays: ["Mon", "Tue"],
                tz : "Europe/Berlin"
            },
            {
                qId: 'morningQuestions.mainGoal',
                atTime: '16:00',
                onDays: ["Mon", "Tue"],
                tz : "Europe/Berlin"
            }
        ];

        let returnObj, returnJobs;
        it('Should succeed', async () => {
            let part = await participants.get(testId3);
            returnObj = await ScheduleHandler.scheduleMultipleQuestions(testBot, part, testChatId, qHandler, questionInfos, testConfig, true)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        });
        it('Should return list of jobId and job', () => {
            returnJobs = returnObj.data;
            returnJobs.forEach(job => {
                assert("jobId" in job);
                assert("job" in job);
            })
        });
        it('Should have jobs with correct times', () => {
            for(let i = 0; i < returnJobs.length; i++){
                let recObj = returnJobs[i].job.pendingInvocations[0].recurrenceRule;
                expect(recObj.dayOfWeek).to.eql(days);
                expect(recObj.hour).to.equal(newHours[i]);
                expect(recObj.minute).to.equal(mins);
                expect(recObj.tz).to.equal(questionInfos[0].tz);
            }
        });
        it('Should save job to scheduledOperations', () => {
            for(let i = 0; i < returnJobs.length; i++){
                let savedJob = ScheduleHandler.scheduledOperations["questions"][returnJobs[i].jobId];
                expect(savedJob).to.eql(returnJobs[i].job);
            }
        });
        it('Should write job to database', async () => {
            let participant = await participants.get(testId3);
            let scheduledQs = participant.scheduledOperations["questions"];

            returnJobs.forEach(job => {
                console.log(job.jobId)
                assert(DBHasJob(scheduledQs, job.jobId))
            })
        });
    });
    describe('Scheduling multiple old questions correctly - participant 3', () => {
        let newHours = [15,16]
        const questionInfos = [
            {
                qId: 'morningQuestions.addGoal',
                atTime: '15:00',
                onDays: ["Mon", "Tue"],
                tz : "Europe/Berlin"
            },
            {
                qId: 'morningQuestions.addGoal',
                atTime: '16:00',
                onDays: ["Mon", "Tue"],
                tz : "Europe/Berlin"
            }
        ];

        let returnObj, returnJobs;
        it('Should succeed', async () => {
            let part = await participants.get(testId3);
            returnObj = await ScheduleHandler.scheduleMultipleQuestions(testBot, part, testChatId, qHandler, questionInfos, testConfig, false)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        });
        it('Should return list of jobId and job', () => {
            returnJobs = returnObj.data;
            returnJobs.forEach(job => {
                assert("jobId" in job);
                assert("job" in job);
            })
        });
        it('Should have jobs with correct times', () => {
            for(let i = 0; i < returnJobs.length; i++){
                let recObj = returnJobs[i].job.pendingInvocations[0].recurrenceRule;
                expect(recObj.dayOfWeek).to.eql(days);
                expect(recObj.hour).to.equal(newHours[i]);
                expect(recObj.minute).to.equal(mins);
                expect(recObj.tz).to.equal(questionInfos[0].tz);
            }
        });
        it('Should save job to scheduledOperations', () => {
            for(let i = 0; i < returnJobs.length; i++){
                let savedJob = ScheduleHandler.scheduledOperations["questions"][returnJobs[i].jobId];
                expect(savedJob).to.eql(returnJobs[i].job);
            }
        });
        it('Should not write job to database', async () => {
            let participant = await participants.get(testId3);
            let scheduledQs = participant.scheduledOperations["questions"];

            returnJobs.forEach(job => {
                assert(!DBHasJob(scheduledQs, job.jobId))
            })
        });
    });
    describe('Scheduling one old question correctly', () => {
        const questionInfo = {
            qId: 'eveningQuestions.focus',
            atTime: '17:00',
            onDays: ["Mon", "Tue"],
            tz : "US/Pacific"
        };

        let returnObj, returnJob;
        it('Should succeed', async () => {
            returnObj = await ScheduleHandler.scheduleOneQuestion(testBot, testId, qHandler, questionInfo, testConfig, false)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        });
        it('Should return jobId and job', () => {
            returnJob = returnObj.data;
            assert("jobId" in returnJob);
            assert("job" in returnJob);
            indScheduledJobs.push(returnJob);
        });
        it('Should have job with correct times', () => {
            returnJob = returnObj.data.job;
            let recObj = returnJob.pendingInvocations[0].recurrenceRule;
            expect(recObj.dayOfWeek).to.eql(days);
            expect(recObj.hour).to.equal(hours);
            expect(recObj.minute).to.equal(mins);
            expect(recObj.tz).to.equal(questionInfo.tz);
        });
        it('Should save job to scheduledOperations', () => {
            let returnJobId = returnObj.data.jobId;
            let savedJob = ScheduleHandler.scheduledOperations["questions"][returnJobId];
            expect(savedJob).to.eql(returnJob);
        });
        it('Should not write job to database', async () => {
            let participant = await participants.get(testId);
            let scheduledQs = participant.scheduledOperations["questions"];

            let scheduledQ = scheduledQs[scheduledQs.length - 1];
            expect(scheduledQ.jobId).to.not.equal(returnObj.data.jobId);
            expect(scheduledQs.length).to.equal(1);
        });
    });

    describe('Scheduling one new action correctly', () => {
        const actionInfo = {
            aType: 'clearVar',
            args: ["testStr"],
            atTime: '17:00',
            onDays: ["Mon", "Tue"],
            tz : "Europe/Berlin"
        };

        let returnObj, returnJob;
        it('Should succeed', async () => {
            returnObj = await ScheduleHandler.scheduleOneAction(testBot, testId, actionInfo, testConfig, true)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        });
        it('Should return jobId and job', () => {
            returnJob = returnObj.data;
            assert("jobId" in returnJob);
            assert("job" in returnJob);
            indScheduledJobs.push(returnJob);
        });
        it('Should have job with correct times', () => {
            returnJob = returnObj.data.job;
            let recObj = returnJob.pendingInvocations[0].recurrenceRule;
            expect(recObj.dayOfWeek).to.eql(days);
            expect(recObj.hour).to.equal(hours);
            expect(recObj.minute).to.equal(mins);
            expect(recObj.tz).to.equal(actionInfo.tz);
        });
        it('Should save job to scheduledOperations', () => {
            let returnJobId = returnObj.data.jobId;
            let savedJob = ScheduleHandler.scheduledOperations["actions"][returnJobId];
            expect(savedJob).to.eql(returnJob);
        });
        it('Should write job to database', async () => {
            let participant = await participants.get(testId);
            let scheduledQs = participant.scheduledOperations["actions"];

            let scheduledQ = scheduledQs[scheduledQs.length - 1];
            expect(scheduledQ.jobId).to.equal(returnObj.data.jobId);
            expect(scheduledQ.aType).to.equal(actionInfo.aType);
            expect(scheduledQ.args).to.eql(actionInfo.args);
            expect(scheduledQ.atTime).to.equal(actionInfo.atTime);
            expect(scheduledQ.onDays).to.eql(actionInfo.onDays);
        });
    });

    describe('Scheduling one new action correctly - participant 2', () => {
        const actionInfo = {
            aType: 'clearVar',
            args: ["testStr"],
            atTime: '17:00',
            onDays: ["Mon", "Tue"]
        };

        let returnObj, returnJob;
        it('Should succeed', async () => {
            returnObj = await ScheduleHandler.scheduleOneAction(testBot, testId2, actionInfo, testConfig, true)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        });
        it('Should return jobId and job', () => {
            returnJob = returnObj.data;
            assert("jobId" in returnJob);
            assert("job" in returnJob);
            indScheduledJobs.push(returnJob);
        });
        it('Should have job with correct times', () => {
            returnJob = returnObj.data.job;
            let recObj = returnJob.pendingInvocations[0].recurrenceRule;
            expect(recObj.dayOfWeek).to.eql(days);
            expect(recObj.hour).to.equal(hours);
            expect(recObj.minute).to.equal(mins);
            expect(recObj.tz).to.be.undefined;

        });
        it('Should save job to scheduledOperations', () => {
            let returnJobId = returnObj.data.jobId;
            let savedJob = ScheduleHandler.scheduledOperations["actions"][returnJobId];
            expect(savedJob).to.eql(returnJob);
        });
        it('Should write job to database', async () => {
            let participant = await participants.get(testId2);
            let scheduledQs = participant.scheduledOperations["actions"];

            let scheduledQ = scheduledQs[scheduledQs.length - 1];
            expect(scheduledQ.jobId).to.equal(returnObj.data.jobId);
            expect(scheduledQ.qId).to.equal(actionInfo.qId);
            expect(scheduledQ.atTime).to.equal(actionInfo.atTime);
            expect(scheduledQ.onDays).to.eql(actionInfo.onDays);
            expect(scheduledQ.args).to.eql(actionInfo.args);
        });
    });

    describe('Scheduling one old action correctly', () => {
        const actionInfo = {
            aType: 'clearVar',
            args: ["testNum"],
            atTime: '17:00',
            onDays: ["Mon", "Tue"]
        };

        let returnObj, returnJob;
        it('Should succeed', async () => {
            // Difference: setting isNew here to false
            returnObj = await ScheduleHandler.scheduleOneAction(testBot, testId, actionInfo, testConfig, false)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        });
        it('Should return jobId and job', () => {
            returnJob = returnObj.data;
            assert("jobId" in returnJob);
            assert("job" in returnJob);
            indScheduledJobs.push(returnJob);
        });
        it('Should have job with correct times', () => {
            returnJob = returnObj.data.job;
            let recObj = returnJob.pendingInvocations[0].recurrenceRule;
            expect(recObj.dayOfWeek).to.eql(days);
            expect(recObj.hour).to.equal(hours);
            expect(recObj.minute).to.equal(mins);
            expect(recObj.tz).to.be.undefined;

        });
        it('Should save job to scheduledOperations', () => {
            let returnJobId = returnObj.data.jobId;
            let savedJob = ScheduleHandler.scheduledOperations["actions"][returnJobId];
            expect(savedJob).to.eql(returnJob);
        });
        it('Should not write job to database', async () => {
            let participant = await participants.get(testId);
            let scheduledQs = participant.scheduledOperations["actions"];

            let scheduledQ = scheduledQs[scheduledQs.length - 1];
            expect(scheduledQ.jobId).to.not.equal(returnObj.data.jobId);
            expect(scheduledQs.length).to.equal(1);
        });
    });

    describe('Scheduling multiple new actions correctly - participant 3', () => {
        let newHours = [15,16]

        const actionInfos = [
            {
                aType: 'clearVar',
                args: ["testStr"],
                atTime: '15:00',
                onDays: ["Mon", "Tue"],
                tz : "Europe/Berlin"
            },
            {
                aType: 'clearVar',
                args: ["testStr"],
                atTime: '16:00',
                onDays: ["Mon", "Tue"],
                tz : "Europe/Berlin"
            }
        ];

        let returnObj, returnJobs;
        it('Should succeed', async () => {
            returnObj = await ScheduleHandler.scheduleMultipleActions(testBot, testId3, testChatId, actionInfos, testConfig, true)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        });
        it('Should return list of jobId and job', () => {
            returnJobs = returnObj.data;
            returnJobs.forEach(job => {
                assert("jobId" in job);
                assert("job" in job);
            })
        });
        it('Should have jobs with correct times', () => {
            for(let i = 0; i < returnJobs.length; i++){
                let recObj = returnJobs[i].job.pendingInvocations[0].recurrenceRule;
                expect(recObj.dayOfWeek).to.eql(days);
                expect(recObj.hour).to.equal(newHours[i]);
                expect(recObj.minute).to.equal(mins);
                expect(recObj.tz).to.equal(actionInfos[0].tz);
            }
        });
        it('Should save job to scheduledOperations', () => {
            for(let i = 0; i < returnJobs.length; i++){
                let savedJob = ScheduleHandler.scheduledOperations["actions"][returnJobs[i].jobId];
                expect(savedJob).to.eql(returnJobs[i].job);
            }
        });
        it('Should write job to database', async () => {
            let participant = await participants.get(testId3);
            let scheduledQs = participant.scheduledOperations["actions"];

            returnJobs.forEach(job => {
                console.log(job.jobId)
                assert(DBHasJob(scheduledQs, job.jobId))
            })
        });
    });
    describe('Scheduling multiple old actions correctly - participant 3', () => {
        let newHours = [15,16]

        const actionInfos = [
            {
                aType: 'clearVar',
                args: ["testNum"],
                atTime: '15:00',
                onDays: ["Mon", "Tue"],
                tz : "Europe/Berlin"
            },
            {
                aType: 'clearVar',
                args: ["testNum"],
                atTime: '16:00',
                onDays: ["Mon", "Tue"],
                tz : "Europe/Berlin"
            }
        ];

        let returnObj, returnJobs;
        it('Should succeed', async () => {
            returnObj = await ScheduleHandler.scheduleMultipleActions(
                testBot, testId3, testChatId, actionInfos, testConfig, false)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        });
        it('Should return list of jobId and job', () => {
            returnJobs = returnObj.data;
            returnJobs.forEach(job => {
                assert("jobId" in job);
                assert("job" in job);
            })
        });
        it('Should have jobs with correct times', () => {
            for(let i = 0; i < returnJobs.length; i++){
                let recObj = returnJobs[i].job.pendingInvocations[0].recurrenceRule;
                expect(recObj.dayOfWeek).to.eql(days);
                expect(recObj.hour).to.equal(newHours[i]);
                expect(recObj.minute).to.equal(mins);
                expect(recObj.tz).to.equal(actionInfos[0].tz);
            }
        });
        it('Should save job to scheduledOperations', () => {
            for(let i = 0; i < returnJobs.length; i++){
                let savedJob = ScheduleHandler.scheduledOperations["actions"][returnJobs[i].jobId];
                expect(savedJob).to.eql(returnJobs[i].job);
            }
        });
        it('Should write job to database', async () => {
            let participant = await participants.get(testId3);
            let scheduledQs = participant.scheduledOperations["actions"];

            returnJobs.forEach(job => {
                assert(!DBHasJob(scheduledQs, job.jobId))
            })
        });
    });


    /**
     * Questions
     *  DB:
     *      Participant 1:
     *          morningQuestions.addGoal (independently, new question)
     *
     *      Participant 2:
     *          morningQuestions.addGoal (independently, new question)
     *
     *      Participant 3:
     *          morningQuestions.mainGoal 15 (new question, multiple)
     *          morningQuestions.mainGoal 16 (new question, multiple)
     *
     *  ScheduleJobs:
     *      Participant 1:
     *          morningQuestions.addGoal (independently, new question)
     *          eveningQuestions.focus (independently, old question)
     *      Participant 2:
     *          morningQuestions.addGoal (independently, new question)
     *      Participant 3:
     *          morningQuestions.mainGoal 15 (new question, multiple)
     *          morningQuestions.mainGoal 16 (new question, multiple)
     *          morningQuestions.addGoal 15 (old question, multiple)
     *          morningQuestions.addGoal 16 (old question, multiple)
     *
     * Actions:
     *  DB:
     *      Participant 1:
     *          clearVar testStr (independently, new question)
     *
     *      Participant 2:
     *          clearVar testStr (independently, new question)
     *
     *      Participant 3:
     *          clearVar testStr 15 (new action, multiple)
     *          clearVar testStr 16 (new action, multiple)
     *
     *  ScheduleJobs:
     *      Participant 1:
     *          clearVar testStr (independently, new question)
     *          clearVar testNum (independently, old question)
     *      Participant 2:
     *          clearVar testStr (independently, new question)
     *
     *      Participant 3:
     *          clearVar testStr 15 (new action, multiple)
     *          clearVar testStr 16 (new action, multiple)
     *          clearVar testNum 15 (old action, multiple)
     *          clearVar testNum 16 (old action, multiple)
     */

    describe('Scheduling question incorrectly', () => {

        let returnObj;
        it('Should fail with non-existent qId', async () => {
            const questionInfo = {
                qId: 'morningQuestions.purple',
                atTime: '10:00',
                onDays: ["Mon", "Tue"]
            };
            returnObj = await ScheduleHandler.scheduleOneQuestion(testBot, testId, qHandler, questionInfo, failConfig, false)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        });
        it('Should fail without qId', async () => {
            const questionInfo = {
                atTime: '10:00',
                onDays: ["Mon", "Tue"]
            };
            returnObj = await ScheduleHandler.scheduleOneQuestion(testBot, testId, qHandler, questionInfo, failConfig, false)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        });
        it('Should fail with incorrect time format', async () => {
            const questionInfo = {
                qId: 'morningQuestions.mainGoal',
                atTime: '1000',
                onDays: ["Mon", "Tue"]
            };
            returnObj = await ScheduleHandler.scheduleOneQuestion(testBot, testId, qHandler, questionInfo, failConfig, false)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        });
        it('Should fail with incorrect time format 2', async () => {
            const questionInfo = {
                qId: 'morningQuestions.mainGoal',
                atTime: 'beans',
                onDays: ["Mon", "Tue"]
            };
            returnObj = await ScheduleHandler.scheduleOneQuestion(testBot, testId, qHandler, questionInfo, failConfig, false)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        });
        it('Should fail without time', async () => {
            const questionInfo = {
                qId: 'morningQuestions.mainGoal',
                onDays: ["Mon", "Tue"]
            };
            returnObj = await ScheduleHandler.scheduleOneQuestion(testBot, testId, qHandler, questionInfo, failConfig, false)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        });
        it('Should fail with incorrect day', async () => {
            const questionInfo = {
                qId: 'morningQuestions.mainGoal',
                atTime: '10:00',
                onDays: ["Mon", "Frog"]
            };
            returnObj = await ScheduleHandler.scheduleOneQuestion(testBot, testId, qHandler, questionInfo, failConfig, false)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        });
        it('Should fail without on days', async () => {
            const questionInfo = {
                qId: 'morningQuestions.mainGoal',
                atTime: '10:00'
            };
            returnObj = await ScheduleHandler.scheduleOneQuestion(testBot, testId, qHandler, questionInfo, failConfig, false)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        });

    });
    describe('Scheduling actions incorrectly', () => {

        let returnObj;
        it('Should fail without aType', async () => {
            const actionInfo = {
                args: ["testStr"],
                atTime: '10:00',
                onDays: ["Mon", "Tue"]
            };
            returnObj = await ScheduleHandler.scheduleOneAction(testBot, testId, actionInfo, failConfig, false)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        });

        it('Should fail with incorrect time format', async () => {
            const actionInfo = {
                aType: 'clearVar',
                args: ["testStr"],
                atTime: '1000',
                onDays: ["Mon", "Tue"]
            };
            returnObj = await ScheduleHandler.scheduleOneAction(testBot, testId, actionInfo, failConfig, false)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        });
        it('Should fail with incorrect time format 2', async () => {
            const actionInfo = {
                aType: 'clearVar',
                args: ["testStr"],
                atTime: 'beans',
                onDays: ["Mon", "Tue"]
            };
            returnObj = await ScheduleHandler.scheduleOneAction(testBot, testId, actionInfo, failConfig, false)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        });
        it('Should fail without time', async () => {
            const actionInfo = {
                aType: 'clearVar',
                args: ["testStr"],
                onDays: ["Mon", "Tue"]
            };
            returnObj = await ScheduleHandler.scheduleOneAction(testBot, testId, actionInfo, failConfig, false)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        });
        it('Should fail with incorrect day', async () => {
            const actionInfo = {
                aType: 'clearVar',
                args: ["testStr"],
                atTime: '10:00',
                onDays: ["Mon", "Frog"]
            };
            returnObj = await ScheduleHandler.scheduleOneAction(testBot, testId, actionInfo, failConfig, false)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        });
        it('Should fail without on days', async () => {
            const actionInfo = {
                aType: 'clearVar',
                args: ["testStr"],
                atTime: '10:00'
            };
            returnObj = await ScheduleHandler.scheduleOneAction(testBot, testId, actionInfo, failConfig, false)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        });

    });

})
    /**
     * Questions
     *  DB:
     *      Participant 1:
     *          morningQuestions.addGoal (independently, new question)
     *
     *      Participant 2:
     *          morningQuestions.addGoal (independently, new question)
     *
     *      Participant 3:
     *          morningQuestions.mainGoal 15 (new question, multiple)
     *          morningQuestions.mainGoal 16 (new question, multiple)
     *
     *  ScheduleJobs:
     *      Participant 1:
     *          morningQuestions.addGoal (independently, new question)
     *          eveningQuestions.focus (independently, old question)
     *      Participant 2:
     *          morningQuestions.addGoal (independently, new question)
     *      Participant 3:
     *          morningQuestions.mainGoal 15 (new question, multiple)
     *          morningQuestions.mainGoal 16 (new question, multiple)
     *          morningQuestions.addGoal 15 (old question, multiple)
     *          morningQuestions.addGoal 16 (old question, multiple)

     * Actions:
     *  DB:
     *      Participant 1:
     *          clearVar testStr (independently, new action)
     *
     *      Participant 2:
     *          clearVar testStr (independently, new action)
     *
     *      Participant 3:
     *          clearVar testStr 15 (new action, multiple)
     *          clearVar testStr 16 (new action, multiple)
     *  ScheduleJobs:
     *      Participant 1:
     *          clearVar testStr (independently, new action)
     *          clearVar testNum (independently, old action)
     *      Participant 2:
     *          clearVar testStr (independently, new action)
     *
     *      Participant 3:
     *          clearVar testStr 15 (new action, multiple)
     *          clearVar testStr 16 (new action, multiple)
     *          clearVar testNum 15 (old action, multiple)
     *          clearVar testNum 16 (old action, multiple)

     */

    let scheduleAllReturnObj;
    let DBHasJob = (jobArray, jobId) => {
        let foundJob = false;
        for(let i = 0; i < jobArray.length; i++){
            if(jobArray[i]["jobId"] === jobId){
                foundJob = true;
                break;
            }
        }
        return foundJob;
    }

let testPart = {
    uniqueId : testId,
    firstName : "Caleb",
    parameters : {
        language : "English",
        timezone : "Europe/Berlin"
    },
    stages : {
    },
    currentAnswer : ["beans"],
}
describe('Scheduling all', () => {
    describe('Scheduling all questions normally', () => {
        let actionList = [
            {
                aType : "incrementStageDay",
                atTime : "21:00",
                onDays : ["Mon", "Tue", "Wed"]
            },
            {
                aType : "addValueToVar",
                args : ["testNum", "$N{4}"],
                atTime : "19:00",
                onDays : ["Mon", "Tue", "Wed"]
            }];
        it('Should return success', async () => {
            scheduleAllReturnObj = await ScheduleHandler.scheduleAllOperations(
                testBot, testPart, testConfig, actionList,false);
            expect(scheduleAllReturnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        });
        it('Should return list of scheduled jobs', () => {
            assert(Array.isArray(scheduleAllReturnObj.data));
            expect(scheduleAllReturnObj.data.length).to.equal(4);

        })
        it('Should have added jobs to scheduled operations',  () => {
            // Questions
            for(let i = 0; i < scheduleAllReturnObj.data.length - actionList.length; i++){
                let jobId = scheduleAllReturnObj.data[i]["jobId"];
                let job = scheduleAllReturnObj.data[i]["job"];
                assert(jobId in ScheduleHandler.scheduledOperations["questions"]);
                expect(job).to.eql(ScheduleHandler.scheduledOperations["questions"][jobId]);
            }
            // Actions
            for(let i = scheduleAllReturnObj.data.length - actionList.length; i < scheduleAllReturnObj.data.length; i++){
                let jobId = scheduleAllReturnObj.data[i]["jobId"];
                let job = scheduleAllReturnObj.data[i]["job"];
                assert(jobId in ScheduleHandler.scheduledOperations["actions"]);
                expect(job).to.eql(ScheduleHandler.scheduledOperations["actions"][jobId]);
            }
        });
        it('Should have added jobs to database', async () => {
            let participant = await participants.get(testId);
            let scheduledQs = participant.scheduledOperations.questions;
            let scheduledAs = participant.scheduledOperations.actions;
            for(let i = 0; i < scheduleAllReturnObj.data.length - actionList.length; i++){
                let jobId = scheduleAllReturnObj.data[i]["jobId"];
                assert(DBHasJob(scheduledQs,jobId));
            }
            for(let i = scheduleAllReturnObj.data.length - actionList.length; i < scheduleAllReturnObj.data.length; i++){
                let jobId = scheduleAllReturnObj.data[i]["jobId"];
                assert(DBHasJob(scheduledAs,jobId));
            }

        });
        it('Should have added jobs to debug list', async () => {
            assert(testId in ScheduleHandler.debugQueue);
            assert(testId in ScheduleHandler.debugQueueAdjusted)
            assert(Array.isArray(ScheduleHandler.debugQueue[testId]));
            assert(typeof ScheduleHandler.debugQueueAdjusted[testId] === "boolean");

        });
    })

    /**
     * Questions
     *  DB:
     *      Participant 1:
     *          morningQuestions.addGoal (independently, new question)
     *          morningQuestions.mainGoal (scheduleAll, new question)
     *          eveningQuestions.numGoals (scheduleAll, new question)
     *      Participant 2:
     *          morningQuestions.addGoal (independently, new question)
     *
     *      Participant 3:
     *          morningQuestions.mainGoal 15 (new question, multiple)
     *          morningQuestions.mainGoal 16 (new question, multiple)
     *
     *  ScheduleJobs:
     *      Participant 1:
     *          morningQuestions.addGoal (independently, new question)
     *          eveningQuestions.focus (independently, old question)
     *          morningQuestions.mainGoal (scheduleAll, new question)
     *          eveningQuestions.numGoals (scheduleAll, new question)
     *      Participant 2:
     *          morningQuestions.addGoal (independently, new question)
     *
     *      Participant 3:
     *          morningQuestions.mainGoal 15 (new question, multiple)
     *          morningQuestions.mainGoal 16 (new question, multiple)
     *          morningQuestions.addGoal 15 (old question, multiple)
     *          morningQuestions.addGoal 16 (old question, multiple)

     *
     * Actions:
     *  DB:
     *      Participant 1:
     *          clearVar testStr (independently, new action)
     *          incrementStageDay (scheduleAll, new action)
     *          addValueToVar testNum $N{4} (scheduleAll, new action)
     *
     *      Participant 2:
     *          clearVar testStr (independently, new action)
     *
     *      Participant 3:
     *          clearVar testStr 15 (new action, multiple)
     *          clearVar testStr 16 (new action, multiple)
     *
     *  ScheduleJobs:
     *      Participant 1:
     *          clearVar testStr (independently, new action)
     *          clearVar testNum (independently, old action)
     *          incrementStageDay (scheduleAll, new action)
     *          addValueToVar testNum $N{4} (scheduleAll, new action)
     *
     *      Participant 2:
     *          clearVar testStr (independently, new action)
     *
     *      Participant 3:
     *          clearVar testStr 15 (new action, multiple)
     *          clearVar testStr 16 (new action, multiple)
     *          clearVar testNum 15 (old action, multiple)
     *          clearVar testNum 16 (old action, multiple)

     */

})
describe('Cancelling + removing ', () => {
    describe('Cancelling jobs', () => {
        // Cancelling the jobs scheduled through scheduleAll
        it('Should cancel + delete question job, but not from DB - 1', async () => {
            let jobId = scheduleAllReturnObj.data[0]["jobId"];
            assert(jobId in ScheduleHandler.scheduledOperations["questions"]);
            let cancelReturnObj = ScheduleHandler.cancelJobByID(jobId, "questions");

            let participant = await participants.get(testId);
            expect(cancelReturnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(!(jobId in ScheduleHandler.scheduledOperations["questions"]));
            assert(DBHasJob(participant.scheduledOperations["questions"], jobId));
        })
        it('Should cancel + delete question job, but not from DB - 2', async () => {
            let jobId = scheduleAllReturnObj.data[1]["jobId"];
            assert(jobId in ScheduleHandler.scheduledOperations["questions"]);
            let cancelReturnObj = ScheduleHandler.cancelJobByID(jobId, "questions");
            let participant = await participants.get(testId);
            expect(cancelReturnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(!(jobId in ScheduleHandler.scheduledOperations["questions"]));
            assert(DBHasJob(participant.scheduledOperations["questions"], jobId));
        })
        // Cancel second participant's independently scheduled job
        it('Should cancel + delete question job, but not from DB - 3', async () => {
            let jobId = indScheduledJobs[1]["jobId"];
            assert(jobId in ScheduleHandler.scheduledOperations["questions"]);
            let cancelReturnObj = ScheduleHandler.cancelJobByID(jobId, "questions");
            let participant = await participants.get(testId2);
            expect(cancelReturnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(!(jobId in ScheduleHandler.scheduledOperations["questions"]));
            assert(DBHasJob(participant.scheduledOperations["questions"], jobId));
        })
        // Cancelling the action jobs scheduled through scheduleAll
        it('Should cancel + delete action job, but not from DB - 1', async () => {
            let jobId = scheduleAllReturnObj.data[2]["jobId"];
            assert(jobId in ScheduleHandler.scheduledOperations["actions"]);
            let cancelReturnObj = ScheduleHandler.cancelJobByID(jobId, "actions");

            let participant = await participants.get(testId);
            expect(cancelReturnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(!(jobId in ScheduleHandler.scheduledOperations["actions"]));
            assert(DBHasJob(participant.scheduledOperations["actions"], jobId));
        })
        it('Should cancel + delete action job, but not from DB - 2', async () => {
            let jobId = scheduleAllReturnObj.data[3]["jobId"];
            assert(jobId in ScheduleHandler.scheduledOperations["actions"]);
            let cancelReturnObj = ScheduleHandler.cancelJobByID(jobId, "actions");
            let participant = await participants.get(testId);
            expect(cancelReturnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(!(jobId in ScheduleHandler.scheduledOperations["actions"]));
            assert(DBHasJob(participant.scheduledOperations["actions"], jobId));
        })
        // Cancel second participant's independently scheduled job
        it('Should cancel + delete action job, but not from DB - 3', async () => {
            let jobId = indScheduledJobs[4]["jobId"];
            assert(jobId in ScheduleHandler.scheduledOperations["actions"]);
            let cancelReturnObj = ScheduleHandler.cancelJobByID(jobId, "actions");
            let participant = await participants.get(testId2);
            expect(cancelReturnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(!(jobId in ScheduleHandler.scheduledOperations["actions"]));
            assert(DBHasJob(participant.scheduledOperations["actions"], jobId));
        })
    });
    describe('Cancelling all jobs for a participant', () => {
        // Cancelling all the jobs scheduled for participant 3
        let cancelAllReturnObj;
        it('Should return success', async() => {
            cancelAllReturnObj = await ScheduleHandler.cancelAllJobsForParticipant(testId3);
            expect(cancelAllReturnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(cancelAllReturnObj.data.length).to.equal(8)
        })
        it('Should cancel + delete all jobs from local store', async () => {
            for(let i = 0; i < cancelAllReturnObj.data.length; i++){
                assert(
                    !(
                        cancelAllReturnObj.data[i] in ScheduleHandler.scheduledOperations["questions"]
                        || cancelAllReturnObj.data[i] in ScheduleHandler.scheduledOperations["actions"]
                    )
                )
            }
        })
        it('Should not have removed jobs from DB', async () => {
            let participant = await participants.get(testId3)
            expect(participant.scheduledOperations.questions.length).to.equal(2)
            expect(participant.scheduledOperations.actions.length).to.equal(2)
        })

    });

    /**
     * Questions
     *  DB:
     *      Participant 1:
     *          morningQuestions.addGoal (independently, new question)
     *          morningQuestions.mainGoal (scheduleAll, new question)
     *          eveningQuestions.numGoals (scheduleAll, new question)
     *      Participant 2:
     *          morningQuestions.addGoal (independently, new question)
     *
     *      Participant 3:
     *          morningQuestions.mainGoal 15 (new question, multiple)
     *          morningQuestions.mainGoal 16 (new question, multiple)
     *
     *  ScheduleJobs:
     *      Participant 1:
     *          morningQuestions.addGoal (independently, new question)
     *          eveningQuestions.focus (independently, old question)
     *
     *      Participant 2:
     *
     *      Participant 3:
     *
     * Actions:
     *  DB:
     *      Participant 1:
     *          clearVar testStr (independently, new action)
     *          incrementStageDay (scheduleAll, new action)
     *          addValueToVar testNum $N{4} (scheduleAll, new action)
     *
     *      Participant 2:
     *          clearVar testStr (independently, new action)
     *
     *      Participant 3:
     *           clearVar testStr 15 (new action, multiple)
     *           clearVar testStr 16 (new action, multiple)
     *
     *
     *  ScheduleJobs:
     *      Participant 1:
     *          clearVar testStr (independently, new action)
     *          clearVar testNum (independently, old action)
     *
     *      Participant 2:
     *
     *      Participant 3:
     */

    describe('Removing jobs', () => {

        // Remove independently scheduled jobs for participant 1
        // This job should be in the DB
        it('Should remove question job - 1', async () => {
            let jobId = indScheduledJobs[0]["jobId"];
            let participant = await participants.get(testId);

            assert(jobId in ScheduleHandler.scheduledOperations["questions"]);
            assert(DBHasJob(participant.scheduledOperations["questions"], jobId));

            let removeReturnObj = await ScheduleHandler.removeJobByID(jobId, "questions");
            participant = await participants.get(testId);

            expect(removeReturnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(!(jobId in ScheduleHandler.scheduledOperations["questions"]));
            assert(!DBHasJob(participant.scheduledOperations["questions"], jobId));
        })

        // This job should not be in the DB, because it was scheduled as an "old" operation
        it('Should remove question job - 2', async () => {
            let jobId = indScheduledJobs[2]["jobId"];
            let participant = await participants.get(testId);

            assert(jobId in ScheduleHandler.scheduledOperations["questions"]);
            assert(!DBHasJob(participant.scheduledOperations["questions"], jobId));

            let removeReturnObj = await ScheduleHandler.removeJobByID(jobId, "questions");
            participant = await participants.get(testId);

            expect(removeReturnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(!(jobId in ScheduleHandler.scheduledOperations["questions"]));
            assert(!DBHasJob(participant.scheduledOperations["questions"], jobId));
        })
        // This job should be in the DB
        it('Should remove action job - 1', async () => {
            let jobId = indScheduledJobs[3]["jobId"];
            let participant = await participants.get(testId);

            assert(jobId in ScheduleHandler.scheduledOperations["actions"]);
            assert(DBHasJob(participant.scheduledOperations["actions"], jobId));

            let removeReturnObj = await ScheduleHandler.removeJobByID(jobId, "actions");
            participant = await participants.get(testId);

            expect(removeReturnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(!(jobId in ScheduleHandler.scheduledOperations["actions"]));
            assert(!DBHasJob(participant.scheduledOperations["actions"], jobId));
        })

        // This job should not be in the DB, because it was scheduled as an "old" operation
        it('Should remove action job - 2', async () => {
            let jobId = indScheduledJobs[5]["jobId"];
            let participant = await participants.get(testId);

            assert(jobId in ScheduleHandler.scheduledOperations["actions"]);
            assert(!DBHasJob(participant.scheduledOperations["actions"], jobId));

            let removeReturnObj = await ScheduleHandler.removeJobByID(jobId, "actions");
            participant = await participants.get(testId);

            expect(removeReturnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(!(jobId in ScheduleHandler.scheduledOperations["actions"]));
            assert(!DBHasJob(participant.scheduledOperations["actions"], jobId));
        })
    });
})
    /**
     * Questions
     *  DB:
     *      Participant 1:
     *          morningQuestions.mainGoal (scheduleAll, new question)
     *          eveningQuestions.numGoals (scheduleAll, new question)
     *      Participant 2:
     *          morningQuestions.addGoal (independently, new question)
     *
     *      Participant 3:
     *          morningQuestions.mainGoal 15 (new question, multiple)
     *          morningQuestions.mainGoal 16 (new question, multiple)

     *  ScheduleJobs:
     *      Participant 1:
     *
     *      Participant 2:
     *
     *      Participant 3:
     *
     *
     * Actions:
     *  DB:
     *      Participant 1:
     *          incrementStageDay (scheduleAll, new action)
     *          addValueToVar testNum $N{4} (scheduleAll, new action)
     *
     *      Participant 2:
     *          clearVar testStr (independently, new action)
     *
     *      Participant 3:
     *          clearVar testStr 15 (new action, multiple)
     *          clearVar testStr 16 (new action, multiple)
     *  ScheduleJobs:
     *      Participant 1:
     *
     *      Participant 2:
     *
     *      Participant 3:
     *
     */
describe('Rescheduling', () => {
    // Reschedule all questions in DB only for participant 1
    describe('Rescheduling jobs for single participant', () => {
        let rescheduleReturnObj;
        it('Should return success and a list of scheduled jobs', async () => {
            rescheduleReturnObj = await ScheduleHandler.rescheduleAllOperationsForID(testBot, testId, testConfig);
            expect(rescheduleReturnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        });
        it('Should return list of rescheduled jobs', () => {
            assert(Array.isArray(rescheduleReturnObj.data));
            expect(rescheduleReturnObj.data.length).to.equal(4);
        })
        it('Should have added jobs to scheduled operations',  () => {
            for(let i = 0; i < rescheduleReturnObj.data.length; i++){
                let jobId = rescheduleReturnObj.data[i]["jobId"];
                let job = rescheduleReturnObj.data[i]["job"];
                // If not in questions, should be in actions
                try{
                    assert(jobId in ScheduleHandler.scheduledOperations["questions"]);
                    expect(job).to.eql(ScheduleHandler.scheduledOperations["questions"][jobId]);
                } catch(err){
                    assert(jobId in ScheduleHandler.scheduledOperations["actions"]);
                    expect(job).to.eql(ScheduleHandler.scheduledOperations["actions"][jobId]);
                }

            }
        });
        it('Should have retained jobs in database with the same jobIds', async () => {

            let participant = await participants.get(testId);
            let scheduledQs = participant.scheduledOperations.questions;
            let scheduledAs = participant.scheduledOperations.actions;
            for(let i = 0; i < rescheduleReturnObj.data.length; i++){
                let jobId = rescheduleReturnObj.data[i]["jobId"];
                // If not in questions, should be in actions
                try{
                    assert(DBHasJob(scheduledQs,jobId));
                } catch(err){
                    assert(DBHasJob(scheduledAs,jobId));
                }
            }
        });
        it('Should have added jobs to debug list', async () => {
            assert(testId in ScheduleHandler.debugQueue);
            assert(testId in ScheduleHandler.debugQueueAdjusted)
            assert(Array.isArray(ScheduleHandler.debugQueue[testId]));
            assert(typeof ScheduleHandler.debugQueueAdjusted[testId] === "boolean");
        });

    })
    describe('Rescheduling jobs for single participant at once', () => {
        let rescheduleReturnObj;
        it('Should return success and a list of scheduled jobs', async () => {
            rescheduleReturnObj = await ScheduleHandler.rescheduleAllOperationsForIDAtOnce(testBot, testId3, testConfig);
            expect(rescheduleReturnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        });
        it('Should return list of rescheduled jobs', () => {
            assert(Array.isArray(rescheduleReturnObj.data));
            expect(rescheduleReturnObj.data.length).to.equal(4);
        })
        it('Should have added jobs to scheduled operations',  () => {
            for(let i = 0; i < rescheduleReturnObj.data.length; i++){
                let jobId = rescheduleReturnObj.data[i]["jobId"];
                let job = rescheduleReturnObj.data[i]["job"];
                // If not in questions, should be in actions
                try{
                    assert(jobId in ScheduleHandler.scheduledOperations["questions"]);
                    expect(job).to.eql(ScheduleHandler.scheduledOperations["questions"][jobId]);
                } catch(err){
                    assert(jobId in ScheduleHandler.scheduledOperations["actions"]);
                    expect(job).to.eql(ScheduleHandler.scheduledOperations["actions"][jobId]);
                }

            }
        });
        it('Should have retained jobs in database with the same jobIds', async () => {

            let participant = await participants.get(testId3);
            let scheduledQs = participant.scheduledOperations.questions;
            let scheduledAs = participant.scheduledOperations.actions;
            for(let i = 0; i < rescheduleReturnObj.data.length; i++){
                let jobId = rescheduleReturnObj.data[i]["jobId"];
                // If not in questions, should be in actions
                try{
                    assert(DBHasJob(scheduledQs,jobId));
                } catch(err){
                    assert(DBHasJob(scheduledAs,jobId));
                }
            }
        });
        it('Should have added jobs to debug list', async () => {
            assert(testId in ScheduleHandler.debugQueue);
            assert(testId in ScheduleHandler.debugQueueAdjusted)
            assert(Array.isArray(ScheduleHandler.debugQueue[testId]));
            assert(typeof ScheduleHandler.debugQueueAdjusted[testId] === "boolean");
        });

    })
    /**
     * Questions:
     *  DB:
     *      Participant 1:
     *          morningQuestions.mainGoal (scheduleAll, new question)
     *          eveningQuestions.numGoals (scheduleAll, new question)
     *      Participant 2:
     *          morningQuestions.addGoal (independently, new question)
     *
     *      Participant 3:
     *          morningQuestions.mainGoal 15 (new question, multiple)
     *          morningQuestions.mainGoal 16 (new question, multiple)
     *
     *  ScheduleJobs:
     *      Participant 1:
     *          morningQuestions.mainGoal (scheduleAll, new question)
     *          eveningQuestions.numGoals (scheduleAll, new question)
     *      Participant 2:
     *
     *     Participant 3:
     *          morningQuestions.mainGoal 15 (new question, multiple)
     *          morningQuestions.mainGoal 16 (new question, multiple)
     *
     * Actions:
     *  DB:
     *      Participant 1:
     *          incrementStageDay (scheduleAll, new action)
     *          addValueToVar testNum $N{4} (scheduleAll, new action)
     *
     *      Participant 2:
     *          clearVar testStr (independently, new action)
     *
     *      Participant 3:
     *          clearVar testStr 15 (new action, multiple)
     *          clearVar testStr 16 (new action, multiple)
     *
     *  ScheduleJobs:
     *      Participant 1:
     *          incrementStageDay (scheduleAll, new action)
     *          addValueToVar testNum $N{4} (scheduleAll, new action)
     *
     *      Participant 2:
     *
     *     Participant 3:
     *          clearVar testStr 15 (new action, multiple)
     *          clearVar testStr 16 (new action, multiple)
     */

    describe('Rescheduling jobs for all participants', () => {
        let rescheduleReturnObj;
        it('Should return success and a list of scheduled jobs', async () => {
            rescheduleReturnObj = await ScheduleHandler.rescheduleAllOperations(testBot, testConfig);
            expect(rescheduleReturnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        });
        it('Should return list of rescheduled jobs', () => {
            assert(Array.isArray(rescheduleReturnObj.data));
            expect(rescheduleReturnObj.data.length).to.equal(10);
        })
        it('Should have added jobs to scheduled operations',  () => {
            for(let i = 0; i < rescheduleReturnObj.data.length; i++){
                let jobId = rescheduleReturnObj.data[i]["jobId"];
                let job = rescheduleReturnObj.data[i]["job"];
                try{
                    assert(jobId in ScheduleHandler.scheduledOperations["questions"]);
                    expect(job).to.eql(ScheduleHandler.scheduledOperations["questions"][jobId]);
                } catch(e){
                    assert(jobId in ScheduleHandler.scheduledOperations["actions"]);
                    expect(job).to.eql(ScheduleHandler.scheduledOperations["actions"][jobId]);
                }
            }
        });

        it('Should have retained jobs in database with the same jobIds', async () => {

            let participant1 = await participants.get(testId);
            let scheduledQs1 = participant1.scheduledOperations.questions;
            let scheduledAs1 = participant1.scheduledOperations.actions;
            for(let i = 0; i < 2; i++){
                let jobId = rescheduleReturnObj.data[i]["jobId"];
                assert(DBHasJob(scheduledQs1,jobId));
            }
            for(let i = 2; i < 4; i++){
                let jobId = rescheduleReturnObj.data[i]["jobId"];
                assert(DBHasJob(scheduledAs1,jobId));
            }
            let participant2 = await participants.get(testId2);
            let scheduledQs2 = participant2.scheduledOperations.questions;
            let scheduledAs2 = participant2.scheduledOperations.actions;

            let jobId = rescheduleReturnObj.data[4]["jobId"];
            assert(DBHasJob(scheduledQs2,jobId));

            jobId = rescheduleReturnObj.data[5]["jobId"];
            assert(DBHasJob(scheduledAs2,jobId));

            let participant3 = await participants.get(testId3);
            let scheduledQs3 = participant3.scheduledOperations.questions;
            let scheduledAs3 = participant3.scheduledOperations.actions;

            for(let i = 6; i < 8; i++){
                let jobId = rescheduleReturnObj.data[i]["jobId"];
                assert(DBHasJob(scheduledQs3,jobId));
            }
            for(let i = 8; i < 10; i++){
                let jobId = rescheduleReturnObj.data[i]["jobId"];
                console.log(jobId)
                assert(DBHasJob(scheduledAs3,jobId));
            }


        });
        it('Should not have duplicate jobs in database', async () => {

            let participant1 = await participants.get(testId);
            let scheduledQs1 = participant1.scheduledOperations.questions;
            let participant2 = await participants.get(testId2);
            let scheduledQs2 = participant2.scheduledOperations.questions;
            expect(scheduledQs1.length + scheduledQs2.length).to.equal(3);

            let scheduledAs1 = participant1.scheduledOperations.actions;
            let scheduledAs2 = participant2.scheduledOperations.actions;
            expect(scheduledAs1.length + scheduledAs2.length).to.equal(3);

        });

    });
})
    /**
     * Questions
     *  DB:
     *      Participant 1:
     *          morningQuestions.mainGoal (scheduleAll, new question)
     *          eveningQuestions.numGoals (scheduleAll, new question)
     *      Participant 2:
     *          morningQuestions.addGoal (independently, new question)
     *
     *  ScheduleJobs:
     *      Participant 1:
     *          morningQuestions.mainGoal (scheduleAll, new question)
     *          eveningQuestions.numGoals (scheduleAll, new question)
     *      Participant 2:
     *          morningQuestions.addGoal (independently, new question)
     * Actions:
     *  DB:
     *      Participant 1:
     *          incrementStageDay (scheduleAll, new action)
     *          addValueToVar testNum $N{4} (scheduleAll, new action)
     *
     *      Participant 2:
     *          clearVar testStr (independently, new action)
     *
     *  ScheduleJobs:
     *      Participant 1:
     *          incrementStageDay (scheduleAll, new action)
     *          addValueToVar testNum $N{4} (scheduleAll, new action)
     *
     *      Participant 2:
     *          clearVar testStr (independently, new action)
     */

describe('Scheduling all 2', () => {
    // No change to actions in this test
    describe('Scheduling all questions but with fails', () => {

        it('Should return partial failure', async () => {
            scheduleAllReturnObj = await ScheduleHandler.scheduleAllOperations(testBot, testPart, failConfig,[],false);
            expect(scheduleAllReturnObj.returnCode).to.equal(0);
            console.log(scheduleAllReturnObj.failData)
        });
        it('Should return list of successful jobs', async () => {
            assert(Array.isArray(scheduleAllReturnObj.successData));
            expect(scheduleAllReturnObj.successData.length).to.equal(1);
        });

        it('Should have added one job to scheduled operations',  () => {
            let jobId = scheduleAllReturnObj.successData[0]["jobId"];
            let job = scheduleAllReturnObj.successData[0]["job"];
            assert(jobId in ScheduleHandler.scheduledOperations["questions"]);
            expect(job).to.eql(ScheduleHandler.scheduledOperations["questions"][jobId]);
        });
        it('Should have added succeeded jobs to database', async () => {

            let participant = await participants.get(testId);
            let scheduledQs = participant.scheduledOperations.questions;
            for(let i = 0; i < scheduleAllReturnObj.successData.length; i++){
                let jobId = scheduleAllReturnObj.successData[i]["jobId"];
                assert(DBHasJob(scheduledQs,jobId));
            }

        });
    })
})
    /**
     * Questions
     *  DB:
     *      Participant 1:
     *          morningQuestions.mainGoal (scheduleAll, new question)
     *          eveningQuestions.numGoals (scheduleAll, new question)
     *          eveningQuestions.focus (independently, new question, partial failure)
     *      Participant 2:
     *          morningQuestions.addGoal (independently, new question)
     *
     *  ScheduleJobs:
     *      Participant 1:
     *          morningQuestions.mainGoal (scheduleAll, new question)
     *          eveningQuestions.numGoals (scheduleAll, new question)
     *          eveningQuestions.focus (independently, new question, partial failure)
     *
     *      Participant 2:
     *          morningQuestions.addGoal (independently, new question)
     * Actions:
     *  DB:
     *      Participant 1:
     *          incrementStageDay (scheduleAll, new action)
     *          addValueToVar testNum $N{4} (scheduleAll, new action)
     *
     *      Participant 2:
     *          clearVar testStr (independently, new action)
     *
     *  ScheduleJobs:
     *      Participant 1:
     *          incrementStageDay (scheduleAll, new action)
     *          addValueToVar testNum $N{4} (scheduleAll, new action)
     *
     *      Participant 2:
     *          clearVar testStr (independently, new action)
     */

describe('Removing 2', () => {
    describe('Removing all jobs for a participant', () => {
        let removeAllReturnObj;
        it('Should have job IDs for that participant before', async () => {
            let scheduledQs = ScheduleHandler.scheduledOperations["questions"];
            let scheduledAs = ScheduleHandler.scheduledOperations["actions"];
            let foundChatIdQ = false;
            let foundChatIdA = false;
            for(const [jobId, job] of Object.entries(scheduledQs)){
                if(jobId.startsWith(''+testId)){
                    foundChatIdQ = true;
                    break;
                }
            }
            for(const [jobId, job] of Object.entries(scheduledAs)){
                if(jobId.startsWith(''+testId)){
                    foundChatIdA = true;
                    break;
                }
            }
            assert(foundChatIdQ);
            assert(foundChatIdA);
        });
        it('Should have job IDs in DB for that participant before', async () => {
            let participant = await participants.get(testId);
            let scheduledQs = participant.scheduledOperations["questions"];
            let scheduledAs = participant.scheduledOperations["actions"];
            let foundChatIdQ = false;
            let foundChatIdA = false;
            for(let i=0; i < scheduledQs.length; i++){
                if(scheduledQs[i].jobId.startsWith(''+testId)){
                    foundChatIdQ = true;
                    break;
                }
            }
            for(let i=0; i < scheduledAs.length; i++){
                if(scheduledAs[i].jobId.startsWith(''+testId)){
                    foundChatIdA = true;
                    break;
                }
            }
            assert(foundChatIdQ);
            assert(foundChatIdA);
        });
        it('Should remove all and return successful', async () => {
            removeAllReturnObj = await ScheduleHandler.removeAllJobsForParticipant(testId);
            expect(removeAllReturnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        });
        it('Should have no jobs with chat id in scheduled questions after',  () => {
            let scheduledQs = ScheduleHandler.scheduledOperations["questions"];
            let scheduledAs = ScheduleHandler.scheduledOperations["actions"];
            let foundChatIdQ = false;
            let foundChatIdA = false;
            for(const [jobId, job] of Object.entries(scheduledQs)){
                if(jobId.startsWith(''+testId)){
                    foundChatIdQ = true;
                    break;
                }
            }
            for(const [jobId, job] of Object.entries(scheduledAs)){
                if(jobId.startsWith(''+testId)){
                    foundChatIdA = true;
                    break;
                }
            }
            assert(!foundChatIdQ);
            assert(!foundChatIdA);
        })
        it('Should have no job IDs in DB for that participant after', async () => {
            let participant = await participants.get(testId);
            let scheduledQs = participant.scheduledOperations["questions"];
            let scheduledAs = participant.scheduledOperations["actions"];
            let foundChatIdQ = false;
            let foundChatIdA = false;
            for(let i=0; i < scheduledQs.length; i++){
                if(scheduledQs[i].jobId.startsWith(''+testId)){
                    foundChatIdQ = true;
                    break;
                }
            }
            for(let i=0; i < scheduledAs.length; i++){
                if(scheduledAs[i].jobId.startsWith(''+testId)){
                    foundChatIdA = true;
                    break;
                }
            }
            assert(!foundChatIdQ);
            assert(!foundChatIdA);
        });
        it('Should remove participant from debug queue', async () => {
            assert(!(testId in ScheduleHandler.debugQueue));
            assert(!(testId in ScheduleHandler.debugQueueAdjusted));
        })
    })
    /**
     * Questions
     *  DB:
     *      Participant 1:
     *
     *      Participant 2:
     *
     *
     *  ScheduleJobs:
     *      Participant 1:
     *
     *
     *      Participant 2:
     *
     * Actions:
     *  DB:
     *      Participant 1:
     *
     *      Participant 2:
     *
     *
     *  ScheduleJobs:
     *      Participant 1:
     *
     *      Participant 2:
     */
})


    // TODO: Test failure/partial failure of removing all
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
describe('Overriding scheduling time for intervals', () => {
    let testScheduledQs = [{
        qId : "test1",
        atTime : "09:00",
        onDays : ["Mon", "Tue"]
    }, {
        qId : "test2",
        atTime : "09:59",
        onDays : ["Mon", "Tue"]
    },{
        qId : "test3",
        atTime : "23:59",
        onDays : ["Mon", "Tue"]
    }
    ];
    let testDate = {};
    let allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    it('Should overwrite normally', ()=>{
        testDate.hours = 9;
        testDate.minutes = 0;
        ScheduleHandler.overrideScheduleForIntervals(testScheduledQs, testDate, 3);
        expect(testScheduledQs[0].atTime).to.equal("09:03");
        expect(testScheduledQs[0].onDays).to.eql(allDays);
        expect(testScheduledQs[1].atTime).to.equal("09:06");
        expect(testScheduledQs[1].onDays).to.eql(allDays);
        expect(testScheduledQs[2].atTime).to.equal("09:09");
        expect(testScheduledQs[2].onDays).to.eql(allDays);
    })
    it('Should roll over the hour', ()=>{
        testDate.hours = 9;
        testDate.minutes = 58;
        ScheduleHandler.overrideScheduleForIntervals(testScheduledQs, testDate, 3);
        expect(testScheduledQs[0].atTime).to.equal("10:01");
        expect(testScheduledQs[0].onDays).to.eql(allDays);
        expect(testScheduledQs[1].atTime).to.equal("10:04");
        expect(testScheduledQs[1].onDays).to.eql(allDays);
        expect(testScheduledQs[2].atTime).to.equal("10:07");
        expect(testScheduledQs[2].onDays).to.eql(allDays);
    })
    it('Should roll over the day', ()=>{
        testDate.hours = 23;
        testDate.minutes = 58;
        ScheduleHandler.overrideScheduleForIntervals(testScheduledQs, testDate, 3);
        expect(testScheduledQs[0].atTime).to.equal("00:01");
        expect(testScheduledQs[0].onDays).to.eql(allDays);
        expect(testScheduledQs[1].atTime).to.equal("00:04");
        expect(testScheduledQs[1].onDays).to.eql(allDays);
        expect(testScheduledQs[2].atTime).to.equal("00:07");
        expect(testScheduledQs[2].onDays).to.eql(allDays);
    })
});

