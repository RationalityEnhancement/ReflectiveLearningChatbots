const { expect, assert } = require('chai');
const testConfig = require('../json/test/qHandlerTestConfig.json');
const testConfigConds = require('../json/test/qHandlerTestConfigConds.json');
const DevConfig = require('../json/devConfig.json');

const QuestionHandler = require('../src/questionHandler');

const qHandler = new QuestionHandler(testConfig);


describe('Constructing questions, no conditions', () => {

    it('returns appropriate question id and qtype', () => {
        const result = qHandler.constructQuestionByID(undefined, "chain1.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.qId).to.equal("chain1.q1");
        expect(result.data.qType).to.equal("freeform");
    })
    it('returns appropriate language question', () => {
        const result = qHandler.constructQuestionByID(undefined,"chain1.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.text).to.equal("DeutschQ1");
    })
    it('uses default language when input lang doesnt exist', () => {
        const result = qHandler.constructQuestionByID(undefined, "chain1.q1", "Deutschlii");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.text).to.equal("EnglishQ1");
    })
    it('uses default language when input lang not given', () => {
        const result = qHandler.constructQuestionByID(undefined, "chain1.q1");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.text).to.equal("EnglishQ1");
    })
    it('fails when qid is of incorrect form', () => {
        const result = qHandler.constructQuestionByID(undefined, "bimbox", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
        expect(typeof result.data).to.equal("string");
    })
    it('fails when category doesnt exist', () => {
        const result = qHandler.constructQuestionByID(undefined, "chain3.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
        expect(typeof result.data).to.equal("string");
    })
    it('fails when qId doesnt exist', () => {
        const result = qHandler.constructQuestionByID(undefined, "chain1.q3", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
        expect(typeof result.data).to.equal("string");
    })
    it('language dependent optional params - options', () => {
        const result = qHandler.constructQuestionByID(undefined, "chain1.q2", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.options).to.eql(["DeutschO1", "DeutschO2"]);
    })
    it('language dependent optional params - reply messages', () => {
        const result = qHandler.constructQuestionByID(undefined, "chain1.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.replyMessages).to.eql(["DeutschReply1"]);
    })
    it('language independent optional params - next question', () => {
        const result = qHandler.constructQuestionByID(undefined, "chain1.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.nextQuestion).to.eql("chain1.q2");
    })
    it('language independent optional params - saveAnswerTo', () => {
        const result = qHandler.constructQuestionByID(undefined, "chain1.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.saveAnswerTo).to.eql("pid");
    })
    describe('Qualtrics surveys', () => {
        it('Should return expected link with query strings, while skipping over empty fields', () => {
            let expectedResult = "www.google.com/12345?UniqueId=${UNIQUE_ID}&Condition=Experimental"
            const result = qHandler.constructQuestionByID(undefined, "chain2.qual1", "English");
            expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(result.data.qId).to.equal('chain2.qual1');
            expect(result.data.qType).to.equal('qualtrics');
            expect(result.data.qualtricsLink).to.equal(expectedResult);
        });
        it('Should return expected link without any query strings', () => {
            let expectedResult = "www.google.com/12345"
            const result = qHandler.constructQuestionByID(undefined, "chain2.qual2", "English");
            expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(result.data.qId).to.equal('chain2.qual2');
            expect(result.data.qType).to.equal('qualtrics');
            expect(result.data.qualtricsLink).to.equal(expectedResult);
        });
        it('Should return fail when field is missing value', () => {
            const result = qHandler.constructQuestionByID(undefined, "chain2.qual3", "English");
            expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(result.data);
        });
        it('Should return fail when link is missing', () => {
            const result = qHandler.constructQuestionByID(undefined, "chain2.qual4", "English");
            expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(result.data);
        });
    })
    describe('Likert 5', () => {
        const result = qHandler.constructQuestionByID(undefined, "chain1.likert1", "English");
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
        const result = qHandler.constructQuestionByID(undefined, "chain1.likert2", "Deutsch");
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
});

describe('Getting first question, no condition', () => {
    it('returns first question in category', () => {
        const result = qHandler.getFirstQuestionInCategory(undefined, "chain1","Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.qId).to.eql("chain1.q1");
        expect(result.data.text).to.eql("DeutschQ1");
    })
    it('fails when no first question in category', () => {
        const result = qHandler.getFirstQuestionInCategory(undefined, "chain2","Deutsch");
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
        expect(typeof result.data).to.eql("string");
    })
    it('fails when category doesnt exist', () => {
        const result = qHandler.getFirstQuestionInCategory(undefined, "chain3","Deutsch");
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
        expect(typeof result.data).to.eql("string");
    })

})

describe('Getting scheduled questions, no condition', () => {

    it('returns success and a list of scheduled questions', () => {
        const result = qHandler.getScheduledQuestions(undefined);
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.length).to.eql(1);
        expect(result.data[0].qId).to.eql("chain1.q1");
    })

})

let qHandler2 = new QuestionHandler(testConfigConds);

describe('Constructing questions normally, yes conditions', () => {

    it('returns appropriate question id and qtype', () => {
        const result = qHandler2.constructQuestionByID("Cond1", "chain1.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.qId).to.equal("chain1.q1");
        expect(result.data.qType).to.equal("freeform");
    })
    it('returns appropriate language question', () => {
        const result = qHandler2.constructQuestionByID("Cond1","chain1.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.text).to.equal("DeutschQ1");
    })
    it('uses default language when input lang doesnt exist', () => {
        const result = qHandler2.constructQuestionByID("Cond1", "chain1.q1", "Deutschlii");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.text).to.equal("EnglishQ1");
    })
    it('uses default language when input lang not given', () => {
        const result = qHandler2.constructQuestionByID("Cond1", "chain1.q1");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.text).to.equal("EnglishQ1");
    })
    it('fails when condition doesnt exist', () => {
        const result = qHandler2.constructQuestionByID("Cond3", "chain1.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
        expect(typeof result.data).to.equal("string");
    })
    it('fails when qid is of incorrect form', () => {
        const result = qHandler2.constructQuestionByID("Cond1", "bimbox", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
        expect(typeof result.data).to.equal("string");
    })
    it('fails when category doesnt exist', () => {
        const result = qHandler2.constructQuestionByID("Cond1", "chain3.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
        expect(typeof result.data).to.equal("string");
    })
    it('fails when qId doesnt exist', () => {
        const result = qHandler2.constructQuestionByID("Cond1", "chain1.q3", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
        expect(typeof result.data).to.equal("string");
    })
    it('language dependent optional params - options', () => {
        const result = qHandler2.constructQuestionByID("Cond1", "chain1.q2", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.options).to.eql(["DeutschO1", "DeutschO2"]);
    })
    it('language dependent optional params - reply messages', () => {
        const result = qHandler2.constructQuestionByID("Cond1", "chain1.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.replyMessages).to.eql(["DeutschReply1"]);
    })
    it('language independent optional params - next question', () => {
        const result = qHandler2.constructQuestionByID("Cond1", "chain1.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.nextQuestion).to.eql("chain1.q2");
    })
    it('language independent optional params - saveAnswerTo', () => {
        const result = qHandler2.constructQuestionByID("Cond1", "chain1.q1", "Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.saveAnswerTo).to.eql("pid");
    })
});

describe('Getting first question, yes condition', () => {
    it('returns first question in category', () => {
        const result = qHandler2.getFirstQuestionInCategory("Cond1", "chain1","Deutsch");
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.qId).to.eql("chain1.q1");
        expect(result.data.text).to.eql("DeutschQ1");
    })
    it('fails when no first question in category', () => {
        const result = qHandler2.getFirstQuestionInCategory("Cond2", "chain2","Deutsch");
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
        expect(typeof result.data).to.eql("string");
    })
    it('fails when condition doesnt exist', () => {
        const result = qHandler2.getFirstQuestionInCategory("Cond3", "chain2","Deutsch");
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
        expect(typeof result.data).to.eql("string");
    })
    it('fails when condition exists but category doesnt', () => {
        const result = qHandler2.getFirstQuestionInCategory("Cond2", "chain1","Deutsch");
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
        expect(typeof result.data).to.eql("string");
    })

})

const participant = {
    firstName : "John",
    stages : {
        activity : []
    },
    currentAnswer : [],
    parameters : {
        goalSetTime : "09:00"
    },
    uniqueId : "1234",
    conditionName : "Test"
}
describe('Getting scheduled questions, yes condition', () => {

    it('returns success and a list of scheduled questions', () => {
        const result = qHandler2.getScheduledQuestions("Cond1", participant);
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.length).to.eql(1);
        expect(result.data[0].qId).to.eql("chain1.q1");
    })
    it('returns success and a list of scheduled questions with variable time replaced', () => {
        const result = qHandler2.getScheduledQuestions("VarCond", participant);
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.length).to.eql(2);
        expect(result.data[0].atTime).to.eql(participant.parameters.goalSetTime);
        expect(result.data[1].atTime).to.eql("10:00");
    })
    it('returns empty list when no scheduled questions available', () => {
        const result = qHandler2.getScheduledQuestions("Cond2", participant);
        expect(result.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(result.data.length).to.eql(0);
    })
    it('fails when condition doesnt exist', () => {
        const result = qHandler2.getScheduledQuestions("Cond3", participant);
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('fails when condition has atTime with variable that doesnt exist', () => {
        const result = qHandler2.getScheduledQuestions("FailCond1", participant);
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('fails when condition has atTime undefined', () => {
        const result = qHandler2.getScheduledQuestions("FailCond2", participant);
        expect(result.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })

})

describe('Replacing language deeply', () => {
    const languages = ["English", "Deutsch"];
    const desiredLang = "English";
    let languageObj = {
        "English" : "Hello",
        "Deutsch" : "Hallo"
    }
    it('Should replace languages on the zeroth level', () => {
        let testObj = JSON.parse(JSON.stringify(languageObj));
        let testObjCopy = JSON.parse(JSON.stringify(testObj));
        let expectedResult = languageObj[desiredLang];
        let result = qHandler.replaceLanguageDeeply(testObj, languages, desiredLang);
        expect(typeof result).to.equal("string");
        expect(result).to.equal(expectedResult);
        expect(testObj).to.eql(testObjCopy);
    })
    it('Should replace languages even when object has more languages', () => {
        let testObj = JSON.parse(JSON.stringify(languageObj));
        testObj["Kannada"] = "Namaskara"
        let testObjCopy = JSON.parse(JSON.stringify(testObj));
        let expectedResult = languageObj[desiredLang];
        let result = qHandler.replaceLanguageDeeply(testObj, languages, desiredLang);
        expect(typeof result).to.equal("string");
        expect(result).to.equal(expectedResult);
        expect(testObj).to.eql(testObjCopy);

    })
    it('Should not replace languages even when object doesnt have all available languages', () => {
        let testObj = JSON.parse(JSON.stringify(languageObj));
        testObj["Kannada"] = "Namaskara"
        delete testObj["Deutsch"];
        let testObjCopy = JSON.parse(JSON.stringify(testObj));
        let result = qHandler.replaceLanguageDeeply(testObj, languages, desiredLang);
        expect(typeof result).to.equal("object");
        expect(result).to.eql(testObj);
        expect(testObj).to.eql(testObjCopy);

    })
    it('Should return normally when not object', () => {
        let testObj = "Hello";
        let result = qHandler.replaceLanguageDeeply(testObj, languages, desiredLang);
        expect(typeof result).to.equal("string");
        expect(result).to.eql(testObj);
    })
    it('Should return normally when languages not valid array', () => {
        let testObj = "Hello";
        let result = qHandler.replaceLanguageDeeply(testObj, "languages", desiredLang);
        expect(typeof result).to.equal("string");
        expect(result).to.eql(testObj);
    })
    it('Should return normally when desiredLang not valid string', () => {
        let testObj = "Hello";
        let result = qHandler.replaceLanguageDeeply(testObj, languages, [desiredLang]);
        expect(typeof result).to.equal("string");
        expect(result).to.eql(testObj);
    })
    it('Should replace languages on the first level', () => {
        let testObj = {
            name: "Johnski",
            greeting: JSON.parse(JSON.stringify(languageObj))
        };
        let testObjCopy = JSON.parse(JSON.stringify(testObj));

        let expectedResult = JSON.parse(JSON.stringify(testObj));
        expectedResult["greeting"] = testObj["greeting"][desiredLang];
        let result = qHandler.replaceLanguageDeeply(testObj, languages, desiredLang);
        expect(typeof result).to.equal("object");
        expect(result).to.eql(expectedResult);
        expect(testObj).to.eql(testObjCopy);


    })
    it('Should replace two language objs on the first level', () => {
        let testObj = {
            name: "Johnski",
            greeting1 : JSON.parse(JSON.stringify(languageObj)),
            greeting2: JSON.parse(JSON.stringify(languageObj))
        };
        let testObjCopy = JSON.parse(JSON.stringify(testObj));
        let expectedResult = JSON.parse(JSON.stringify(testObj));
        expectedResult["greeting1"] = testObj["greeting1"][desiredLang];
        expectedResult["greeting2"] = testObj["greeting2"][desiredLang];
        let result = qHandler.replaceLanguageDeeply(testObj, languages, desiredLang);
        expect(typeof result).to.equal("object");
        expect(result).to.eql(expectedResult);
        expect(testObj).to.eql(testObjCopy);


    })
    it('Should not replace any other objects', () => {
        let testObj = {
            name: "Johnski",
            greeting : JSON.parse(JSON.stringify(languageObj)),
            bones: {
                "fibia" : true,
                "femur" : false
            }
        };
        let testObjCopy = JSON.parse(JSON.stringify(testObj));
        let expectedResult = JSON.parse(JSON.stringify(testObj));
        expectedResult["greeting"] = testObj["greeting"][desiredLang];
        let result = qHandler.replaceLanguageDeeply(testObj, languages, desiredLang);
        expect(typeof result).to.equal("object");
        expect(result).to.eql(expectedResult);
        expect(testObj).to.eql(testObjCopy);

    })
    it('Should replace array of other objects at zeroth level', () => {
        let testObj = [
            languageObj, languageObj
        ];
        let testObjCopy = JSON.parse(JSON.stringify(testObj));
        let expectedResult = [languageObj[desiredLang], languageObj[desiredLang]];
        let result = qHandler.replaceLanguageDeeply(testObj, languages, desiredLang);
        expect(typeof result).to.equal("object");
        assert(Array.isArray(result));
        expect(result).to.eql(expectedResult);
        expect(testObj).to.eql(testObjCopy);
    })
    it('Should replace array of other objects at multiple levels', () => {
        let testObj = [
            {
                condition: true,
                nextQuestion : "peen",
                replyMessages : languageObj
            },
            {
                condition: false,
                me : "am cool",
                yes :{
                    test: ["ok", "long", "array"],
                    messages: languageObj
                }
            }

        ];
        let testObjCopy = JSON.parse(JSON.stringify(testObj));
        let expectedResult = JSON.parse(JSON.stringify(testObj));
        expectedResult[0]["replyMessages"] = languageObj[desiredLang];
        expectedResult[1]["yes"]["messages"] = languageObj[desiredLang];
        let result = qHandler.replaceLanguageDeeply(testObj, languages, desiredLang);
        expect(typeof result).to.equal("object");
        assert(Array.isArray(result));
        expect(result).to.eql(expectedResult);
        expect(testObj).to.eql(testObjCopy);
    })

    it('Should replace nested language object', () => {
        let testObj = {
            uniqueId : 'abc',
            text : {
                "English" : {
                    "time" : {
                        "English" : "Joggers",
                        "Deutsch" : "Hose"
                    },
                },
                "Deutsch" : {
                    "zeit" : {
                        "English" : "Joggers2",
                        "Deutsch" : "Hose2"
                    }
                }
            }
        }
        let testObjCopy = JSON.parse(JSON.stringify(testObj));
        let expectedResult = JSON.parse(JSON.stringify(testObj));
        expectedResult["text"] = { "time" : "Joggers"};
        let result = qHandler.replaceLanguageDeeply(testObj, languages, desiredLang);
        expect(typeof result).to.equal("object");
        expect(result).to.eql(expectedResult);
        expect(testObj).to.eql(testObjCopy);
    })


})