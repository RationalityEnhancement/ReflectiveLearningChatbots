const participants = require('./apiControllers/participantApiController')
const Communicator = require('./communicator')
const ReturnMethods = require('./returnMethods')
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
     *                      and day of week: [0, ..., 6]
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
        let newDay = currentTime.dayOfWeek;
        if(newHour / 24 >= 1) {
            newDay[0] = (newDay[0] + 1) % 7
        }
        newHour = newHour % 24;

        return {
            hours : newHour,
            minutes : newMin,
            dayOfWeek: newDay
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
        if(!(("hours" in currentTime) && ("minutes" in currentTime) && ("dayOfWeek" in currentTime))){
            return ReturnMethods.returnFailure("RHandler: recurrence rule must have hrs and mins and dayOfWeek")
        }

        // Build recurrence rule and return
        let rule = new scheduler.RecurrenceRule();
        rule.hour = currentTime.hours;
        rule.minute = currentTime.minutes;
        if(currentTime.dayOfWeek && currentTime.dayOfWeek.length > 0)
            rule.dayOfWeek = currentTime.dayOfWeek;
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
     * @param last whether the current reminder is the last in a series of reminders (cancels reminders after triggering)
     * @returns {{returnCode: *, data: *}|{returnCode: *, data: *}}
     *              When success, list of objects with { jobId : string, job : scheduled object }
     */
    static createReminderJob(config, bot, participant, chatId, currentTime, long=true, last=false){
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
        let jobId = participant.uniqueId + "_r_" + currentTime.hours + "_" + currentTime.minutes
            + "_" + currentTime.dayOfWeek.join('');
        // Get the reminder text from config and schedule the message
        try{
            let reminderTextLong = config.phrases.schedule.reminderTextLong[participant.parameters.language];
            let reminderTextShort = config.phrases.schedule.reminderTextShort[participant.parameters.language];
            if(!reminderTextLong) throw "Reminder text long is undefined"
            if(!reminderTextShort) throw "Reminder text short is undefined"
            let reminderText = long ? reminderTextLong : reminderTextShort;
            let rHandlerObj = this;

            job = scheduler.scheduleJob(jobId, recRuleObj.data, async function(){
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
                // If this is the last reminder of the series, cancel the reminders after it has been sent
                if(last){
                    // Get the updated participant
                    let newParticipant;
                    try {
                        newParticipant = await participants.get(participant.uniqueId);
                        if (!newParticipant) throw "Participant not found"
                    } catch (err) {
                        console.log(err);
                    }
                    await rHandlerObj.cancelCurrentReminder(newParticipant);

                }
            })
            if(!job) {
                scheduler.scheduledJobs[jobId].cancel();
                throw "Job is null"
            }
        } catch(err){
            return ReturnMethods.returnFailure("RHandler: Unable to create reminder job:\n" + err);
        }
        return ReturnMethods.returnSuccess({
            jobId: jobId,
            job: job
        });
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
                "RHandler: Errors adding jobs to DB:\n" + e.message + "\n" + e.stack)
        }
    }

    /**
     *
     * Creates a time list in format digestible by setReminder for a given list of minutes
     * after the given current time
     *
     * @param currentTime
     * @param minsAfter
     * @returns {{returnCode: number, data: *}}
     */
    static convertCustomTimesToList(currentTime, minsAfter){
        if(!Array.isArray(minsAfter) || !minsAfter.every(min => typeof min === "number")){
            return ReturnMethods.returnFailure("RHandler: list of times must all be numbers");
        }
        if(!("minutes" in currentTime) || typeof currentTime.minutes !== "number"){
            return ReturnMethods.returnFailure(
                "RHandler: Cannot convert time list when currentTime does not have integer minutes")
        }
        if(!("hours" in currentTime) || typeof currentTime.hours !== "number"){
            return ReturnMethods.returnFailure(
                "RHandler: Cannot convert time list when currentTime does not have integer hours")
        }
        if(!("dayOfWeek" in currentTime) || !Array.isArray(currentTime.dayOfWeek)){
            return ReturnMethods.returnFailure(
                "RHandler: Cannot convert time list when currentTime does not have dayOfWeek")
        }
        minsAfter = [...new Set(minsAfter)]
        let timeArray = [];
        for(let i = 0; i < minsAfter.length; i++){
            let newTime = this.addMins(currentTime, minsAfter[i]);
            timeArray.push(newTime)
        }
        return ReturnMethods.returnSuccess(timeArray);
    }
    /**
     *
     * Creates a time list in format digestible by setReminder for a given period, given
     * frequency, and starting from a given current time
     *
     * @param currentTime
     * @param freqMins
     * @param numRepeats
     * @returns {{returnCode: number, data: *}}
     */
    static convertPeriodToList(currentTime, freqMins, numRepeats){
        if((typeof freqMins !== "number") || (typeof numRepeats !== "number")){
            return ReturnMethods.returnFailure("RHandler: frequency and numRepeats must be numbers\n" + freqMins +"\n"+numRepeats);
        }

        if(!("minutes" in currentTime) || typeof currentTime.minutes !== "number"){
            return ReturnMethods.returnFailure(
                "RHandler: Cannot convert period when currentTime does not have integer minutes")
        }
        if(!("hours" in currentTime) || typeof currentTime.hours !== "number"){
            return ReturnMethods.returnFailure(
                "RHandler: Cannot convert period when currentTime does not have integer hours")
        }
        if(!("dayOfWeek" in currentTime) || !Array.isArray(currentTime.dayOfWeek)){
            return ReturnMethods.returnFailure(
                "RHandler: Cannot convert to period when currentTime does not have dayOfWeek")
        }
        let timeArray = [];
        for(let i = 0; i < numRepeats; i++){
            let newTime = this.addMins(currentTime, (i + 1) * freqMins);
            timeArray.push(newTime)
        }
        return ReturnMethods.returnSuccess(timeArray);
    }

    /**
     *
     * Set reminders for a given list of times for which the reminder should be set
     *
     * Time list should be list of objects of the form:
     *
     * {
     *     minutes: mins,
     *     hours: hrs,
     *     dayOfWeek: [0-6]
     * }
     *
     * @param config
     * @param bot
     * @param participant
     * @param chatId
     * @param timeList
     * @returns {Promise<{returnCode: number, successData: *, failData: *}|{returnCode: *, successData: *, failData: *}|{returnCode: *, data: *}|{returnCode: number, data: *}>}
     */
    static async setReminder(config, bot, participant, chatId, timeList){
        let failedJobs = [];
        let succeededJobs = [];

        let dbJobs = [];

        // Create a new scheduled job for each reminder, calculating the time offset each time
        for(let i = 0; i < timeList.length; i++){
            let newTime = timeList[i];
            let curJobObj = this.createReminderJob(config, bot, participant, chatId, newTime, i===0,
                i===timeList.length-1);
            if(curJobObj.returnCode === DevConfig.FAILURE_CODE){
                failedJobs.push(curJobObj.data);
            } else {
                succeededJobs.push(curJobObj.data);
                // this.scheduledReminders[curJobObj.data.jobId] = curJobObj.data.job;
                dbJobs.push({
                    jobId : curJobObj.data.jobId,
                    minutes : newTime.minutes,
                    hours : newTime.hours,
                    dayOfWeek: newTime.dayOfWeek
                });
            }
        }

        // Write all these jobs to database
        let writeObj = await this.writeRemindersToDB(participant.uniqueId, dbJobs);

        // Cancel all set reminders in case of failure
        if(writeObj.returnCode === DevConfig.FAILURE_CODE){
            for(const [jobId, job] of Object.entries(scheduler.scheduledJobs)){
                if(jobId.startsWith(''+participant.uniqueId+'_r')) {
                    job.cancel();
                }
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
        for(const [jobId, job] of Object.entries(scheduler.scheduledJobs)){
            if(jobId.startsWith(''+uniqueId+'_r')) {
                currentJobIds.push(jobId);
            }
        }

        let succeededJobs = [];
        let failedJobs = [];

        // Remove jobs from scheduled reminders after cancelling
        for(let i = 0; i < currentJobIds.length; i++){
            let curJob = currentJobIds[i];
            try{
                scheduler.scheduledJobs[curJob].cancel();
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
                minutes : schRems[i].minutes,
                dayOfWeek: schRems[i].dayOfWeek
            };
            let curJobObj = this.createReminderJob(config, bot, participant, chatId, currentTime,
                i===0, i===schRems.length);
            if(curJobObj.returnCode === DevConfig.FAILURE_CODE){
                failedJobs.push(curJobObj.data);
            } else {
                succeededJobs.push({
                    jobId : schRems[i].jobId,
                    job: curJobObj.data.job
                });
                // this.scheduledReminders[schRems[i].jobId] = curJobObj.data.job;
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

        let cancelObj = this.cancelJobsForId(participant.uniqueId);

        if(cancelObj.returnCode === DevConfig.PARTIAL_FAILURE_CODE){
            return ReturnMethods.returnFailure(cancelObj.failData);
        } else if(cancelObj.returnCode === DevConfig.FAILURE_CODE){
            return cancelObj;
        }

        let deleteObj = await this.removeJobsForId(participant);
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