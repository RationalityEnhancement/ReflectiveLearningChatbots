const { expect, assert } = require('chai');
const testConfig = require('../json/test/qHandlerTestConfig.json');
const DevConfig = require('../json/devConfig.json');

const QuestionHandler = require('../src/questionHandler');

const qHandler = new QuestionHandler(testConfig);


describe('Constructing questions', () => {

    it('returns appropriate question id and qtype', () => {
        const result = qHandler.constructQuestionByID("chain1.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.qId).to.equal("chain1.q1");
        expect(result.data.qType).to.equal("freeform");
    })
    it('returns appropriate language question', () => {
        const result = qHandler.constructQuestionByID("chain1.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.text).to.equal("DeutschQ1");
    })
    it('uses default language when input lang doesnt exist', () => {
        const result = qHandler.constructQuestionByID("chain1.q1", "Deutschlii");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.text).to.equal("EnglishQ1");
    })
    it('uses default language when input lang not given', () => {
        const result = qHandler.constructQuestionByID("chain1.q1");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.text).to.equal("EnglishQ1");
    })
    it('fails when qid is of incorrect form', () => {
        const result = qHandler.constructQuestionByID("bimbox", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
        expect(typeof result.data).to.equal("string");
    })
    it('fails when category doesnt exist', () => {
        const result = qHandler.constructQuestionByID("chain3.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
        expect(typeof result.data).to.equal("string");
    })
    it('fails when qId doesnt exist', () => {
        const result = qHandler.constructQuestionByID("chain1.q3", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
        expect(typeof result.data).to.equal("string");
    })
    it('language dependent optional params - options', () => {
        const result = qHandler.constructQuestionByID("chain1.q2", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.options).to.eql(["DeutschO1", "DeutschO2"]);
    })
    it('language dependent optional params - reply messages', () => {
        const result = qHandler.constructQuestionByID("chain1.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.replyMessages).to.eql(["DeutschReply1"]);
    })
    it('language independent optional params - next question', () => {
        const result = qHandler.constructQuestionByID("chain1.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.nextQuestion).to.eql("chain1.q2");
    })
    it('language independent optional params - saveAnswerTo', () => {
        const result = qHandler.constructQuestionByID("chain1.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.saveAnswerTo).to.eql("pid");
    })
    describe('Likert 5', () => {
        const result = qHandler.constructQuestionByID("chain1.likert1", "English");
        let question = result.data;
        it('Should return success and have correct qId', () => {
            expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(question.qId).to.equal('chain1.likert1');
        })
        it('Should have singleChoice as qType', () => {
            expect(question.qType).to.equal('singleChoice');
        })
        it('Should have 5 options, of which one is Agree', () => {
            expect(question.options.length).to.equal(5);
            assert(question.options.includes("Agree"));
        })
        it('Should have optional param nextQuestion', () => {
            assert("nextQuestion" in question);
            expect(question.nextQuestion).to.equal("chain1.likert2");
        })
    })
    describe('Likert 7', () => {
        const result = qHandler.constructQuestionByID("chain1.likert2", "Deutsch");
        let question = result.data;
        it('Should return success and have correct qId', () => {
            expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(question.qId).to.equal('chain1.likert2');
        })
        it('Should have singleChoice as qType', () => {
            expect(question.qType).to.equal('singleChoice');
        })
        it('Should have 7 options, of which one is Weder noch', () => {
            expect(question.options.length).to.equal(7);
            assert(question.options.includes("Weder noch"));
        })
    })
    it('Like', () => {
        const result = qHandler.constructQuestionByID("chain1.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.saveAnswerTo).to.eql("pid");
    })
});

describe('Getting first question', () => {
    it('returns first question in category', () => {
        const result = qHandler.getFirstQuestionInCategory("chain1","Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.qId).to.eql("chain1.q1");
        expect(result.data.text).to.eql("DeutschQ1");
    })
    it('fails when no first question in category', () => {
        const result = qHandler.getFirstQuestionInCategory("chain2","Deutsch");
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
        expect(typeof result.data).to.eql("string");
    })

})