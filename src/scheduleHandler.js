const participants = require('./apiControllers/participantApiController');
const scheduler = require('node-schedule');
const QuestionHandler = require('./questionHandler')
const MessageSender = require('./messageSender')

class ScheduleHandler{
    static dayIndexOrdering = ["Sun","Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    static scheduledOperations = {
        "questions" : {},
        "cancels" : {},
        "schedules" : {}
    };

    static async scheduleAllQuestions(ctx, config){
        const qHandler = new QuestionHandler(config);
        let scheduledQuestionsList = config["scheduledQuestions"];
        for(let i = 0; i < scheduledQuestionsList.length; i++){
            let scheduledQuestionInfo = scheduledQuestionsList[i];
            let scheduleObj = await this.scheduleOneQuestion(ctx, qHandler, scheduledQuestionInfo,true);
            if(scheduleObj.returnCode === -1){
                return this.returnFailure(scheduleObj.data);
            }
        }
        return this.returnSuccess("")
    }
    // TODO: Create return handler class
    static returnSuccess(data){
        return {
            returnCode : 1,
            data : data
        };
    }
    static returnFailure(data){
        return {
            returnCode : -1,
            data : data
        };
    }
    static getRecurrenceRule(questionInfo){
        let scheduleHours, scheduleMins;
        try{
            let scheduleTime = questionInfo.atTime;
            let scheduleTimeSplit = scheduleTime.split(":");
            if(scheduleTimeSplit.length != 2) throw "Scheduler: Time format wrong"
            scheduleHours = parseInt(scheduleTimeSplit[0]);
            scheduleMins = parseInt(scheduleTimeSplit[1]);
            // console.log(scheduleTimeSplit);
            // console.log(scheduleHours);
            // console.log(scheduleMins);
        } catch (err){
            let errorMsg = "Scheduler: Time in the inappropriate format or not specified"
            return this.returnFailure(errorMsg);
        }
        let scheduleDayIndices = [];

        try{
            let scheduleDays = questionInfo.onDays;
            for(let i = 0; i < scheduleDays.length; i++){
                let idx = this.dayIndexOrdering.indexOf(scheduleDays[i]);
                if(idx === -1) throw "Scheduler: Day not recognized";
                else {
                    if(!scheduleDayIndices.includes(idx)){
                        scheduleDayIndices.push(idx)
                    }
                }
            }
        } catch(err){
            let errorMsg = "Scheduler: On days in incorrect format or not specified"
            return this.returnFailure(errorMsg)
        }
        let rule = new scheduler.RecurrenceRule();
        rule.dayOfWeek = scheduleDayIndices;
        rule.hour = scheduleHours;
        rule.minute = scheduleMins;

        return this.returnSuccess(rule)
    }
    static async writeOperationInfoToDB(chatId, jobId, questionInfo){
        let jobInfo = {
            jobId: jobId,
            qId: questionInfo.qId,
            atTime: questionInfo.atTime,
            onDays: questionInfo.onDays
        }

        await participants.addScheduledQuestion(chatId, jobInfo);

    }
    static async scheduleOneQuestion(ctx, qHandler, questionInfo, isNew = true){
        if(!("qId" in questionInfo)){
            return this.returnFailure("Scheduler: Question ID not specified")
        }
        let recurrenceRuleObj = this.getRecurrenceRule(questionInfo);
        if(recurrenceRuleObj.returnCode === -1) {
            return this.returnFailure(recurrenceRuleObj.data)
        }
        let recRule = recurrenceRuleObj.data;
        let jobId = questionInfo.qId + "_" + ctx.from.id + "_" + recRule.hour + "" + recRule.minute + "_" + recRule.dayOfWeek.join("");

        // Assuming error handling in API Controller
        let participant = await participants.get(ctx.from.id);
        let questionObj = qHandler.constructQuestionByID(questionInfo.qId, participant.parameters.language);
        if(questionObj.returnCode === -1) {
            return this.returnFailure(questionObj.data);
        }
        let question = questionObj.data;
        let job;
        try{
            job = scheduler.scheduleJob(recRule, async function(){
                await MessageSender.sendQuestion(ctx, question);
            })
            this.scheduledOperations["questions"][jobId] = job;
            if(isNew) await this.writeOperationInfoToDB(ctx.from.id, jobId, questionInfo);
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