const participants = require('./apiControllers/participantApiController');
const idMaps = require('./apiControllers/idMapApiController');
const scheduler = require('node-schedule');
const QuestionHandler = require('./questionHandler')
const ReturnMethods = require('./returnMethods');
const Communicator = require('./communicator')
const assert = require('chai').assert
const DevConfig = require('../json/devConfig.json');
const sendQuestion = require('./logicHandler').sendQuestion;
const ConfigParser = require('./configParser');
const ExperimentUtils = require('./experimentUtils')

class ScheduleHandler{
    static dayIndexOrdering = ["Sun","Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    static scheduledOperations = {
        "questions" : {},
        "cancels" : {},
        "schedules" : {}
    };
    static debugQueue = {};
    static debugQueueAdjusted = {}
    /**
     *
     * Delete all jobs for a given participant from the local scheduling queue
     * as well as from the database
     *
     * @param uniqueId unique ID of the participant
     * @returns {Promise<{returnCode: *, successData: *, failData: *}|{returnCode: *, data: *}>}
     */
    static async removeAllJobsForParticipant(uniqueId){

        // Get all the scheduled operations from the local store
        let scheduledQs = this.scheduledOperations["questions"];
        let partJobIDList = [];

        // Find those operations which belong to the current participant
        // based on the job ID (starts with participant ID)
        for(const [jobId, job] of Object.entries(scheduledQs)){
            if(jobId.startsWith(''+uniqueId)){
                partJobIDList.push(jobId);
            }
        }
        let failedRemovals = [];
        let succeededRemovals = [];

        // Call the function to remove each selected job by jobID
        // register which were successes and which were failures
        for(let i = 0; i < partJobIDList.length; i++){
            let returnObj = await this.removeJobByID(partJobIDList[i]);
            if(returnObj.returnCode === DevConfig.FAILURE_CODE){
                failedRemovals.push(returnObj.data);
            } else {
                succeededRemovals.push(returnObj.data)
            }
        }

        // Return the appropriate outcome (failure, partial failure, success)
        if(failedRemovals.length > 0) {
            if(succeededRemovals.length === 0){
                return ReturnMethods.returnFailure("Scheduler: failed to schedule the following questions:\n"+
                    failedRemovals.join('\n'));
            }
            return ReturnMethods.returnPartialFailure("Scheduler: failed to schedule the following questions:\n"+
                failedRemovals.join('\n'), succeededRemovals);
        }
        if(uniqueId in this.debugQueue) {
            delete this.debugQueue[uniqueId];
            delete this.debugQueueAdjusted[uniqueId];
        }
        return ReturnMethods.returnSuccess(succeededRemovals)

    }

    /**
     *
     * Cancel all the jobs for a given participant from local store
     * but don't remove from database
     *
     * @param uniqueId uniqueID of the participant
     * @returns {Promise<{returnCode: *, successData: *, failData: *}|{returnCode: *, data: *}>}
     */
    static async cancelAllJobsForParticipant(uniqueId){
        // Get all the scheduled operations from the local store
        let scheduledQs = this.scheduledOperations["questions"];
        let partJobIDList = [];

        // Find those operations which belong to the current participant
        // based on the job ID (starts with participant ID)
        for(const [jobId, job] of Object.entries(scheduledQs)){
            if(jobId.startsWith(''+uniqueId)){
                partJobIDList.push(jobId);
            }
        }
        let failedRemovals = [];
        let succeededRemovals = [];

        // Call the function to cancel each selected job by jobID
        // register which were successes and which were failure
        for(let i = 0; i < partJobIDList.length; i++){
            let returnObj = await this.cancelQuestionByJobID(partJobIDList[i]);
            if(returnObj.returnCode === DevConfig.FAILURE_CODE){
                failedRemovals.push(returnObj.data);
            } else {
                succeededRemovals.push(returnObj.data)
            }
        }

        // Return the appropriate outcome (failure, partial failure, success)
        if(failedRemovals.length > 0) {
            if(succeededRemovals.length === 0){
                return ReturnMethods.returnFailure("Scheduler: failed to schedule the following questions:\n"+
                    failedRemovals.join('\n'));
            }
            return ReturnMethods.returnPartialFailure("Scheduler: failed to schedule the following questions:\n"+
                failedRemovals.join('\n'), succeededRemovals);
        }
        return ReturnMethods.returnSuccess(succeededRemovals)
    }

    /**
     *
     * Cancel a single job from the local store as well as remove it
     * from the database based on the jobId
     *
     * @param jobId ID of the job to be cancelled
     * @returns {Promise<{returnCode: *, data: *}|{returnCode: *, data: *}>}
     */
    static async removeJobByID(jobId){
        let uniqueId;
        // Attempt to get the participant ID from the jobID
        // And then call the DB Api controller to remove that jobID from DB
        try{
            uniqueId = jobId.split('_')[0];
            assert(!isNaN(parseInt(uniqueId)));
            await participants.removeScheduledQuestion(uniqueId, jobId);

        } catch(err) {
            return ReturnMethods.returnFailure("Scheduler: Cannot remove job " + jobId);
        }
        // Cancel the job
        return this.cancelQuestionByJobID(jobId);

    }

    /**
     *
     * Cancel a single job by job ID but do not remove from DB.
     *  Cancelling means that the operation will no longer be scheduled
     *
     * @param jobId ID of the job to be cancelled
     * @returns {{returnCode: *, data: *}}
     */
    static cancelQuestionByJobID(jobId){
        try{
            // Get the job and cancel it, and then remove it from the local store entirely
            this.scheduledOperations["questions"][jobId].cancel();
            delete this.scheduledOperations["questions"][jobId];
        } catch(err){
            return ReturnMethods.returnFailure("Scheduler: Failed to cancel job " + jobId);
        }
        return ReturnMethods.returnSuccess(jobId)
    }

    /**
     *
     * Reschedule all operations by fetching all scheduled operations
     * from DB for each participant
     *
     * @param bot Telegram bot instance
     * @param config loaded configuration file of experiment
     * @returns {Promise<{returnCode: *, successData: *, failData: *}|{returnCode: *, data: *}>}
     */
    static async rescheduleAllOperations(bot, config){
        let allParticipants = await participants.getAll();
        let failedParticipants = [];
        let succeededParticipants = [];
        // Loop through all participants
        for(let i = 0; i < allParticipants.length; i++){
            let curPart = allParticipants[i];

            // Call the function to reschedule all operations for a given participant
            let returnObj = await this.rescheduleAllOperationsForID(bot, curPart.uniqueId, config);
            if(returnObj.returnCode === DevConfig.SUCCESS_CODE){
                // Append returned jobs to array of succeeded jobs
                succeededParticipants.push(...returnObj.data);
            } else {
                failedParticipants.push(curPart.uniqueId);
            }
        }

        if(failedParticipants.length > 0) {
            if(succeededParticipants.length === 0){
                return ReturnMethods.returnFailure("Scheduler: failed to reschedule all for the following participants:\n"+
                    failedParticipants.join('\n'));
            }
            return ReturnMethods.returnPartialFailure("Scheduler: failed to reschedule all for the following participants:\n"+
                failedParticipants.join('\n'), succeededParticipants);
        }
        return ReturnMethods.returnSuccess(succeededParticipants)
    }

    /**
     *
     * Reschedule all the operations for a single participant by fetching
     * their scheduled jobs from the DB
     *
     * @param bot Telegram bot instance
     * @param uniqueId uniqueID of the participant whose jobs are to be rescheduled
     * @param config loaded config file of experiment
     * @returns {Promise<{returnCode: *, successData: *, failData: *}|{returnCode: *, data: *}>}
     */
    static async rescheduleAllOperationsForID(bot, uniqueId, config){

        // Get the participant from DB and read all scheduled operations
        let participant = await participants.get(uniqueId);
        let scheduledOperations = participant.scheduledOperations;
        let scheduledQuestions = scheduledOperations["questions"];
        const qHandler = new QuestionHandler(config);
        let failedQuestions = [];
        let succeededQuestions = [];

        // Go through each scheduled Question for participant
        for(let i = 0; i < scheduledQuestions.length; i++){
            let jobInfo = scheduledQuestions[i];
            // Construct the proper object and call the function to schedule
            let questionInfo = {
                qId : jobInfo.qId,
                atTime : jobInfo.atTime,
                onDays : jobInfo.onDays,
                if: jobInfo.if,
                tz: participant.parameters.timezone
            }
            let returnObj = await this.scheduleOneQuestion(bot, uniqueId, qHandler, questionInfo, config,false);
            if(returnObj.returnCode === DevConfig.FAILURE_CODE){
                failedQuestions.push(returnObj.data);
            } else if(returnObj.returnCode === DevConfig.SUCCESS_CODE){
                succeededQuestions.push(returnObj.data);
            }
        }

        if(failedQuestions.length > 0) {
            if(succeededQuestions.length === 0){
                return ReturnMethods.returnFailure("Scheduler: failed to reschedule the following questions:\n"+
                    failedQuestions.join('\n'));
            }
            return ReturnMethods.returnPartialFailure("Scheduler: failed to reschedule the following questions:\n"+
                failedQuestions.join('\n'), succeededQuestions);
        }
        // Add temporally ordered scheduled questions to participant's debug queue:
        this.debugQueue[uniqueId] = this.getTemporalOrderArray(scheduledQuestions);
        this.debugQueueAdjusted[uniqueId] = false;

        return ReturnMethods.returnSuccess(succeededQuestions)
    }

    /**
     *
     * Schedule all the questions for a given participant, as specified in the
     * config file, based on the condition participant is assigned to
     *
     * @param bot Telegram bot instance
     * @param uniqueId uniqueId of the participant for whom questions are to be scheduled
     * @param config loaded config file of experiment
     * @param debug flag whether in debug mode or not
     * @returns {Promise<{returnCode: number, data}|{returnCode: *, data: *}|{returnCode: *, successData: *, failData: *}>}
     */

    static async scheduleAllQuestions(bot, uniqueId, config, debug = false){
        const qHandler = new QuestionHandler(config);
        const participant = await participants.get(uniqueId);

        // Get the assigned condition and preferred language of the participant
        let partCond = participant["conditionName"];
        let partLang = participant.parameters.language;

        // Fetch all the scheduled questions for the particular condition
        let schQObj = qHandler.getScheduledQuestions(partCond);
        if(schQObj.returnCode === DevConfig.FAILURE_CODE){
            return schQObj;
        }
        let scheduledQuestionsList = schQObj.data;
        let failedQuestions = [];
        let succeededQuestions = [];

        // loop through all fetched questions that are to be scheduled
        for(let i = 0; i < scheduledQuestionsList.length; i++){
            // Append participant timezone to scheduled question
            let scheduledQuestionInfo = scheduledQuestionsList[i];
            scheduledQuestionInfo["tz"] = participant.parameters.timezone;

            // Call the function to schedule a single operation
            let scheduleObj = await this.scheduleOneQuestion(bot, uniqueId, qHandler, scheduledQuestionInfo, config,true);
            if(scheduleObj.returnCode === DevConfig.FAILURE_CODE){
                failedQuestions.push(scheduleObj.data)
            } else if(scheduleObj.returnCode === DevConfig.SUCCESS_CODE){
                // If successful, send a message to the participant that a particular question
                // has been scheduled
                let secretMap = await idMaps.getByUniqueId(config.experimentId, uniqueId);
                if(!secretMap){
                    return ReturnMethods.returnFailure("Scheduler: Cannot find participant chat ID");
                }
                let chatId = secretMap.chatId;
                // TODO: send a message about the scheduled messages anyway, or only when debug mode?
                if(config.debug.actionMessages) {
                    await Communicator.sendMessage(bot, participant, chatId,
                        "(Debug) " + config.phrases.schedule.scheduleNotif[partLang]
                        + '\n' + scheduledQuestionInfo.atTime + " - " + scheduledQuestionInfo.onDays.join(', '), true);
                }
                succeededQuestions.push(scheduleObj.data)
            }
        }

        if(failedQuestions.length > 0) {
            if(succeededQuestions.length === 0){
                return ReturnMethods.returnFailure("Scheduler: failed to schedule the following questions:\n"+
                    failedQuestions.join('\n'));
            }
            return ReturnMethods.returnPartialFailure("Scheduler: failed to schedule the following questions:\n"+
                failedQuestions.join('\n'), succeededQuestions);
        }
        // Add temporally ordered scheduled questions to participant's debug queue:
        this.debugQueue[uniqueId] = this.getTemporalOrderArray(scheduledQuestionsList);
        this.debugQueueAdjusted[uniqueId] = false;

        return ReturnMethods.returnSuccess(succeededQuestions)
    }

    /**
     *
     * For debug purposes: overrides the scheduled timing in a given
     * array (of the format that scheduledQuestions takes in the config file)
     * and replaces them with times that represent successive questions at
     * regular intervals from a given start time,
     *
     *
     * @param scheduledQuestions the array in which the times are to be replaced
     *                      must be a reference to the "scheduledQuestions" array in
     *                      the loaded config file, so that the original timings can
     *                      be overwritten
     * @param startTime the time from which the new timings of questions should start
     * @param interval the interval between each successive question
     */

    static overrideScheduleForIntervals(scheduledQuestions, startTime, interval){
        let now = startTime;
        let minutes = now.minutes;
        let hours = now.hours;

        // Loop through all questions and replace timing in the original array
        // with new computed times and schedule to occur on all days
        for(let i = 0; i < scheduledQuestions.length; i++) {
            let qHours = hours;
            let qMins = minutes + ((i + 1) * interval);
            if (qMins >= 60) {
                qHours += 1;
                qMins -= 60;
            }
            qHours %= 24;
            let timeString = (qHours < 10 ? '0' : '') + qHours + ':' + (qMins < 10 ? '0' : '') + (qMins);
            let newSchedObj = {
                qId: scheduledQuestions[i].qId,
                atTime: timeString,
                onDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                if: scheduledQuestions[i].if
            };
            scheduledQuestions[i] = newSchedObj;
        }
    }

    /**
     *
     * Build the node-schedule recurrence rule based on the
     * information provided
     *
     * @param questionInfo information about the question to be scheduled
     *                      {
     *                          qId: question ID of question,
     *                          atTime: "HH:MM" time to be scheduled,
     *                          onDays: ["Mon", "Tue", ... etc.] days on which to schedule
     *                          tz: tz-database format timezone string (e.g., "Europe/Berlin")
     *                      }
     * @returns {{returnCode: *, data: *}}
     */
    static buildRecurrenceRule(questionInfo){
        let scheduleHours, scheduleMins;

        // Parse the time string into hours and minutes
        try{
            let scheduleTime = questionInfo.atTime;
            let scheduleTimeSplit = scheduleTime.split(":");
            if(scheduleTimeSplit.length !== 2) throw "Scheduler: Time format wrong"
            scheduleHours = parseInt(scheduleTimeSplit[0]);
            scheduleMins = parseInt(scheduleTimeSplit[1]);

        } catch (err){
            let errorMsg = "Scheduler: " + questionInfo.qId + " - Time in the inappropriate format or not specified"
            return ReturnMethods.returnFailure(errorMsg);
        }
        let scheduleDayIndices = [];

        // Convert the given days in array onDays into indices for the recurrence rule
        // Cron type scheduling uses 0 as Sunday and 6 as Saturday
        try{
            let scheduleDays = questionInfo.onDays;
            for(let i = 0; i < scheduleDays.length; i++){
                let idx = this.dayIndexOrdering.indexOf(scheduleDays[i]);
                if(idx === -1) throw "Scheduler: " + questionInfo.qId + " - Day not recognized";
                else {
                    if(!scheduleDayIndices.includes(idx)){
                        scheduleDayIndices.push(idx)
                    }
                }
            }
        } catch(err){
            let errorMsg = "Scheduler: " + questionInfo.qId + " - On days in incorrect format or not specified"
            return ReturnMethods.returnFailure(errorMsg)
        }

        // Build recurrence rule and return
        let rule = new scheduler.RecurrenceRule();
        rule.dayOfWeek = scheduleDayIndices;
        rule.hour = scheduleHours;
        rule.minute = scheduleMins;
        rule.tz = questionInfo.tz;

        return ReturnMethods.returnSuccess(rule)
    }

    /**
     *
     * Write operation info to database, if not already present in database
     *
     * @param uniqueId uniqueId of the participant for whom job is being scheduled
     * @param jobId ID of the job being scheduled
     * @param questionInfo Info about the question that is being scheduled
     * @returns {Promise<{returnCode: *, data: *}>}
     */
    static async writeOperationInfoToDB(uniqueId, jobId, questionInfo){
        let jobInfo = {
            jobId: jobId,
            qId: questionInfo.qId,
            atTime: questionInfo.atTime,
            onDays: questionInfo.onDays,
            if: questionInfo.if,
            tz: questionInfo.tz
        }
        // Check if already not in scheduledQuestions
        try{
            let alreadyInDB = await participants.hasScheduledQuestion(uniqueId, jobInfo);
            if(!alreadyInDB){
                await participants.addScheduledQuestion(uniqueId, jobInfo);
            }
            return ReturnMethods.returnSuccess(jobInfo);
        } catch(err){
            return ReturnMethods.returnFailure("Scheduler: Unable to write job to DB\n" + err)
        }

    }

    /**
     *
     * Schedule a single question for a participant
     *
     * @param bot Telegram bot instance
     * @param uniqueId uniqueID of participant for whom q is to be scheduled
     * @param qHandler QuestionHandler instance with loaded expt config file
     * @param questionInfo info of question to be scheduled
     * @param config loaded expt config file
     * @param isNew flag whether question is new or not (i.e., already present in DB or not)
     * @returns {Promise<{returnCode: *, data: *}>}
     */
    static async scheduleOneQuestion(bot, uniqueId, qHandler, questionInfo, config, isNew = true){
        if(!("qId" in questionInfo)){
            return ReturnMethods.returnFailure("Scheduler: Question ID not specified")
        }

        // Build the recurrence rule
        let recurrenceRuleObj = this.buildRecurrenceRule(questionInfo);
        if(recurrenceRuleObj.returnCode === DevConfig.FAILURE_CODE) {
            return ReturnMethods.returnFailure(recurrenceRuleObj.data)
        }
        let recRule = recurrenceRuleObj.data;

        // Construct the jobID for the job
        let jobId = uniqueId + "_" + questionInfo.qId + "_"  + recRule.hour + "" + recRule.minute + "_" + recRule.dayOfWeek.join("");
        let participant;
        try{
            participant = await participants.get(uniqueId);
        } catch(err){
            return ReturnMethods.returnFailure("Scheduler: Unable to fetch participant " + uniqueId + "\n"+err)
        }

        // Get the assigned condition and preferred language of the participant
        let partLang = participant.parameters.language;
        let partCond = participant["conditionName"];

        // Construct the question based on the assigned condition and preferred language
        let questionObj = qHandler.constructQuestionByID(partCond, questionInfo.qId, partLang);
        if(questionObj.returnCode === DevConfig.FAILURE_CODE) {
            return ReturnMethods.returnFailure(questionObj.data);
        }
        let question = questionObj.data;

        let job;
        try{
            // Get the telegram chatID of the participant
            let secretMap = await idMaps.getByUniqueId(config.experimentId, uniqueId);
            if(!secretMap){
                return ReturnMethods.returnFailure("Scheduler: Cannot find participant chat ID");
            }
            let chatId = secretMap.chatId;

            // Schedule the question to be sent
            job = scheduler.scheduleJob(recRule, async function(){
                // Get the updated participant
                let newParticipant;
                try {
                    newParticipant = await participants.get(uniqueId);
                } catch(err){
                    console.log(err);
                }
                let evaluation = true;
                if(questionInfo.if){
                    let userInfo = await bot.telegram.getChat(chatId);
                    newParticipant["firstName"] = userInfo["first_name"];
                    let evaluationObj = ConfigParser.evaluateConditionString(newParticipant, questionInfo.if);
                    if(evaluationObj.returnCode === DevConfig.SUCCESS_CODE){
                        evaluation = evaluationObj.data.value;
                    } else {
                        evaluation = false;
                    }
                }
                if(evaluation){
                    await sendQuestion(bot, newParticipant, chatId, question, !config.debug.messageDelay);
                }
            })
            // Add to local store and if necessary, to DB
            this.scheduledOperations["questions"][jobId] = job;
            if(isNew) {
                let writeReturn = await this.writeOperationInfoToDB(uniqueId, jobId, questionInfo);
                if(writeReturn.returnCode === DevConfig.FAILURE_CODE){
                    return writeReturn;
                }
            }
        } catch(err){
            let errorMsg = "Scheduler: Unable to schedule with given params"
            return ReturnMethods.returnFailure(errorMsg);
        }
        return ReturnMethods.returnSuccess({
            jobId: jobId,
            job: job
        });
    }

    /**
     *
     * Takes a list of questions that occur on the same day and
     * sorts them based on the time of day that they are scheduled
     *
     * @param qInfoArray array of questions
     * @returns {*[]|*}
     */
    static sortQInfoByTime(qInfoArray){
        if(!Array.isArray(qInfoArray)) return [];
        if(qInfoArray.length === 0) return qInfoArray;
        let arrayCopy = qInfoArray.slice();
        let sortedArray = []
        while(arrayCopy.length > 0){
            let earliestTime = 2400;
            let earliestTimeIdx = 0;
            // Get the question that is at the earliest time
            for(let i = 0; i < arrayCopy.length; i++){
                let timeInt = parseInt(arrayCopy[i].atTime.replace(/:/g, ""));
                if(timeInt < earliestTime){
                    earliestTimeIdx = i;
                    earliestTime = timeInt;
                }
            }
            sortedArray.push(arrayCopy[earliestTimeIdx]);
            arrayCopy.splice(earliestTimeIdx, 1);
        }
        return sortedArray;
    }


    /**
     *
     * Goes through the entire week to form a temporally-ordered list
     * of all the questions that are scheduled to be asked.
     *
     * This is used for debug purposes to scroll through the list of questions
     *
     * List is repeated for n weeks to capture full duration of experiment
     *
     * @param qInfoArray array of all the scheduled questions as specified in config file
     * @param numWeeks the number of weeks to repeat
     * @returns {*[]|*}
     */
    static getTemporalOrderArray(qInfoArray, numWeeks){
        if(!Array.isArray(qInfoArray)) return [];
        if(qInfoArray.length === 0) return qInfoArray;
        // Loop through all days, starting from Sunday
        let tempOrderArr = []
        for(let dayIdx = 0;dayIdx < this.dayIndexOrdering.length; dayIdx++){
            let curDay = this.dayIndexOrdering[dayIdx];
            let dayQuestions = []
            // Get all questions that are to be asked on this day
            for(let i = 0; i < qInfoArray.length; i++){
                let curQuestion = qInfoArray[i];
                if(curQuestion.onDays.includes(curDay)){
                    dayQuestions.push(curQuestion);
                }
            }
            // Sort the questions of the day by time and add them to the temporal order array
            let sortedDayQs = this.sortQInfoByTime(dayQuestions);
            for(let i = 0; i < sortedDayQs.length; i++){
                tempOrderArr.push({
                    qId: sortedDayQs[i].qId,
                    atTime: sortedDayQs[i].atTime,
                    onDays: [curDay],
                    if: sortedDayQs[i].if
                })
            }
        }
        let repeatedArray = [].concat(...Array(numWeeks).fill(tempOrderArr));
        return repeatedArray;
    }

    /**
     *
     * Takes a given date and then rotates the array to the left
     * until the first member of the array is the next question
     * based on the passed date
     *
     * @param qInfoArray the array to be shifted (sorted in temporal order
     *                  of days of the week and time of the question)
     * @param date moment timezone date
     *
     * @returns the array rotated so that the first in the list corresponds
     *          to the question in the list which would occurs next after the
     *          time/day mentioned in the given date
     */
    static shiftTemporalOrderArray(qInfoArray, date){
        if(!Array.isArray(qInfoArray)) return [];
        if(qInfoArray.length === 0) return qInfoArray;

        let dateObjObj = ExperimentUtils.parseMomentDateString(date.format());
        if(dateObjObj.returnCode === DevConfig.FAILURE_CODE){
            return [];
        }
        let dateObj = dateObjObj.data;
        let diffObj = {
            dayIndex: dateObj.dayOfWeek,
            time: (dateObj.hours < 10 ? '0' : '') + dateObj.hours + ":" + (dateObj.minutes < 10 ? '0' : '') + dateObj.minutes
        };

        let closestQIdx = 0;
        let leastTimeDiff = 10080;

        for(let i = 0; i < qInfoArray.length; i++){
            let curDay = qInfoArray[i].onDays[0];
            let curDayIdx = this.dayIndexOrdering.indexOf(curDay);
            let curTime = qInfoArray[i].atTime;
            let diff = ExperimentUtils.getMinutesDiff(diffObj,{
                dayIndex: curDayIdx,
                time: curTime
            })

            if(diff < leastTimeDiff){
                closestQIdx = i;
                leastTimeDiff = diff;
            }
        }
        ExperimentUtils.rotateLeftByMany(qInfoArray,closestQIdx);

        return qInfoArray;
    }


}

module.exports = ScheduleHandler;