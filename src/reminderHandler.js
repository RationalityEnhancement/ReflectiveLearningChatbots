const participants = require('./apiControllers/participantApiController')
const Communicator = require('./communicator')
const ReturnMethods = require('./returnMethods')
const ExperimentUtils = require('./experimentUtils')
const ConfigReader = require('../src/configReader');
const DevConfig = ConfigReader.getDevConfig()

const scheduler = require('node-schedule')

class ReminderHandler{
    static scheduledReminders = {};

    /**
     *
     * Takes a given time object with fields hours and minutes, adds a certain amount of minutes to it,
     * and returns the new time object
     *
     * @param currentTime time object with number fields hours (0 < hours < 24) and minutes (0 < minutes < 60)
     * @param addedMins number of minutes to add
     * @returns {{hours: number, minutes: number}}
     *          New time object with number fields hours and minutes
     */
    static addMins(currentTime, addedMins){
        let curHour = currentTime.hours;
        let curMin = currentTime.minutes;

        let newMin = curMin + addedMins;
        let addedHrs = Math.floor(newMin / 60 );
        newMin = newMin % 60;
        let newHour = curHour + addedHrs;
        newHour = newHour % 24;

        return {
            hours : newHour,
            minutes : newMin
        }
    }

    /**
     *
     * Builds the node-schedule recurrence rule for a single reminder at a given time
     *
     * @param timezone timezone in tz format (e.g., "Europe/Berlin")
     * @param currentTime time object with number fields hours and minutes
     * @returns {{returnCode: *, data: *}}
     */
    static buildReminderRule(timezone, currentTime){
        if(typeof currentTime !== "object"){
            return ReturnMethods.returnFailure("RHandler: currentTime for reminder rule must be obj")
        }
        if(!(("hours" in currentTime) && ("minutes" in currentTime))){
            return ReturnMethods.returnFailure("RHandler: recurrence rule must have hrs and mins")
        }

        // Build recurrence rule and return
        let rule = new scheduler.RecurrenceRule();
        rule.hour = currentTime.hours;
        rule.minute = currentTime.minutes;
        if(timezone) rule.tz = timezone;

        return ReturnMethods.returnSuccess(rule)
    }

    /**
     *
     * Creates a single scheduled job to send a single reminder at a given time
     *
     * @param config JSON config file, must have phrases.schedule.reminderText in participant's preferred language
     * @param bot Telegram bot instance to send message
     * @param participant participant object
     * @param chatId chat Id of participant
     * @param currentTime time object for scheduling with number fields hours and minutes
     * @param long whether the reminder message should be long or short (1st message long, rest short)
     * @returns {{returnCode: *, data: *}|{returnCode: *, data: *}}
     *              When success, list of objects with { jobId : string, job : scheduled object }
     */
    static createReminderJob(config, bot, participant, chatId, currentTime, long=true){
        if(!("parameters" in participant)){
            return ReturnMethods.returnFailure("RHandler: Participant object must have parameters");
        }
        // Build the recurrence rule
        let recRuleObj = this.buildReminderRule(participant.parameters.timezone, currentTime);
        if(recRuleObj.returnCode === DevConfig.FAILURE_CODE){
            return ReturnMethods.returnFailure(
                "RHandler: Failure building reminder rule while creating job"
                + "\n"+ recRuleObj.data
            );
        }
        let job;
        // Get the reminder text from config and schedule the message
        try{
            let reminderTextLong = config.phrases.schedule.reminderTextLong[participant.parameters.language];
            let reminderTextShort = config.phrases.schedule.reminderTextShort[participant.parameters.language];
            if(!reminderTextLong) throw "Reminder text long is undefined"
            if(!reminderTextShort) throw "Reminder text short is undefined"
            let reminderText = long ? reminderTextLong : reminderTextShort;
            job = scheduler.scheduleJob(recRuleObj.data, async function(){
                for(let i = 0; i < DevConfig.SEND_MESSAGE_ATTEMPTS; i++){
                    try{
                        await Communicator.sendMessage(bot, participant, chatId, reminderText,
                            !config.debug.messageDelay, false)
                        break;
                    } catch(e){
                        return ReturnMethods.returnFailure("RHandler: Unable to send reminder:\n"
                            + e.message + "\n" + e.stack)
                    }
                }
            })
            if(!job) throw "Job is null"
        } catch(err){
            return ReturnMethods.returnFailure("RHandler: Unable to create reminder job:\n" + err);
        }
        return ReturnMethods.returnSuccess(job);
    }

    /**
     *
     * Write reminders from a list to the database
     *
     * @param uniqueId uniqueId of participant
     * @param jobList list of job objects, each should have { jobId, hours, minutes }
     * @returns {Promise<{returnCode: *, successData: *, failData: *}|{returnCode: *, data: *}>}
     */
    static async writeRemindersToDB(uniqueId, jobList){
        let addJobs = []
        for(let i = 0; i < jobList.length; i++){
            addJobs.push({
                type: "reminders",
                jobInfo: jobList[i]
            })
        }
        try {
            await participants.addScheduledOperations(uniqueId, addJobs)
            return ReturnMethods.returnSuccess(jobList.map(job => job.jobId));
        } catch(e){
            return ReturnMethods.returnFailure(
                "RHandler: Errors adding jobs to DB:\n" + e.message + "\n" + estack)
        }
    }

    /**
     *
     * Sets a new set of reminders based on their frequency and number
     *
     * @param config JSON config file, must have phrases.schedule.reminderText in participant's language
     * @param bot tg bot instance
     * @param participant participant object, must have fields timezone and language in participant.parameters
     * @param chatId participant's tg chat ID
     * @param freqMins frequency of reminder in minutes
     * @param numRepeats number of times the reminder should be repeated
     * @returns {Promise<{returnCode: *, successData: *, failData: *}|{returnCode: *, data: *}>}
     */
    static async setReminder(config, bot, participant, chatId, freqMins, numRepeats){

        if((typeof freqMins !== "number") || (typeof numRepeats !== "number")){
            return ReturnMethods.returnFailure("RHandler: frequency and numRepeats must be numbers\n" + freqMins +"\n"+numRepeats);
        }

        // Get the current time
        let now = ExperimentUtils.getNowDateObject(participant.parameters.timezone);
        let currentTime = {
            minutes : now.minutes,
            hours : now.hours
        };

        let failedJobs = [];
        let succeededJobs = [];

        let dbJobs = [];

        // console.time(participant.uniqueId + " - setting reminder - creating all jobs")
        // Create a new scheduled job for each reminder, calculating the time offset each time
        for(let i = 0; i < numRepeats; i++){
            let newTime = this.addMins(currentTime, (i + 1) * freqMins);
            let jobId = participant.uniqueId + "_" + newTime.hours + "_" + newTime.minutes;
            let curJobObj = this.createReminderJob(config, bot, participant, chatId, newTime, i===0);
            if(curJobObj.returnCode === DevConfig.FAILURE_CODE){
                failedJobs.push(curJobObj.data);
            } else {
                succeededJobs.push({
                    jobId : jobId, job: curJobObj.data
                });
                this.scheduledReminders[jobId] = curJobObj.data;
                dbJobs.push({
                    jobId : jobId,
                    minutes : newTime.minutes,
                    hours : newTime.hours
                });
            }
        }
        // console.timeEnd(participant.uniqueId + " - setting reminder - creating all jobs")

        // Write all these jobs to database
        // console.time(participant.uniqueId + " - setting reminder - writing all to DB")
        let writeObj = await this.writeRemindersToDB(participant.uniqueId, dbJobs);
        // console.timeEnd(participant.uniqueId + " - setting reminder - writing all to DB")
        if(writeObj.returnCode === DevConfig.FAILURE_CODE){
            for(const [jobId, job] of Object.entries(this.scheduledReminders)){
                job.cancel();
            }
            return writeObj;
        }

        if(failedJobs.length > 0){
            if(succeededJobs.length === 0){
                return ReturnMethods.returnFailure(
                    "RHandler: Errors setting the following reminders:\n" + failedJobs.join('\n'))
            }
            return ReturnMethods.returnPartialFailure(
                "RHandler: Errors setting the following reminders:\n" + failedJobs.join('\n'),
                succeededJobs);
        }
        return ReturnMethods.returnSuccess(succeededJobs);

    }

    /**
     *
     * Cancels all the jobs for a given participant but does not remove from database
     *
     * @param uniqueId
     * @returns {{returnCode: *, successData: *, failData: *}|{returnCode: *, data: *}}
     */
    static cancelJobsForId(uniqueId){
        // Get jobs for uniqueId
        let currentJobIds = [];
        for(const [jobId, job] of Object.entries(this.scheduledReminders)){
            if(jobId.startsWith(''+uniqueId)){
                currentJobIds.push(jobId);
            }
        }

        let succeededJobs = [];
        let failedJobs = [];

        // Remove jobs from scheduled reminders after cancelling
        for(let i = 0; i < currentJobIds.length; i++){
            let curJob = currentJobIds[i];
            try{
                this.scheduledReminders[curJob].cancel();
                delete this.scheduledReminders[curJob]
                succeededJobs.push(curJob);
            } catch (err){
                failedJobs.push(curJob)
            }
        }

        if(failedJobs.length > 0){
            if(succeededJobs.length === 0){
                return ReturnMethods.returnFailure(
                    "RHandler: Errors canceling the following jobs:\n" + failedJobs.join('\n'))
            }
            return ReturnMethods.returnPartialFailure(
                "RHandler: Errors canceling the following jobs:\n" + failedJobs.join('\n'),
                succeededJobs);
        }
        return ReturnMethods.returnSuccess(succeededJobs);
    }

    /**
     *
     * Reschedule the reminders that are in the database
     *
     * @param config JSON config
     * @param bot telegram bot instance
     * @param participant participant object, must contain scheduledOperations["reminders"
     * @param chatId
     * @returns {Promise<{returnCode: *, successData: *, failData: *}|{returnCode: *, data: *}>}
     */
    static async rescheduleReminders(config, bot, participant, chatId){

        // Get the reminders present in the data base
        let schRems = participant.scheduledOperations["reminders"];

        let failedJobs = [], succeededJobs = [];

        for(let i = 0; i < schRems.length; i++){
            let currentTime = {
                hours : schRems[i].hours,
                minutes : schRems[i].minutes
            };
            let curJobObj = this.createReminderJob(config, bot, participant, chatId, currentTime, i===0);
            if(curJobObj.returnCode === DevConfig.FAILURE_CODE){
                failedJobs.push(curJobObj.data);
            } else {
                succeededJobs.push({
                    jobId : schRems[i].jobId,
                    job: curJobObj.data
                });
                this.scheduledReminders[schRems[i].jobId] = curJobObj.data;
            }
        }

        if(failedJobs.length > 0){
            if(succeededJobs.length === 0){
                return ReturnMethods.returnFailure(
                    "RHandler: Errors rescheduling the following jobs:\n" + failedJobs.join('\n'))
            }
            return ReturnMethods.returnPartialFailure(
                "RHandler: Errors rescheduling the following jobs:\n" + failedJobs.join('\n'),
                succeededJobs);
        }
        return ReturnMethods.returnSuccess(succeededJobs);

    }

    /**
     *
     * Cancels the current reminder for the participant by cancelling all the
     * present reminder jobs as well as removing them from the database
     *
     * @param participant participant object
     * @returns {Promise<{returnCode: *, successData: *, failData: *}|{returnCode: *, data: *}|{returnCode: *, data: *}>}
     */
    static async cancelCurrentReminder(participant){

        // console.time(uniqueId + " - cancelling reminder jobs")
        let cancelObj = this.cancelJobsForId(participant.uniqueId);
        // console.timeEnd(uniqueId + " - cancelling reminder jobs")
        if(cancelObj.returnCode === DevConfig.PARTIAL_FAILURE_CODE){
            return ReturnMethods.returnFailure(cancelObj.failData);
        } else if(cancelObj.returnCode === DevConfig.FAILURE_CODE){
            return cancelObj;
        }

        // console.time(uniqueId + " - removing reminder jobs")
        let deleteObj = await this.removeJobsForId(participant);
        // console.timeEnd(uniqueId + " - removing reminder jobs")
        if(deleteObj.returnCode === DevConfig.FAILURE_CODE){
            return deleteObj;
        }

        return ReturnMethods.returnSuccess(cancelObj.data.concat(deleteObj.data));

    }

    /**
     *
     * Removes jobs from the database for a given participant but not from the scheduledReminders object
     *
     * @param participant participant object
     * @returns {Promise<{returnCode: *, successData: *, failData: *}|{returnCode: *, data: *}>}
     */
    static async removeJobsForId(participant){
        if(typeof participant !== "object" || !("scheduledOperations" in participant)){
            return ReturnMethods.returnFailure("RHandler: participant is undefined or does not have scheduled operations")
        }
        // Get the jobs for the participant
        let schRems = participant.scheduledOperations["reminders"];
        if(!schRems || !Array.isArray(schRems)) {
            return ReturnMethods.returnFailure("RHandler: participant does not have scheduled reminders object")
        }

        // Remove all jobs at once
        let removeJobs = [];
        for(let i = 0; i < schRems.length; i++){
            removeJobs.push({
                type: "reminders",
                jobId: schRems[i].jobId
            })
        }
        if(removeJobs.length === 0) return ReturnMethods.returnSuccess(removeJobs);
        return participants.removeScheduledOperations(participant.uniqueId, removeJobs)
            .then((resolve) => {
                return ReturnMethods.returnSuccess(removeJobs.map(job => job.jobId))
            })
            .catch(err => {
                return ReturnMethods.returnFailure("RHandler: Errors removing reminder jobs\n"
                + err.message + "\n" + err.stack);
            })

    }

}

module.exports = ReminderHandler;