const { MongoMemoryServer } = require('mongodb-memory-server');
const moment = require('moment-timezone');

const participants = require('../src/apiControllers/participantApiController');
const idMaps = require('../src/apiControllers/idMapApiController')

const mongo = require('mongoose');

const { assert, expect } = require('chai');

const testConfig = require('../json/test/scheduleHandlerTestConfig.json');
const ConfigReader = require('../src/configReader');
const DevConfig = ConfigReader.getDevConfig();

const ReminderHandler = require('../src/reminderHandler')

const testId = "123";
const testId2 = "321";
const scheduler = require('node-schedule')
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

describe('Adding minutes', () => {
    let currentTime = {
        hours : 21,
        minutes : 23
    }
    it('Should add without rolling over hour', () => {
        let newTime = ReminderHandler.addMins(currentTime, 23);
        expect(newTime.hours).to.equal(currentTime.hours);
        expect(newTime.minutes).to.equal(46);
    })
    it('Should add with rolling over hour by one', () => {
        let newTime = ReminderHandler.addMins(currentTime, 63);
        expect(newTime.hours).to.equal(currentTime.hours + 1);
        expect(newTime.minutes).to.equal(26);
    })
    it('Should add with rolling over hour by multiple', () => {
        let newTime = ReminderHandler.addMins(currentTime, 123);
        expect(newTime.hours).to.equal(currentTime.hours + 2);
        expect(newTime.minutes).to.equal(26);
    })
    it('Should roll over into next day', () => {
        let newTime = ReminderHandler.addMins(currentTime, 183);
        expect(newTime.hours).to.equal(0);
        expect(newTime.minutes).to.equal(26);
    })
    it('Should add with rolling over hour when minutes are even at 60', () => {
        let newTime = ReminderHandler.addMins(currentTime, 37);
        expect(newTime.hours).to.equal(currentTime.hours + 1);
        expect(newTime.minutes).to.equal(0);
    })
})

describe('Creating reminder job', () => {
    const participant = {
        uniqueId : testId,
        firstName : "John",
        stages : {},
        currentAnswer : [],
        parameters: {
            language: "English",
            timezone : "Europe/Berlin"
        }

    }
    it("Should succeed when valid", () => {
        let currentTime = {
            hours : 12,
            minutes : 34
        }
        let returnObj = ReminderHandler.createReminderJob(testConfig, testBot, participant, "12345", currentTime);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        let recRule = returnObj.data.job.pendingInvocations[0].recurrenceRule;
        expect(recRule.hour).to.equal(currentTime.hours)
        expect(recRule.minute).to.equal(currentTime.minutes)
        expect(recRule.tz).to.equal(participant.parameters.timezone)
    })
    it("Should succeed when timezone doesnt exist", () => {
        let currentTime = {
            hours : 12,
            minutes : 34
        }
        delete participant.parameters["timezone"];
        let returnObj = ReminderHandler.createReminderJob(testConfig, testBot, participant, "12345", currentTime);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        let recRule = returnObj.data.job.pendingInvocations[0].recurrenceRule;
        expect(recRule.hour).to.equal(currentTime.hours)
        expect(recRule.minute).to.equal(currentTime.minutes)
        expect(recRule.tz).to.be.undefined;
    })
    it("Should fail when hours invalid", () => {
        let currentTime = {
            hours : 25,
            minutes : 34
        }
        let returnObj = ReminderHandler.createReminderJob(testConfig, testBot, participant, "12345", currentTime);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        console.log(returnObj.data)
    })
    it("Should fail when minutes invalid", () => {
        let currentTime = {
            hours : 22,
            minutes : 66
        }
        let returnObj = ReminderHandler.createReminderJob(testConfig, testBot, participant, "12345", currentTime);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        console.log(returnObj.data)
    })
    it("Should fail when time not object", () => {
        let currentTime = "{"
        let returnObj = ReminderHandler.createReminderJob(testConfig, testBot, participant, "12345", currentTime);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it("Should fail when minutes missing", () => {
        let currentTime = {
            hours : 22
        }
        let returnObj = ReminderHandler.createReminderJob(testConfig, testBot, participant, "12345", currentTime);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it("Should fail when hours missing", () => {
        let currentTime = {
            minutes : 22
        }
        let returnObj = ReminderHandler.createReminderJob(testConfig, testBot, participant, "12345", currentTime);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it("Should fail when part language doesnt exist", () => {
        let currentTime = {
            hours : 22,
            minutes : 45
        }
        delete participant.parameters["language"]
        let returnObj = ReminderHandler.createReminderJob(testConfig, testBot, participant, "12345", currentTime);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it("Should fail when part parameters doesnt exist", () => {
        let currentTime = {
            hours : 22,
            minutes : 45
        }
        delete participant["parameters"]
        let returnObj = ReminderHandler.createReminderJob(testConfig, testBot, participant, "12345", currentTime);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
})
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

        await idMaps.addIDMapping(testConfig.experimentId, "12455", testId)
        await idMaps.addIDMapping(testConfig.experimentId, "1241255", testId2)

        let exp1 = await idMaps.getExperiment(testConfig.experimentId)

        expect(exp1.IDMappings.length).to.equal(2)
    })
    it('Should add and update participant parameter', async () => {

        await participants.add(testId);
        await participants.updateParameter(testId, "language", "English")
        await participants.updateParameter(testId, "timezone", "Europe/Berlin")
        var participant = await participants.get(testId);
        expect(participant).to.not.be.null;
        expect(participant.uniqueId).to.equal(testId);
        expect(participant.parameters.language).to.equal("English");
        expect(participant.parameters.timezone).to.equal("Europe/Berlin");


    });

    it('Should add and update participant parameter - 2', async () => {

        await participants.add(testId2);
        await participants.updateParameter(testId2, "language", "English")
        await participants.updateParameter(testId2, "timezone", "Europe/Berlin")
        var participant = await participants.get(testId2);
        expect(participant).to.not.be.null;
        expect(participant.uniqueId).to.equal(testId2);
        expect(participant.parameters.language).to.equal("English");
        expect(participant.parameters.timezone).to.equal("Europe/Berlin");


    });
})

describe('Setting reminders', () => {
    describe('Setting zero reminders', () => {
        let participant, newPart, returnObj;
        it('Should cancel all pre-existing reminders', async () => {

            for(const [jobId, job] of Object.entries(scheduler.scheduledJobs)){
                job.cancel()
            }
            expect(Object.keys(scheduler.scheduledJobs).filter(jobId => jobId.includes("_r_")).length).to.equal(0);
            participant = await participants.get(testId)
            participant.firstName = "John";
            returnObj = await ReminderHandler.setReminder(testConfig, testBot, participant, "12345", 15, 0);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(Array.isArray(returnObj.data))
            expect(returnObj.data.length).to.equal(0);
        })
        it('Should return success and list of jobs', async () => {
            participant = await participants.get(testId);
            participant.firstName = "John";
            returnObj = await ReminderHandler.setReminder(testConfig, testBot, participant, "12345", 15, 0);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(Array.isArray(returnObj.data))
            expect(returnObj.data.length).to.equal(0);
        })
        it('Should have added no job to scheduledReminders', () => {
            expect(Object.keys(scheduler.scheduledJobs).filter(jobId => jobId.includes("_r_")).length).to.equal(0);
        })

    })
    describe('Setting a single reminder', () => {
        let participant, newPart, returnObj;
        it('Should return success and list of jobs', async () => {
            participant = await participants.get(testId);
            participant.firstName = "John";
            returnObj = await ReminderHandler.setReminder(testConfig, testBot, participant, "12345", 15, 1);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(Array.isArray(returnObj.data))
            expect(returnObj.data.length).to.equal(1);
        })
        it('Should have added job to scheduledReminders', () => {
            expect(Object.keys(scheduler.scheduledJobs).filter(jobId => jobId.includes("_r_")).length).to.equal(1);
            assert(returnObj.data[0].jobId in scheduler.scheduledJobs);
        })
        it('Should have added job to database', async () => {
            newPart = await participants.get(testId);
            assert(DBHasJob(newPart.scheduledOperations["reminders"], returnObj.data[0].jobId));
        })
    })
    describe('Setting multiple reminders', () => {
        let participant, newPart, returnObj;
        it('Should return success and list of jobs', async () => {
            participant = await participants.get(testId);
            participant.firstName = "John";
            returnObj = await ReminderHandler.setReminder(testConfig, testBot, participant, "12345", 13, 3);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(Array.isArray(returnObj.data))
            expect(returnObj.data.length).to.equal(3);
            for(let i = 0; i < returnObj.data.length-1; i++){
                let thisRule = returnObj.data[i].job.pendingInvocations[0].recurrenceRule;
                let nextRule = returnObj.data[i+1].job.pendingInvocations[0].recurrenceRule;
                let minDiff = nextRule.minute - thisRule.minute;
                if(minDiff < 0) minDiff = 60 + minDiff;
                expect(minDiff).to.equal(13)
            }
        })
        it('Should have added new jobs to scheduledReminders', () => {
            expect(Object.keys(scheduler.scheduledJobs).filter(jobId => jobId.includes("_r_")).length).to.equal(returnObj.data.length + 1);
            for(let i = 0; i < returnObj.data.length; i++){
                assert(returnObj.data[i].jobId in scheduler.scheduledJobs);
            }
        })
        it('Should have added jobs to database', async () => {
            newPart = await participants.get(testId);
            for(let i = 0; i < returnObj.data.length; i++){
                assert(DBHasJob(newPart.scheduledOperations["reminders"], returnObj.data[i].jobId));
            }
        })
    })

    describe('Setting multiple reminders - 2', () => {
        let participant, newPart, returnObj;
        it('Should return success and list of jobs', async () => {
            participant = await participants.get(testId2);
            participant.firstName = "John";
            returnObj = await ReminderHandler.setReminder(testConfig, testBot, participant, "1231245", 17, 3);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(Array.isArray(returnObj.data))
            expect(returnObj.data.length).to.equal(3);
            for(let i = 0; i < returnObj.data.length-1; i++){
                let thisRule = returnObj.data[i].job.pendingInvocations[0].recurrenceRule;
                let nextRule = returnObj.data[i+1].job.pendingInvocations[0].recurrenceRule;
                let minDiff = nextRule.minute - thisRule.minute;
                if(minDiff < 0) minDiff = 60 + minDiff;
                expect(minDiff).to.equal(17)
            }
        })
        it('Should have jobs for both participants in scheduledReminders', () => {
            expect(Object.keys(scheduler.scheduledJobs).filter(jobId => jobId.includes("_r_")).length).to.equal(returnObj.data.length + 4);
            for(let i = 0; i < returnObj.data.length; i++){
                assert(returnObj.data[i].jobId in scheduler.scheduledJobs);
            }
        })
        it('Should have added jobs to database', async () => {
            newPart = await participants.get(testId2);
            for(let i = 0; i < returnObj.data.length; i++){
                assert(DBHasJob(newPart.scheduledOperations["reminders"], returnObj.data[i].jobId));
            }
        })
    })

    describe('Fails', () => {
        let participant, newPart, returnObj;
        it('Should return fail when frequency not number', async () => {
            participant = await participants.get(testId);
            participant.firstName = "John";
            returnObj = await ReminderHandler.setReminder(testConfig, testBot, participant, "12345", "13", 3);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should return fail when numRepeats not number', async () => {
            participant = await participants.get(testId);
            participant.firstName = "John";
            returnObj = await ReminderHandler.setReminder(testConfig, testBot, participant, "12345", 13, "0");
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })

    })

})
describe('Cancelling reminders', () => {
    describe('Cancelling all current reminders for part 1', () => {
        let participant, newPart, returnObj;
        it('Should already have some reminders present', async () => {
            participant = await participants.get(testId);
            participant.firstName = "John";
            expect(participant.scheduledOperations.reminders.length).to.equal(4);
            expect(Object.keys(scheduler.scheduledJobs).filter(jobId => jobId.includes("_r_")).length).to.equal(7);
        })
        it('Should return success', async () => {
            returnObj = await ReminderHandler.cancelJobsForId(testId);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(Array.isArray(returnObj.data))
            expect(returnObj.data.length).to.equal(4);
        })
        it('Should have removed only jobs for part 1 from scheduled reminders', () => {
            expect(Object.keys(scheduler.scheduledJobs).filter(jobId => jobId.includes("_r_")).length).to.equal(3);
            for(let i = 0; i < returnObj.data.length; i++){
                assert(!(returnObj.data[i] in scheduler.scheduledJobs));
            }
        })
        it('Should have NOT removed jobs from database', async () => {
            newPart = await participants.get(testId);
            for(let i = 0; i < returnObj.data.length; i++){
                assert(DBHasJob(newPart.scheduledOperations["reminders"], returnObj.data[i]));
            }
        })

    })
    describe('Cancelling all current reminders when none present', () => {
        let participant, newPart, returnObj;
        it('Should not have anh reminders present', async () => {
            participant = await participants.get(testId);
            participant.firstName = "John";
            expect(participant.scheduledOperations.reminders.length).to.equal(4);
            expect(Object.keys(scheduler.scheduledJobs).filter(jobId => jobId.includes("_r_")).length).to.equal(3);
        })
        it('Should return success and empty array', async () => {
            returnObj = await ReminderHandler.cancelJobsForId(testId);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(Array.isArray(returnObj.data))
            expect(returnObj.data.length).to.equal(0);
        })
        it('Should not have anything for part 1 in scheduled Reminders', async () => {
            assert(!Object.keys(scheduler.scheduledJobs).some(jobId => jobId.startsWith(''+testId+"_r_")));
        })
    })
})
describe('Rescheduling reminders', () => {
    describe('Rescheduling normally', () => {
        let participant, newPart, returnObj;
        it('Should return success and list of jobs', async () => {
            participant = await participants.get(testId);
            participant.firstName = "John";
            returnObj = await ReminderHandler.rescheduleReminders(testConfig, testBot, participant, "12345");
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(Array.isArray(returnObj.data))
            expect(returnObj.data.length).to.equal(4);
            for(let i = 1; i < returnObj.data.length-1; i++){
                let thisRule = returnObj.data[i].job.pendingInvocations[0].recurrenceRule;
                let nextRule = returnObj.data[i+1].job.pendingInvocations[0].recurrenceRule;
                let minDiff = nextRule.minute - thisRule.minute;
                if(minDiff < 0) minDiff = 60 + minDiff;
                expect(minDiff).to.equal(13)
            }
        })
        it('Should have re-added in scheduledReminders', () => {
            expect(Object.keys(scheduler.scheduledJobs).filter(jobId => jobId.includes("_r_")).length).to.equal(returnObj.data.length + 3);
            for(let i = 0; i < returnObj.data.length; i++){
                assert(returnObj.data[i].jobId in scheduler.scheduledJobs);
            }
        })
        it('Should have retained jobs in database', async () => {
            newPart = await participants.get(testId);
            for(let i = 0; i < returnObj.data.length; i++){
                assert(DBHasJob(newPart.scheduledOperations["reminders"], returnObj.data[i].jobId));
            }
        })
    })

})

describe('Removing reminders', () => {
    describe('Removing all current reminders for part 1', () => {
        let participant, newPart, returnObj;
        it('Should already have some reminders present', async () => {
            participant = await participants.get(testId);
            participant.firstName = "John";
            expect(participant.scheduledOperations.reminders.length).to.equal(4);
            expect(Object.keys(scheduler.scheduledJobs).filter(jobId => jobId.includes("_r_")).length).to.equal(7);
        })
        it('Should return success', async () => {
            returnObj = await ReminderHandler.removeJobsForId(participant);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(Array.isArray(returnObj.data))
            expect(returnObj.data.length).to.equal(4);
        })
        it('Should have not removed jobs from scheduled reminders', () => {
            expect(Object.keys(scheduler.scheduledJobs).filter(jobId => jobId.includes("_r_")).length).to.equal(7);
            for(let i = 0; i < returnObj.data.length; i++){
                assert((returnObj.data[i] in scheduler.scheduledJobs));
            }
        })
        it('Should have removed jobs from database', async () => {
            newPart = await participants.get(testId);
            for(let i = 0; i < returnObj.data.length; i++){
                assert(!DBHasJob(newPart.scheduledOperations["reminders"], returnObj.data[i]));
            }
        })
        it('Should have retained part 2s jobs in database', async () => {
            let newPart2 = await participants.get(testId2);
            expect(newPart2.scheduledOperations["reminders"].length).to.equal(3);
        })
    })
    describe('Removing reminders when none present', () => {
        let participant, newPart, returnObj;
        it('Should not have any reminders present in DB', async () => {
            participant = await participants.get(testId);
            participant.firstName = "John";
            expect(participant.scheduledOperations.reminders.length).to.equal(0);
            expect(Object.keys(scheduler.scheduledJobs).filter(jobId => jobId.includes("_r_")).length).to.equal(7);
        })
        it('Should return success and empty array', async () => {
            returnObj = await ReminderHandler.removeJobsForId(participant);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            assert(Array.isArray(returnObj.data))
            expect(returnObj.data.length).to.equal(0);
        })

        it('Should have removed jobs from database', async () => {
            newPart = await participants.get(testId);
            expect(newPart.scheduledOperations["reminders"].length).to.equal(0)
        })
        it('Should have retained part 2s jobs in database', async () => {
            let newPart2 = await participants.get(testId2);
            expect(newPart2.scheduledOperations["reminders"].length).to.equal(3);
        })
    })
    describe('Fails', () => {
        let participant, newPart, returnObj;
        it('Should fail when participant is invalid', async () => {
            returnObj = await ReminderHandler.removeJobsForId("abcd");
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when participant does not have scheduled operations', async () => {
            participant = await participants.get(testId);
            participant["scheduledOperations"] = undefined;
            returnObj = await ReminderHandler.removeJobsForId(participant);
            console.log(returnObj.data)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when participant does not have scheduled reminders', async () => {
            participant = await participants.get(testId);
            participant["scheduledOperations"]["reminders"] = undefined;
            returnObj = await ReminderHandler.removeJobsForId(participant);
            console.log(returnObj.data)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
    })
})

describe('Severing DB connection', () => {
    it('Should remove participants', async () => {
        await participants.remove(testId);
        let participant = await participants.get(testId);
        expect(participant).to.be.null;

        await participants.remove(testId2);
        participant = await participants.get(testId2);
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
