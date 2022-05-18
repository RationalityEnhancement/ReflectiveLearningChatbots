const { expect, assert } = require('chai');
const config = require('../json/config.json');
const DevConfig = require('../json/devConfig.json');

const LogicHandler = require('../src/logicHandler');

const testId = "12344";

describe('Get Next Action', () => {
    describe('Fails', () => {
        it('Should fail when current answer missing', () => {
            let question = {
                qId : "testQ",
                qType : "singleChoice",
                options : ["yes", "no"],
                text : "fail",
                nextActions : ["saveAnswerTo", "scheduleQuestions"]
            };
            let part = {
                uniqueId : testId
            }
            let returnObj = LogicHandler.getNextActions(part, question);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE)
        })
        it('Should fail when options are invalid', () => {
            let question = {
                qId : "testQ",
                qType : "singleChoice",
                options : "bones",
                text : "fail",
                cNextActions : [{
                    optionIndices : [0],
                    data : ["saveAnswerTo"]
                }]
            };
            let part = {
                uniqueId : testId,
                currentAnswer : ["yes"]
            }
            let returnObj = LogicHandler.getNextActions(part, question);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE)
        })
    })
    describe('Getting next actions', () => {
        let question = {
            qId : "testQ",
            qType : "singleChoice",
            options : ["yes", "no"],
            text : "fail",
            nextActions : ["saveAnswerTo", "scheduleQuestions"],
            cNextActions : [
                {
                    optionIndices: [0],
                    data : ["saveAnswerTo"]
                },
                {
                    optionIndices: [1],
                    data : ["scheduleQuestions"]
                }
            ]
        };
        let part = {
            uniqueId : testId,
            currentAnswer : ["yes"]
        }
        it('Should get unconditional actions when only that present', () => {
            let copyQuestion = JSON.parse(JSON.stringify(question));
            delete copyQuestion['cNextActions'];
            let returnObj = LogicHandler.getNextActions(part, copyQuestion);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(question.nextActions);
        })
        it('Should get only unconditional actions when both present', () => {
            let copyQuestion = JSON.parse(JSON.stringify(question));
            let returnObj = LogicHandler.getNextActions(part, copyQuestion);
            assert("cNextActions" in copyQuestion);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(question.nextActions);
        })
        it('Should get conditional actions when only that present', () => {
            let copyQuestion = JSON.parse(JSON.stringify(question));
            delete copyQuestion['nextActions'];
            let returnObj = LogicHandler.getNextActions(part, copyQuestion);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(question.cNextActions[0].data);
        })
    })
})

describe('Get Next Replies', () => {
    describe('Fails', () => {
        it('Should fail when current answer missing', () => {
            let question = {
                qId : "testQ",
                qType : "singleChoice",
                options : ["yes", "no"],
                text : "fail",
                replyMessages : ["saveAnswerTo", "scheduleQuestions"]
            };
            let part = {
                uniqueId : testId
            }
            let returnObj = LogicHandler.getNextReplies(part, question);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE)
        })
        it('Should fail when options are invalid', () => {
            let question = {
                qId : "testQ",
                qType : "singleChoice",
                options : "bones",
                text : "fail",
                cReplyMessages : [{
                    optionIndices : [0],
                    data : ["saveAnswerTo"]
                }]
            };
            let part = {
                uniqueId : testId,
                currentAnswer : ["yes"]
            }
            let returnObj = LogicHandler.getNextReplies(part, question);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE)
        })
    })
    describe('Getting next replies', () => {
        let question = {
            qId : "testQ",
            qType : "singleChoice",
            options : ["yes", "no"],
            text : "fail",
            replyMessages : ["saveAnswerTo", "scheduleQuestions"],
            cReplyMessages : [
                {
                    optionIndices: [0],
                    data : ["saveAnswerTo"]
                },
                {
                    optionIndices: [1],
                    data : ["scheduleQuestions"]
                }
            ]
        };
        let part = {
            uniqueId : testId,
            currentAnswer : ["yes"]
        }
        it('Should get unconditional replies when only that present', () => {
            let copyQuestion = JSON.parse(JSON.stringify(question));
            delete copyQuestion['cReplyMessages'];
            let returnObj = LogicHandler.getNextReplies(part, copyQuestion);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(question.replyMessages);
        })
        it('Should get only unconditional replies when both present', () => {
            let copyQuestion = JSON.parse(JSON.stringify(question));
            let returnObj = LogicHandler.getNextReplies(part, copyQuestion);
            assert("cReplyMessages" in copyQuestion);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(question.replyMessages);
        })
        it('Should get conditional replies when only that present', () => {
            let copyQuestion = JSON.parse(JSON.stringify(question));
            delete copyQuestion['replyMessages'];
            let returnObj = LogicHandler.getNextReplies(part, copyQuestion);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(question.cReplyMessages[0].data);
        })
    })
})

describe('Get Next Question', () => {
    describe('Fails', () => {
        it('Should fail when current answer missing', () => {
            let question = {
                qId : "testQ",
                qType : "singleChoice",
                options : ["yes", "no"],
                text : "fail",
                replyMessages : ["saveAnswerTo", "scheduleQuestions"]
            };
            let part = {
                uniqueId : testId
            }
            let returnObj = LogicHandler.getNextQuestion(part, question);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE)
        })
        it('Should fail when options are invalid', () => {
            let question = {
                qId : "testQ",
                qType : "singleChoice",
                options : "bones",
                text : "fail",
                cNextQuestions : [{
                    optionIndices : [0],
                    data : ["saveAnswerTo"]
                }]
            };
            let part = {
                uniqueId : testId,
                currentAnswer : ["yes"]
            }
            let returnObj = LogicHandler.getNextQuestion(part, question);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE)
        })
    })
    describe('Getting next questions', () => {
        let question = {
            qId : "testQ",
            qType : "singleChoice",
            options : ["yes", "no"],
            text : "fail",
            nextQuestion : "saveAnswerTo",
            cNextQuestions : [
                {
                    optionIndices: [0],
                    data : "saveAnswerTo"
                },
                {
                    optionIndices: [1],
                    data : "scheduleQuestions"
                }
            ]
        };
        let part = {
            uniqueId : testId,
            currentAnswer : ["yes"]
        }
        it('Should get unconditional question when only that present', () => {
            let copyQuestion = JSON.parse(JSON.stringify(question));
            delete copyQuestion['cNextQuestions'];
            let returnObj = LogicHandler.getNextQuestion(part, copyQuestion);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(question.nextQuestion);
        })
        it('Should get only unconditional question when both present', () => {
            let copyQuestion = JSON.parse(JSON.stringify(question));
            let returnObj = LogicHandler.getNextQuestion(part, copyQuestion);
            assert("cNextQuestions" in copyQuestion);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(question.nextQuestion);
        })
        it('Should get conditional actions when only that present', () => {
            let copyQuestion = JSON.parse(JSON.stringify(question));
            delete copyQuestion['nextQuestion'];
            let returnObj = LogicHandler.getNextQuestion(part, copyQuestion);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(question.cNextQuestions[0].data);
        })
    })
})