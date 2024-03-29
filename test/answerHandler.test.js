const { MongoMemoryServer } = require('mongodb-memory-server');

const participants = require('../src/apiControllers/participantApiController');
const answers = require('../src/apiControllers/answerApiController');

const mongo = require('mongoose');

const { assert, expect } = require('chai');
const ConfigReader = require('../src/configReader');
const DevConfig = ConfigReader.getDevConfig();
const config = ConfigReader.getExpConfig();

const AnswerHandler = require('../src/answerHandler');

const testId = "123";
const partTemplate = {
    parameters: {language: "English"},
    uniqueId: testId,
    currentState: "awaitingAnswer",
    currentQuestion: {
        "qId" : "template",
        "qType" : "freeform"
    },
    currentAnswer: [],
    stages: {
        stageName: "",
        stageDay: 0
    },
    scheduledOperations: {
        "questions" : [],
        "actions" : [],
        "reminders" : []
    }
}

describe('DB Connection', () => {

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
        it('Should add and update participant parameter', async () => {

            await participants.add(testId);
            await participants.updateParameter(testId, "language", "English")
            await answers.add(testId);
            let participant = await participants.get(testId);
            let answerObj = await answers.getCurrent(testId);
            expect(participant).to.not.be.null;
            expect(participant.uniqueId).to.equal(testId);
            expect(participant.parameters.language).to.equal("English");
            expect(answerObj).to.not.be.null;
            expect(answerObj.uniqueId).to.equal(testId);

        });

    })
})

let testQuestion = {
    qId: "testQ",
    text: "Test text",
    askTimeStamp: "hello test timestamp"
};
const testPart = {
    uniqueId: testId,
    currentState: "awaitingAnswer",
    currentQuestion: testQuestion,
    parameters : {
        language : "English"
    },
    stages : {
        stageName: "Test",
        stageDay: 0
    }
}
describe('Finish answer', () => {
    describe('Finish string answer', ()=> {
        const addedAnswer = "Europe/Berlin"
        let returnObj, participant;
        it('Should return success with next action string', async () => {
            await participants.updateStageParameter(testPart.uniqueId, "stageDay", testPart.stages.stageDay)
            await participants.updateStageParameter(testPart.uniqueId, "stageName", testPart.stages.stageName)
            let part = await participants.get(testPart.uniqueId)
            returnObj = await AnswerHandler.finishAnswering(part, testQuestion, addedAnswer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
        });
        it('Should have added answer to participant answer list',  async () => {
            participant = await answers.getCurrent(testPart.uniqueId);
            let latestAns = participant.answers[participant.answers.length-1];
            expect(latestAns.qId).to.equal(testQuestion.qId);
            expect(latestAns.text).to.equal(testQuestion.text);
            expect(typeof latestAns.askTimeStamp).to.equal("string")
            expect(typeof latestAns.answerTimeStamp).to.equal("string")
            expect(latestAns.answer).to.eql([addedAnswer]);
            expect(latestAns.stageDay).to.eql(testPart.stages.stageDay);
            expect(latestAns.stageName).to.eql(testPart.stages.stageName);
        });
        it('Should update current state to answerReceived',  async () => {
            participant = await participants.get(testId);
            expect(participant.currentState).to.equal("answerReceived");
        });
    });
    describe('Finish string array', ()=> {
        const addedAnswer = "Europe/Berlin"
        let returnObj, participant;
        let curAns = ["ans1", "ans2"];
        it('Should return success with next action string', async () => {
            let part = await participants.get(testPart.uniqueId)
            returnObj = await AnswerHandler.finishAnswering(part, testQuestion, curAns);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
        });
        it('Should have added answer to participant answer list',  async () => {
            participant = await answers.getCurrent(testPart.uniqueId);
            let latestAns = participant.answers[participant.answers.length-1];
            expect(latestAns.qId).to.equal(testQuestion.qId);
            expect(latestAns.text).to.equal(testQuestion.text);
            expect(latestAns.answer).to.eql(curAns);
            expect(typeof latestAns.askTimeStamp).to.equal("string")
            expect(typeof latestAns.answerTimeStamp).to.equal("string")
            expect(latestAns.stageDay).to.eql(testPart.stages.stageDay);
            expect(latestAns.stageName).to.eql(testPart.stages.stageName);
        });
        it('Should update current state to answerReceived',  async () => {
            participant = await participants.get(testId);
            expect(participant.currentState).to.equal("answerReceived");
        });
    });

})
describe('Process answer', () =>{

    describe('Failing when required', () => {
        it('Should return no response when participant state is not awaitingAnswer', async () => {
            testPart['currentState'] = "answerReceived";
            testPart['currentQuestion'] = testQuestion;
            let returnObj = await AnswerHandler.processAnswer(testPart, "hello");
            expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
            expect(returnObj.successData).to.equal(DevConfig.NO_RESPONSE_STRING);
            testPart['currentState'] = "awaitingAnswer";
        });
        it('Should fail when participant is undefined', async () => {
            let returnObj = await AnswerHandler.processAnswer(undefined, "hello");
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when participant doesnt have uniqueId', async () => {
            delete testPart["uniqueId"];
            let returnObj = await AnswerHandler.processAnswer(testPart, "hello");
            assert("currentState" in testPart);
            assert("currentQuestion" in testPart);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            testPart["uniqueId"] = testId;
        })
        it('Should fail when participant doesnt have currentState', async () => {
            delete testPart["currentState"];
            let returnObj = await AnswerHandler.processAnswer(testPart, "hello");
            assert("uniqueId" in testPart);
            assert("currentQuestion" in testPart);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            testPart["currentState"] = "awaitingAnswer";
        })
        it('Should fail when participant doesnt have currentQuestion', async () => {
            delete testPart["currentQuestion"];
            let returnObj = await AnswerHandler.processAnswer(testPart, "hello");
            assert("uniqueId" in testPart);
            assert("currentState" in testPart);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            testPart["currentQuestion"] = testQuestion;
        })
        it('Should fail when currentQuestion doesnt have qtype', async () => {
            delete testPart[testQuestion["qType"]];
            let returnObj = await AnswerHandler.processAnswer(testPart, "hello");
            assert("uniqueId" in testPart);
            assert("currentState" in testPart);
            assert("currentQuestion" in testPart);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
    })
    describe('Single choice', () => {

        describe('Option valid', () => {
            let returnObj;
            const question = {
                qId: "test2",
                text: "questionText",
                options: ["SC", "bye"],
                qType: "singleChoice"
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question;

            it('Should return success and next action', async () => {
                await participants.eraseCurrentAnswer(part.uniqueId);
                returnObj = await AnswerHandler.processAnswer(part, "SC")
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            });
            let participant;
            it('Should have added to last anser', async () => {
                participant = await answers.getCurrent(part.uniqueId);
                let latestAns = participant.answers[participant.answers.length-1].answer;
                expect(latestAns).to.eql(["SC"])
            })
            it('Should be in answerReceived state', async () => {
                participant = await participants.get(testId);
                expect(participant.currentState).to.equal("answerReceived");
            })
        })
        describe('Option invalid', () => {
            let returnObj;
            const question = {
                qId: "test2",
                text: "questionText",
                options: ["SC", "bye"],
                qType: "singleChoice"
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question;
            it('Should return partial failure and repeat question', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "toast")
                expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
                expect(returnObj.successData).to.equal(DevConfig.REPEAT_QUESTION_STRING);
            });
            it('Should be in invalidAnswer state', async () => {
                let participant = await participants.get(part.uniqueId);
                expect(participant.currentState).to.eql("invalidAnswer");
            })
        })
        describe('Options missing', () => {
            let returnObj;
            const question = {
                qId: "test2",
                text: "questionText",
                qType: "singleChoice"
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question;
            it('Should return failure', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "toast")
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            });
        })
        describe('Language missing', () => {
            let returnObj;
            const question = {
                qId: "test2",
                text: "questionText",
                qType: "singleChoice",
                options: ["SC", "bye"],
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question;
            delete part["parameters"]["language"];
            it('Should return failure', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "toast")
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            });
        })

    })
    describe('Qualtrics', () => {
        describe('Without continue strings', () => {
            const question = {
                qId: "test2",
                text: "questionText",
                qType: "qualtrics"
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question
            describe('String exactly equal expected', () => {
                let returnObj;
                let ansString = "Done";
                it('Should return success and next action', async () => {
                    returnObj = await AnswerHandler.processAnswer(part, ansString)
                    expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                    expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
                });
                let participant;
                it('Should have added answer to part answers', async () => {
                    participant = await answers.getCurrent(part.uniqueId);
                    let ans = participant.answers;
                    expect(ans[ans.length-1].answer[0]).to.equal(ansString)
                });
                it('Should be in answerReceived state', async () => {
                    participant = await participants.get(testId);
                    expect(participant.currentState).to.eql("answerReceived");
                })
            });
            describe('String expected with some punctuation', () => {
                let returnObj;
                let ansString = "?!.Do.ne -;:";
                it('Should return success and next action', async () => {
                    returnObj = await AnswerHandler.processAnswer(part, ansString)
                    expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                    expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
                });
                let participant;
                it('Should have added answer to part answers', async () => {
                    participant = await answers.getCurrent(part.uniqueId);
                    let ans = participant.answers;
                    expect(ans[ans.length-1].answer[0]).to.equal(ansString)
                });
                it('Should be in answerReceived state', async () => {
                    participant = await participants.get(testId);
                    expect(participant.currentState).to.eql("answerReceived");
                })
            });
            describe('String expected with wrong case', () => {
                let returnObj;
                let ansString = "dOnE";
                it('Should return success and next action', async () => {
                    returnObj = await AnswerHandler.processAnswer(part, ansString)
                    expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                    expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
                });
                let participant;
                it('Should have added answer to part answers', async () => {
                    participant = await answers.getCurrent(part.uniqueId);
                    let ans = participant.answers;
                    expect(ans[ans.length-1].answer[0]).to.equal(ansString)
                });
                it('Should be in answerReceived state', async () => {
                    participant = await participants.get(testId);
                    expect(participant.currentState).to.eql("answerReceived");
                })
            });
            describe('String doesnt match', () => {
                let returnObj;
                let ansString = "Dodne";
                it('Should return partial failure and repeat question', async () => {
                    returnObj = await AnswerHandler.processAnswer(part, ansString)
                    expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
                    expect(returnObj.successData).to.equal(DevConfig.NO_RESPONSE_STRING);
                });

            });
            describe('No part language', () => {
                let returnObj;
                let ansString = "dOnE";
                let part2 = JSON.parse(JSON.stringify(part));
                delete part2["parameters"]["language"];
                it('Should return failure', async () => {
                    returnObj = await AnswerHandler.processAnswer(part2, ansString)
                    expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                    console.log(returnObj.data);
                });

            });
        })
        describe('Without continue strings', () => {
            const question = {
                qId: "test2",
                text: "questionText",
                qType: "qualtrics",
                continueStrings : ["Continue1", "Continue2"]
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question
            describe('String exactly equal expected', () => {
                let returnObj;
                let ansString = "Continue2";
                it('Should return success and next action', async () => {
                    returnObj = await AnswerHandler.processAnswer(part, ansString)
                    expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                    expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
                });
                let participant;
                it('Should have added answer to part answers', async () => {
                    participant = await answers.getCurrent(part.uniqueId);
                    let ans = participant.answers;
                    expect(ans[ans.length-1].answer[0]).to.equal(ansString)
                });
                it('Should be in answerReceived state', async () => {
                    participant = await participants.get(testId);
                    expect(participant.currentState).to.eql("answerReceived");
                })
            });
            describe('String expected with some punctuation', () => {
                let returnObj;
                let ansString = "?!.Co.ntinue2 -;:";
                it('Should return success and next action', async () => {
                    returnObj = await AnswerHandler.processAnswer(part, ansString)
                    expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                    expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
                });
                let participant;
                it('Should have added answer to part answers', async () => {
                    participant = await answers.getCurrent(part.uniqueId);
                    let ans = participant.answers;
                    expect(ans[ans.length-1].answer[0]).to.equal(ansString)
                });
                it('Should be in answerReceived state', async () => {
                    participant = await participants.get(testId);
                    expect(participant.currentState).to.eql("answerReceived");
                })
            });
            describe('String expected with wrong case', () => {
                let returnObj;
                let ansString = "coNtiNue1";
                it('Should return success and next action', async () => {
                    returnObj = await AnswerHandler.processAnswer(part, ansString)
                    expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                    expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
                });
                let participant;
                it('Should have added answer to part answers', async () => {
                    participant = await answers.getCurrent(part.uniqueId);
                    let ans = participant.answers;
                    expect(ans[ans.length-1].answer[0]).to.equal(ansString)
                });
                it('Should be in answerReceived state', async () => {
                    participant = await participants.get(testId);
                    expect(participant.currentState).to.eql("answerReceived");
                })
            });
            describe('String doesnt match', () => {
                let returnObj;
                let ansString = "Continue3";
                it('Should return partial failure and repeat question', async () => {
                    returnObj = await AnswerHandler.processAnswer(part, ansString)
                    expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
                    expect(returnObj.successData).to.equal(DevConfig.NO_RESPONSE_STRING);
                });

            });
        })

    })

    describe('Multi choice', () => {

        describe('Option valid', () => {
            let returnObj;
            const question = {
                qId: "testMC",
                text: "questionText",
                options: ["MC1", "MC2"],
                qType: "multiChoice"
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question
            it('Should return success and no response', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "MC1")
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NO_RESPONSE_STRING);
            });
            it('Should have added answer to current answer', async () => {
                let participant = await participants.get(part.uniqueId);
                assert(participant.currentAnswer.includes("MC1"));
            });
        });
        describe('Option invalid', () => {
            let returnObj;
            const question = {
                qId: "testMC",
                text: "questionText",
                options: ["MC1", "MC2"],
                qType: "multiChoice"
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question
            it('Should return partial failure and repeat question', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "toast")
                expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
                expect(returnObj.successData).to.equal(DevConfig.REPEAT_QUESTION_STRING);
            });
        })
        describe('Terminate choosing', () => {
            let returnObj;
            const question = {
                qId: "testMC",
                text: "questionText",
                options: ["MC1", "MC2"],
                qType: "multiChoice"
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question
            part.currentAnswer = ["MC1"]
            it('Should return success and next action', async () => {
                returnObj = await AnswerHandler.processAnswer(part, config.phrases.keyboards.terminateAnswer[part.parameters.language])
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            });
            let participant;
            it('Should have added answers to participant answer and current answer', async () => {
                let answerObj = await answers.getCurrent(part.uniqueId);
                participant = await participants.get(part.uniqueId);
                let latestAns = answerObj.answers[answerObj.answers.length-1].answer;
                expect(latestAns).to.eql(["MC1"]);
                expect(participant.currentAnswer).to.eql(latestAns);
            })
            it('Should be in answerReceived state', async () => {
                expect(participant.currentState).to.eql("answerReceived");
            })
        })
        describe('Terminate choosing when current answer empty', () => {
            let returnObj;
            const question = {
                qId: "testMC",
                text: "questionText",
                options: ["MC1", "MC2"],
                qType: "multiChoice"
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question
            it('Should return partial failure and repeat question', async () => {
                returnObj = await AnswerHandler.processAnswer(part, config.phrases.keyboards.terminateAnswer[part.parameters.language])
                expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
                expect(returnObj.successData).to.equal(DevConfig.REPEAT_QUESTION_STRING);
            });
        })
        describe('Options missing', () => {
            let returnObj;
            const question = {
                qId: "testMC",
                text: "questionText",
                qType: "multiChoice"
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question
            it('Should return failure', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "toast")
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            });
        })
        describe('Language missing', () => {
            let returnObj;
            const question = {
                qId: "testMC",
                text: "questionText",
                qType: "multiChoice",
                options: ["MC1", "MC2"],
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question;
            delete part["parameters"]["language"];
            it('Should return failure', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "toast")
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            });
        })

    })

    describe('Freeform text', () => {

        describe('Answer is valid text', () => {
            let returnObj;
            const question = {
                qId: "testF",
                text: "questionText",
                qType: "freeform"
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question;
            it('Should return success and next action', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "Freeform test")
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            });
            let participant;
            it('Should have updated current answer', async () => {
                participant = await participants.get(part.uniqueId)
                expect(participant.currentAnswer).to.eql(["Freeform test"]);
            });
            it('Should have added to latest answer', async () => {
                let answerObj = await answers.getCurrent(part.uniqueId);
                let latestAns = answerObj.answers[answerObj.answers.length-1].answer;
                expect(latestAns).to.eql(["Freeform test"]);
                await participants.eraseCurrentAnswer(part.uniqueId);
            });
            it('Should be in answerReceived state', async () => {
                expect(participant.currentState).to.eql("answerReceived");
            })
        });
        describe('Answer not long enough (chars)', () => {
            let returnObj;
            const question = {
                qId: "testF",
                text: "questionText",
                qType: "freeform",
                minLengthChars : 10
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question;
            it('Should return partial failure and repeat question', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "<10")
                expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
                expect(returnObj.successData).to.equal(DevConfig.REPEAT_QUESTION_STRING);
            });
        });
        describe('Answer long enough (chars)', () => {
            let returnObj;
            const question = {
                qId: "testF",
                text: "questionText",
                qType: "freeform",
                minLengthChars : 10
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question;
            it('Should return partial failure and repeat question', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "not less than 10")
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            });
        });
        describe('Answer not long enough (words)', () => {
            let returnObj;
            const question = {
                qId: "testF",
                text: "questionText",
                qType: "freeform",
                minLengthWords : 5
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question;
            it('Should return partial failure and repeat question', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "these are four words")
                expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
                expect(returnObj.successData).to.equal(DevConfig.REPEAT_QUESTION_STRING);
            });
        });
        describe('Answer long enough (words)', () => {
            let returnObj;
            const question = {
                qId: "testF",
                text: "questionText",
                qType: "freeform",
                minLengthWords : 5
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question;
            it('Should return partial failure and repeat question', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "these are more than five words")
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            });
        });
        describe('Answer conforms to given list', () => {
            let returnObj;
            const question = {
                qId: "testF",
                text: "questionText",
                qType: "freeform",
                answerShouldBe : ["test1", "test2"]

            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question;
            it('Should return partial failure and repeat question', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "test2")
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            });
        });
        describe('Answer doesnt conform to given list', () => {
            let returnObj;
            const question = {
                qId: "testF",
                text: "questionText",
                qType: "freeform",
                answerShouldBe : ["test1", "test2"]

            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question;
            it('Should return partial failure and repeat question', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "tast2")
                expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
                expect(returnObj.successData).to.equal(DevConfig.REPEAT_QUESTION_STRING);
                console.log(returnObj.failData)
            });
        });
    })
    describe('Free-form multiline', () => {
        let returnObj;
        const question = {
            qId: "testFM",
            text: "questionText",
            qType: "freeformMulti"
        };
        const part = JSON.parse(JSON.stringify(partTemplate));
        part.currentQuestion = question;
        describe('First message', () => {

            it('Should return success and no response', async () => {
                await participants.updateField(part.uniqueId, "currentAnswer", []);
                returnObj = await AnswerHandler.processAnswer(part, "First message")
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NO_RESPONSE_STRING);
            });
            it('Should have added answer to current answer', async () => {
                let participant = await participants.get(part.uniqueId);
                expect(participant.currentAnswer[0]).to.equal("First message");
                part.currentAnswer.push("First message");
            });
        });
        describe('Second message', () => {

            it('Should return success and no response', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "Second message")
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NO_RESPONSE_STRING);
            });
            it('Should have added answer to current answer', async () => {
                let participant = await participants.get(part.uniqueId);
                assert(participant.currentAnswer.includes("First message"));
                expect(participant.currentAnswer[1]).to.equal("Second message");
                part.currentAnswer.push("Second message");
            });
        });
        describe('Terminate message', () => {

            it('Should return success and next action', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "done!")
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            });
            let participant;
            it('Should have added list of answers to participants latest answer', async () => {
                let answerObj = await answers.getCurrent(part.uniqueId);
                let latestAns = answerObj.answers[answerObj.answers.length-1].answer;
                expect(latestAns).to.eql(["First message", "Second message"]);
            })
            it('Should be in answerReceived state', async () => {
                participant = await participants.get(testId);
                expect(participant.currentState).to.eql("answerReceived");
            })
        })
        describe('Answer not long enough (chars)', () => {
            let returnObj;
            const question = {
                qId: "testF",
                text: "questionText",
                qType: "freeformMulti",
                minLengthChars : 10
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question;
            part.currentAnswer = ["less", "10"]
            it('Should return partial failure and repeat question', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "done")
                expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
                expect(returnObj.successData).to.equal(DevConfig.REPEAT_QUESTION_STRING);
            });
        });
        describe('Answer long enough (chars)', () => {
            let returnObj;
            const question = {
                qId: "testF",
                text: "questionText",
                qType: "freeformMulti",
                minLengthChars : 10
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question;
            part.currentAnswer = ["not", "less than", "10"];
            it('Should return success and next action', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "done")
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            });
        });
        describe('Answer not long enough (words)', () => {
            let returnObj;
            const question = {
                qId: "testF",
                text: "questionText",
                qType: "freeformMulti",
                minLengthWords : 5
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question;
            part.currentAnswer = ["less", "than", "five words"];

            it('Should return partial failure and repeat question', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "done")
                expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
                expect(returnObj.successData).to.equal(DevConfig.REPEAT_QUESTION_STRING);
            });
        });
        describe('Answer long enough (words)', () => {
            let returnObj;
            const question = {
                qId: "testF",
                text: "questionText",
                qType: "freeformMulti",
                minLengthWords : 5
            };
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question;
            part.currentAnswer = ["not", "less than", "five words", "this time"];

            it('Should return success and next action', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "done")
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            });
        });
        describe('Fail when participant language missing', () => {
            let part2 = JSON.parse(JSON.stringify(part));
            delete part2["parameters"]["language"];
            it('Should return failure', async () => {
                returnObj = await AnswerHandler.processAnswer(part2, "done!");
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            })
        })


    })

    describe('Number', () => {

        let returnObj;
        describe('No range', () => {
            const question = {
                qId : "test",
                qType : "number"
            }
            const part = JSON.parse(JSON.stringify(partTemplate));
            part.currentQuestion = question;
            it('Should return success on integer number', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "234")
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            })
            it('Should return success on float number', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "234.44")
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            })
            it('Should return partial failure and repeat question on not number', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "help")
                expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
                expect(returnObj.successData).to.equal(DevConfig.REPEAT_QUESTION_STRING);
            })
            it('Should return partial failure and repeat question on empty string', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "")
                expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
                expect(returnObj.successData).to.equal(DevConfig.REPEAT_QUESTION_STRING);
            })
        })
        describe('With bounds', () => {
            describe('only lower bound', () =>{
                const question = {
                    qId : "test",
                    qType : "number",
                    range : {
                        lower: -10
                    }
                }
                const part = JSON.parse(JSON.stringify(partTemplate));
                part.currentQuestion = question;
                it('Should return success on integer number above lb', async () => {
                    returnObj = await AnswerHandler.processAnswer(part, "-5")
                    expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                    expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
                })
                it('Should return success on float number above lb', async () => {
                    returnObj = await AnswerHandler.processAnswer(part, "11.4")
                    expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                    expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
                })
                it('Should return partial failure and repeat question on int lower than lb', async () => {
                    returnObj = await AnswerHandler.processAnswer(part, "-12")
                    expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
                    expect(returnObj.successData).to.equal(DevConfig.REPEAT_QUESTION_STRING);
                    // console.log(returnObj.failData);
                })
            })

            describe('only upper bound (float)', () =>{
                const question = {
                    qId : "test",
                    qType : "number",
                    range : {
                        upper: 10.434
                    }
                }
                const part = JSON.parse(JSON.stringify(partTemplate));
                part.currentQuestion = question;
                it('Should return success on integer number below ub', async () => {
                    returnObj = await AnswerHandler.processAnswer(part, "10")
                    expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                    expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
                })
                it('Should return success on float number below ub', async () => {
                    returnObj = await AnswerHandler.processAnswer(part, "10.433")
                    expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                    expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
                })
                it('Should return partial failure and repeat question on float number below ub', async () => {
                    returnObj = await AnswerHandler.processAnswer(part, "10.435")
                    expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
                    expect(returnObj.successData).to.equal(DevConfig.REPEAT_QUESTION_STRING);
                    // console.log(returnObj.failData);
                })
            })

        })
    })
});
describe('Handling no answer', () => {
    const testQuestion = {
        qId: "test",
        text: "testQuestion"
    }
    it('Should update answer with no response', async () => {
        await participants.updateField(testId, "currentState", "awaitingAnswer");
        await participants.eraseCurrentAnswer(testId);
        await participants.updateField(testId, "currentQuestion", testQuestion);
        let returnObj = await AnswerHandler.handleNoResponse(testId);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);

        let participant = await participants.get(testId);
        let answerObj = await answers.getCurrent(testId);
        let lastAnswer = answerObj.answers[answerObj.answers.length-1];
        expect(lastAnswer.answer).to.eql([DevConfig.NO_RESPONSE_STRING]);
        expect(lastAnswer.qId).to.equal(testQuestion.qId);
        expect(lastAnswer.text).to.equal(testQuestion.text);
        expect(participant.currentState).to.equal("answerReceived");
    });
    it('Should update answer with no response - scheduled', async () => {
        await participants.updateField(testId, "currentState", "awaitingAnswerScheduled");
        await participants.eraseCurrentAnswer(testId);
        await participants.updateField(testId, "currentQuestion", testQuestion);
        let returnObj = await AnswerHandler.handleNoResponse(testId);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);

        let participant = await participants.get(testId);
        let answerObj = await answers.getCurrent(testId);
        let lastAnswer = answerObj.answers[answerObj.answers.length-1];
        expect(lastAnswer.answer).to.eql([DevConfig.NO_RESPONSE_STRING]);
        expect(lastAnswer.qId).to.equal(testQuestion.qId);
        expect(lastAnswer.text).to.equal(testQuestion.text);
        expect(participant.currentState).to.equal("answerReceived");
    });
    it('Should update answer with invalid answer', async () => {
        let testCurrentAnswer = ["hello"]
        await participants.updateField(testId, "currentState", "invalidAnswer");
        await participants.updateField(testId, "currentAnswer", testCurrentAnswer);
        await participants.eraseCurrentAnswer(testId);
        await participants.updateField(testId, "currentQuestion", testQuestion);
        let returnObj = await AnswerHandler.handleNoResponse(testId);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);

        let participant = await participants.get(testId);
        let answerObj = await answers.getCurrent(testId);
        let lastAnswer = answerObj.answers[answerObj.answers.length-1];
        assert(lastAnswer.answer[0].startsWith(DevConfig.INVALID_ANSWER_STRING));
        assert(lastAnswer.answer[0].includes(DevConfig.INVALID_ANSWER_STRING));
        expect(lastAnswer.qId).to.equal(testQuestion.qId);
        expect(lastAnswer.text).to.equal(testQuestion.text);
        expect(participant.currentState).to.equal("answerReceived");
    });
    it('Should update answer with repeat question', async () => {
        await participants.updateField(testId, "currentState", "repeatQuestion");
        await participants.eraseCurrentAnswer(testId);
        await participants.updateField(testId, "currentQuestion", testQuestion);
        let returnObj = await AnswerHandler.handleNoResponse(testId);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);

        let participant = await participants.get(testId);
        let answerObj = await answers.getCurrent(testId);
        let lastAnswer = answerObj.answers[answerObj.answers.length-1];
        expect(lastAnswer.answer).to.eql([DevConfig.REPEAT_QUESTION_STRING]);
        expect(lastAnswer.qId).to.equal(testQuestion.qId);
        expect(lastAnswer.text).to.equal(testQuestion.text);
        expect(participant.currentState).to.equal("answerReceived");
    });
    it('Should update answer with current Answer', async () => {
        const currentAnswer = ["a","b","c"];
        await participants.updateField(testId, "currentState", "awaitingAnswer");
        await participants.updateField(testId,"currentAnswer", currentAnswer);
        await participants.updateField(testId, "currentQuestion", testQuestion);
        let returnObj = await AnswerHandler.handleNoResponse(testId);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);

        let participant = await participants.get(testId);
        let answerObj = await answers.getCurrent(testId);
        let lastAnswer = answerObj.answers[answerObj.answers.length-1];
        expect(lastAnswer.answer).to.eql(currentAnswer);
        expect(lastAnswer.qId).to.equal(testQuestion.qId);
        expect(lastAnswer.text).to.equal(testQuestion.text);
        expect(participant.currentState).to.equal("answerReceived");

    });
    it('Should update answer with current Answer - scheduled', async () => {
        const currentAnswer = ["a","b","c"];
        await participants.updateField(testId, "currentState", "awaitingAnswerScheduled");
        await participants.updateField(testId,"currentAnswer", currentAnswer);
        await participants.updateField(testId, "currentQuestion", testQuestion);
        let returnObj = await AnswerHandler.handleNoResponse(testId);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);

        let participant = await participants.get(testId);
        let answerObj = await answers.getCurrent(testId);
        let lastAnswer = answerObj.answers[answerObj.answers.length-1];
        expect(lastAnswer.answer).to.eql(currentAnswer);
        expect(lastAnswer.qId).to.equal(testQuestion.qId);
        expect(lastAnswer.text).to.equal(testQuestion.text);
        expect(participant.currentState).to.equal("answerReceived");

    });

    it('Should not do anything when not awaiting answer', async () => {
        await participants.updateField(testId, "currentState", "answerReceived");
        let returnObj = await AnswerHandler.handleNoResponse(testId);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.equal("");
    });
})
describe('Severing DB connection', () => {
    it('Should remove participant', async () => {
        await participants.remove(testId);
        let participant = await participants.get(testId);
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
