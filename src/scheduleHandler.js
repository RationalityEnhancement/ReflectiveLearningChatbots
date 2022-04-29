const participants = require('./apiControllers/participantApiController');
const scheduler = require('node-schedule');
const QuestionHandler = require('./questionHandler')
const MessageSender = require('./messageSender')
const assert = require('chai').assert
const moment = require('moment-timezone');

class ScheduleHandler{
    static dayIndexOrdering = ["Sun","Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    static scheduledOperations = {
        "questions" : {},
        "cancels" : {},
        "schedules" : {}
    };

    static async removeAllJobsForParticipant(chatId){
        let scheduledQs = this.scheduledOperations["questions"];
        let partJobIDList = [];
        for(const [jobId, job] of Object.entries(scheduledQs)){
            if(jobId.startsWith(''+chatId)){
                partJobIDList.push(jobId);
            }
        }
        let failedRemovals = [];
        let succeededRemovals = [];
        for(let i = 0; i < partJobIDList.length; i++){
            let returnObj = await this.removeJobByID(partJobIDList[i]);
            if(returnObj.returnCode === -1){
                failedRemovals.push(returnObj.data);
            } else {
                succeededRemovals.push(returnObj.data)
            }
        }
        if(failedRemovals.length > 0) {
            if(succeededRemovals.length === 0){
                return this.returnFailure("Scheduler: failed to schedule the following questions:\n"+
                    failedRemovals.join('\n'));
            }
            return this.returnPartialFailure("Scheduler: failed to schedule the following questions:\n"+
                failedRemovals.join('\n'), succeededRemovals);
        }
        return this.returnSuccess(succeededRemovals)

    }

    static async cancelAllJobsForParticipant(chatId){
        let scheduledQs = this.scheduledOperations["questions"];
        let partJobIDList = [];
        for(const [jobId, job] of Object.entries(scheduledQs)){
            if(jobId.startsWith(''+chatId)){
                partJobIDList.push(jobId);
            }
        }
        let failedRemovals = [];
        let succeededRemovals = [];
        for(let i = 0; i < partJobIDList.length; i++){
            let returnObj = await this.cancelQuestionByJobID(partJobIDList[i]);
            if(returnObj.returnCode === -1){
                failedRemovals.push(returnObj.data);
            } else {
                succeededRemovals.push(returnObj.data)
            }
        }
        if(failedRemovals.length > 0) {
            if(succeededRemovals.length === 0){
                return this.returnFailure("Scheduler: failed to schedule the following questions:\n"+
                    failedRemovals.join('\n'));
            }
            return this.returnPartialFailure("Scheduler: failed to schedule the following questions:\n"+
                failedRemovals.join('\n'), succeededRemovals);
        }
        return this.returnSuccess(succeededRemovals)
    }

    static async removeJobByID(jobId){
        let chatId;
        try{
            chatId = jobId.split('_')[0];
            assert(!isNaN(parseInt(chatId)));
            await participants.removeScheduledQuestion(chatId, jobId);

        } catch(err) {
            return this.returnFailure("Scheduler: Cannot remove job " + jobId);
        }
        return this.cancelQuestionByJobID(jobId);

    }
    static cancelQuestionByJobID(jobId){
        try{
            this.scheduledOperations["questions"][jobId].cancel();
            delete this.scheduledOperations["questions"][jobId];
        } catch(err){
            return this.returnFailure("Scheduler: Failed to cancel job " + jobId);
        }
        return this.returnSuccess(jobId)
    }

    static async rescheduleAllOperations(bot, config){
        let allParticipants = await participants.getAll();
        let failedParticipants = [];
        let succeededParticipants = [];
        for(let i = 0; i < allParticipants.length; i++){
            let curPart = allParticipants[i];
            let returnObj = await this.rescheduleAllOperationsForID(bot, curPart.chatId, config);
            if(returnObj.returnCode === 1){
                // Append returned jobs to array of succeeded jobs
                succeededParticipants.push(...returnObj.data);
            } else {
                failedParticipants.push(curPart.chatId);
            }
        }

        if(failedParticipants.length > 0) {
            if(succeededParticipants.length === 0){
                return this.returnFailure("Scheduler: failed to reschedule all for the following participants:\n"+
                    failedParticipants.join('\n'));
            }
            return this.returnPartialFailure("Scheduler: failed to reschedule all for the following participants:\n"+
                failedParticipants.join('\n'), succeededParticipants);
        }
        return this.returnSuccess(succeededParticipants)
    }
    static async rescheduleAllOperationsForID(bot, chatId, config){
        let participant = await participants.get(chatId);
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
            let returnObj = await this.scheduleOneQuestion(bot, chatId, qHandler, questionInfo, false);
            if(returnObj.returnCode === -1){
                failedQuestions.push(returnObj.data);
            } else if(returnObj.returnCode === 1){
                succeededQuestions.push(returnObj.data);
            }
        }

        if(failedQuestions.length > 0) {
            if(succeededQuestions.length === 0){
                return this.returnFailure("Scheduler: failed to reschedule the following questions:\n"+
                    failedQuestions.join('\n'));
            }
            return this.returnPartialFailure("Scheduler: failed to reschedule the following questions:\n"+
                failedQuestions.join('\n'), succeededQuestions);
        }
        return this.returnSuccess(succeededQuestions)
    }
    static async scheduleAllQuestions(bot, chatId, config, debug = false){
        const qHandler = new QuestionHandler(config);
        const participant = await participants.get(chatId);
        let scheduledQuestionsList = config["scheduledQuestions"];
        let failedQuestions = [];
        let succeededQuestions = [];
        for(let i = 0; i < scheduledQuestionsList.length; i++){
            let scheduledQuestionInfo = scheduledQuestionsList[i];
            scheduledQuestionInfo["tz"] = participant.parameters.timezone;
            let scheduleObj = await this.scheduleOneQuestion(bot, chatId, qHandler, scheduledQuestionInfo,true);
            if(scheduleObj.returnCode === -1){
                failedQuestions.push(scheduleObj.data)
            } else if(scheduleObj.returnCode === 1){
                // TODO: send a message about the scheduled messages anyway, or only when debug mode?
                if(debug || !debug) {
                    await MessageSender.sendMessage(bot, chatId,
                        config.phrases.schedule.scheduleNotif[participant.parameters.language]
                        + '\n' + scheduledQuestionInfo.atTime + " - " + scheduledQuestionInfo.onDays.join(', '));
                }
                succeededQuestions.push(scheduleObj.data)
            }
        }

        if(failedQuestions.length > 0) {
            if(succeededQuestions.length === 0){
                return this.returnFailure("Scheduler: failed to schedule the following questions:\n"+
                    failedQuestions.join('\n'));
            }
            return this.returnPartialFailure("Scheduler: failed to schedule the following questions:\n"+
                failedQuestions.join('\n'), succeededQuestions);
        }
        return this.returnSuccess(succeededQuestions)
    }
    // TODO: Create return handler class with objects returning both fData and sData
    static returnSuccess(data){
        return {
            returnCode : 1,
            data : data
        };
    }
    static returnPartialFailure(failData, successData){
        return {
            returnCode : 0,
            failData : failData,
            successData : successData
        }
    }
    static returnFailure(data){
        return {
            returnCode : -1,
            data : data
        };
    }
    // Schedule questions at regular intervals from current time
    // Ignores original scheduled questions for debugging purposes
    static overrideScheduleForIntervals(scheduledQuestions, startTime, interval){
        let now = startTime;
        let minutes = now.getMinutes();
        let hours = now.getHours();
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
                tz: scheduledQuestions[i].tz;
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
            return this.returnFailure(errorMsg);
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
            return this.returnFailure(errorMsg)
        }
        let rule = new scheduler.RecurrenceRule();
        rule.dayOfWeek = scheduleDayIndices;
        rule.hour = scheduleHours;
        rule.minute = scheduleMins;
        rule.tz = questionInfo.tz;

        return this.returnSuccess(rule)
    }
    static async writeOperationInfoToDB(chatId, jobId, questionInfo){
        let jobInfo = {
            jobId: jobId,
            qId: questionInfo.qId,
            atTime: questionInfo.atTime,
            onDays: questionInfo.onDays,
            tz: questionInfo.tz
        }
        // Check if already not in scheduledQuestions
        let alreadyInDB = await participants.hasScheduledQuestion(chatId, jobInfo);
        if(!alreadyInDB){
            await participants.addScheduledQuestion(chatId, jobInfo);
        }
    }
    static async scheduleOneQuestion(bot, chatId, qHandler, questionInfo, isNew = true){
        if(!("qId" in questionInfo)){
            return this.returnFailure("Scheduler: Question ID not specified")
        }
        let recurrenceRuleObj = this.buildRecurrenceRule(questionInfo);
        if(recurrenceRuleObj.returnCode === -1) {
            return this.returnFailure(recurrenceRuleObj.data)
        }
        let recRule = recurrenceRuleObj.data;
        let jobId = chatId + "_" + questionInfo.qId + "_"  + recRule.hour + "" + recRule.minute + "_" + recRule.dayOfWeek.join("");

        // Assuming error handling in API Controller
        let participant = await participants.get(chatId);
        let questionObj = qHandler.constructQuestionByID(questionInfo.qId, participant.parameters.language);
        if(questionObj.returnCode === -1) {
            return this.returnFailure(questionObj.data);
        }
        let question = questionObj.data;
        let job;
        try{
            job = scheduler.scheduleJob(recRule, async function(){
                await MessageSender.sendQuestion(bot, chatId, question);
            })
            this.scheduledOperations["questions"][jobId] = job;
            if(isNew) await this.writeOperationInfoToDB(chatId, jobId, questionInfo);
        } catch(err){
            let errorMsg = "Scheduler: Unable to schedule with given params"
            return this.returnFailure(errorMsg);
        }
        return this.returnSuccess({
            jobId: jobId,
            job: job
        });
    }
}

module.exports = ScheduleHandler;