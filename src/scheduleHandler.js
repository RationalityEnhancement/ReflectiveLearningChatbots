const participants = require('./apiControllers/participantApiController');
const idMaps = require('./apiControllers/idMapApiController');
const scheduler = require('node-schedule');
const QuestionHandler = require('./questionHandler')
const ReturnMethods = require('./returnMethods');
const MessageSender = require('./messageSender')
const assert = require('chai').assert
const DevConfig = require('../json/devConfig.json');

class ScheduleHandler{
    static dayIndexOrdering = ["Sun","Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    static scheduledOperations = {
        "questions" : {},
        "cancels" : {},
        "schedules" : {}
    };

    static async removeAllJobsForParticipant(uniqueId){
        let scheduledQs = this.scheduledOperations["questions"];
        let partJobIDList = [];
        for(const [jobId, job] of Object.entries(scheduledQs)){
            if(jobId.startsWith(''+uniqueId)){
                partJobIDList.push(jobId);
            }
        }
        let failedRemovals = [];
        let succeededRemovals = [];
        for(let i = 0; i < partJobIDList.length; i++){
            let returnObj = await this.removeJobByID(partJobIDList[i]);
            if(returnObj.returnCode === DevConfig.FAILURE_CODE){
                failedRemovals.push(returnObj.data);
            } else {
                succeededRemovals.push(returnObj.data)
            }
        }
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

    static async cancelAllJobsForParticipant(uniqueId){
        let scheduledQs = this.scheduledOperations["questions"];
        let partJobIDList = [];
        for(const [jobId, job] of Object.entries(scheduledQs)){
            if(jobId.startsWith(''+uniqueId)){
                partJobIDList.push(jobId);
            }
        }
        let failedRemovals = [];
        let succeededRemovals = [];
        for(let i = 0; i < partJobIDList.length; i++){
            let returnObj = await this.cancelQuestionByJobID(partJobIDList[i]);
            if(returnObj.returnCode === DevConfig.FAILURE_CODE){
                failedRemovals.push(returnObj.data);
            } else {
                succeededRemovals.push(returnObj.data)
            }
        }
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

    static async removeJobByID(jobId){
        let uniqueId;
        try{
            uniqueId = jobId.split('_')[0];
            assert(!isNaN(parseInt(uniqueId)));
            await participants.removeScheduledQuestion(uniqueId, jobId);

        } catch(err) {
            return ReturnMethods.returnFailure("Scheduler: Cannot remove job " + jobId);
        }
        return this.cancelQuestionByJobID(jobId);

    }
    static cancelQuestionByJobID(jobId){
        try{
            this.scheduledOperations["questions"][jobId].cancel();
            delete this.scheduledOperations["questions"][jobId];
        } catch(err){
            return ReturnMethods.returnFailure("Scheduler: Failed to cancel job " + jobId);
        }
        return ReturnMethods.returnSuccess(jobId)
    }

    static async rescheduleAllOperations(bot, config){
        let allParticipants = await participants.getAll();
        let failedParticipants = [];
        let succeededParticipants = [];
        for(let i = 0; i < allParticipants.length; i++){
            let curPart = allParticipants[i];
            // TODO: change chatID to uniqueID
            let returnObj = await this.rescheduleAllOperationsForID(bot, curPart.chatId, config);
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
    static async rescheduleAllOperationsForID(bot, uniqueId, config){
        let participant = await participants.get(uniqueId);
        let scheduledOperations = participant.scheduledOperations;
        let scheduledQuestions = scheduledOperations["questions"];
        const qHandler = new QuestionHandler(config);
        let failedQuestions = [];
        let succeededQuestions = [];
        for(let i = 0; i < scheduledQuestions.length; i++){
            let jobInfo = scheduledQuestions[i];
            let questionInfo = {
                qId : jobInfo.qId,
                atTime : jobInfo.atTime,
                onDays : jobInfo.onDays,
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
        return ReturnMethods.returnSuccess(succeededQuestions)
    }
    static async scheduleAllQuestions(bot, uniqueId, config, debug = false){
        const qHandler = new QuestionHandler(config);
        const participant = await participants.get(uniqueId);

        let partCond = participant["conditionName"];
        let partLang = participant.parameters.language;
        let schQObj = qHandler.getScheduledQuestions(partCond);
        if(schQObj.returnCode === DevConfig.FAILURE_CODE){
            return schQObj;
        }
        let scheduledQuestionsList = schQObj.data;
        let failedQuestions = [];
        let succeededQuestions = [];
        for(let i = 0; i < scheduledQuestionsList.length; i++){
            let scheduledQuestionInfo = scheduledQuestionsList[i];
            scheduledQuestionInfo["tz"] = participant.parameters.timezone;
            let scheduleObj = await this.scheduleOneQuestion(bot, uniqueId, qHandler, scheduledQuestionInfo, config,true);
            if(scheduleObj.returnCode === DevConfig.FAILURE_CODE){
                failedQuestions.push(scheduleObj.data)
            } else if(scheduleObj.returnCode === DevConfig.SUCCESS_CODE){
                let secretMap = await idMaps.getByUniqueId(config.experimentId, uniqueId);
                if(!secretMap){
                    return ReturnMethods.returnFailure("Scheduler: Cannot find participant chat ID");
                }
                let chatId = secretMap.chatId;
                // TODO: send a message about the scheduled messages anyway, or only when debug mode?
                if(debug || !debug) {
                    await MessageSender.sendMessage(bot, chatId,
                        config.phrases.schedule.scheduleNotif[partLang]
                        + '\n' + scheduledQuestionInfo.atTime + " - " + scheduledQuestionInfo.onDays.join(', '));
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
        return ReturnMethods.returnSuccess(succeededQuestions)
    }
   
    // Schedule questions at regular intervals from current time
    // Ignores original scheduled questions for debugging purposes
    static overrideScheduleForIntervals(scheduledQuestions, startTime, interval){
        let now = startTime;
        let minutes = now.minutes;
        let hours = now.hours;
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
                onDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            };
            scheduledQuestions[i] = newSchedObj;
        }
    }
    static buildRecurrenceRule(questionInfo){
        let scheduleHours, scheduleMins;
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
        let rule = new scheduler.RecurrenceRule();
        rule.dayOfWeek = scheduleDayIndices;
        rule.hour = scheduleHours;
        rule.minute = scheduleMins;
        rule.tz = questionInfo.tz;

        return ReturnMethods.returnSuccess(rule)
    }
    static async writeOperationInfoToDB(uniqueId, jobId, questionInfo){
        let jobInfo = {
            jobId: jobId,
            qId: questionInfo.qId,
            atTime: questionInfo.atTime,
            onDays: questionInfo.onDays,
            tz: questionInfo.tz
        }
        // Check if already not in scheduledQuestions
        let alreadyInDB = await participants.hasScheduledQuestion(uniqueId, jobInfo);
        if(!alreadyInDB){
            await participants.addScheduledQuestion(uniqueId, jobInfo);
        }
    }
    static async scheduleOneQuestion(bot, uniqueId, qHandler, questionInfo, config, isNew = true){
        if(!("qId" in questionInfo)){
            return ReturnMethods.returnFailure("Scheduler: Question ID not specified")
        }
        let recurrenceRuleObj = this.buildRecurrenceRule(questionInfo);
        if(recurrenceRuleObj.returnCode === DevConfig.FAILURE_CODE) {
            return ReturnMethods.returnFailure(recurrenceRuleObj.data)
        }
        let recRule = recurrenceRuleObj.data;
        let jobId = uniqueId + "_" + questionInfo.qId + "_"  + recRule.hour + "" + recRule.minute + "_" + recRule.dayOfWeek.join("");

        // Assuming error handling in API Controller
        let participant = await participants.get(uniqueId);
        let partLang = participant.parameters.language;
        let partCond = participant["conditionName"];

        let questionObj = qHandler.constructQuestionByID(partCond, questionInfo.qId, partLang);
        if(questionObj.returnCode === DevConfig.FAILURE_CODE) {
            return ReturnMethods.returnFailure(questionObj.data);
        }
        let question = questionObj.data;
        let job;
        try{
            // console.log(config.experimentId)
            // console.log(uniqueId);
            let secretMap = await idMaps.getByUniqueId(config.experimentId, uniqueId);
            let test = await idMaps.getExperiment(config.experimentId);
            // console.log(test);
            // console.log(secretMap);
            if(!secretMap){
                return ReturnMethods.returnFailure("Scheduler: Cannot find participant chat ID");
            }
            let chatId = secretMap.chatId;
            job = scheduler.scheduleJob(recRule, async function(){
                await MessageSender.sendQuestion(bot, chatId, question);
            })
            this.scheduledOperations["questions"][jobId] = job;
            if(isNew) await this.writeOperationInfoToDB(uniqueId, jobId, questionInfo);
        } catch(err){
            let errorMsg = "Scheduler: Unable to schedule with given params"
            return ReturnMethods.returnFailure(errorMsg);
        }
        return ReturnMethods.returnSuccess({
            jobId: jobId,
            job: job
        });
    }
}

module.exports = ScheduleHandler;