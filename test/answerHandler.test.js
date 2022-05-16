const { MongoMemoryServer } = require('mongodb-memory-server');

const participants = require('../src/apiControllers/participantApiController');

const mongo = require('mongoose');

const { assert, expect } = require('chai');

const DevConfig = require('../json/devConfig.json');
const config = require('../json/config.json');

const AnswerHandler = require('../src/answerHandler');

const testId = "123";

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
            let participant = await participants.get(testId);
            expect(participant).to.not.be.null;
            expect(participant.uniqueId).to.equal(testId);
            expect(participant.parameters.language).to.equal("English");

        });

    })
})

let testQuestion = {
    qId: "testQ",
    text: "Test text"
};
const testPart = {
    uniqueId: testId,
    currentState: "awaitingAnswer",
    currentQuestion: testQuestion
}
describe('Finish answer', () => {
    describe('Finish string answer with saving', ()=> {
        const addedAnswer = "Europe/Berlin"
        let returnObj, participant;
        it('Should return success with next action string', async () => {
            testQuestion["saveAnswerTo"] = "timezone";
            returnObj = await AnswerHandler.finishAnswering(testPart.uniqueId, testQuestion, addedAnswer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            delete testQuestion["saveAnswerTo"];
        });
        it('Should save string answer to parameter', async () => {
            participant = await participants.get(testPart.uniqueId);
            expect(participant.parameters.timezone).to.equal(addedAnswer);
        });
        it('Should have added answer to participant answer list',  async () => {
            participant = await participants.get(testPart.uniqueId);
            let latestAns = participant.answers[participant.answers.length-1];
            expect(latestAns.qId).to.equal(testQuestion.qId);
            expect(latestAns.text).to.equal(testQuestion.text);
            expect(latestAns.answer).to.eql([addedAnswer]);
        });
        it('Should update current state to answerReceived',  () => {
            expect(participant.currentState).to.equal("answerReceived");
        });
    });

    describe('Finish array answer without saving', () => {
        const addedAnswer = ["answer1", "answer2"];
        let returnObj, participant;
        it('Should return success with next action string', async () => {
            returnObj = await AnswerHandler.finishAnswering(testPart.uniqueId, testQuestion, addedAnswer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
        });
        it('Should have added answer to participant answer list',  async () => {
            participant = await participants.get(testPart.uniqueId);
            let latestAns = participant.answers[participant.answers.length-1];
            expect(latestAns.qId).to.equal(testQuestion.qId);
            expect(latestAns.text).to.equal(testQuestion.text);
            expect(latestAns.answer).to.eql(addedAnswer);
        });
        it('Should update current state to answerReceived',  async () => {
            participant = await participants.get(testPart.uniqueId);
            expect(participant.currentState).to.equal("answerReceived");
        });
    })

    // TODO: Save array answer to parameter, would require specifying string array params in config file
})
describe('Process answer', () =>{

    describe('Failing when required', () => {
        it('Should return no response when participant state is not awaitingAnswer', async () => {
            testPart['currentState'] = "answerReceived";
            testPart['currentQuestion'] = testQuestion;
            let returnObj = await AnswerHandler.processAnswer(testPart, "hello");
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(DevConfig.NO_RESPONSE_STRING);
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
                options: ["hello", "bye"],
                qType: "singleChoice"
            };
            const part = {
                parameters: {language: "English"},
                uniqueId: testId,
                currentState: "awaitingAnswer",
                currentQuestion: question,
            }
            it('Should return success and next action', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "hello")
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            });
        })
        describe('Option invalid', () => {
            let returnObj;
            const question = {
                qId: "test2",
                text: "questionText",
                options: ["hello", "bye"],
                qType: "singleChoice"
            };
            const part = {
                parameters: {language: "English"},
                uniqueId: testId,
                currentState: "awaitingAnswer",
                currentQuestion: question,
            }
            it('Should return partial failure and repeat question', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "toast")
                expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
                expect(returnObj.successData).to.equal(DevConfig.REPEAT_QUESTION_STRING);
            });
        })
        describe('Options missing', () => {
            let returnObj;
            const question = {
                qId: "test2",
                text: "questionText",
                qType: "singleChoice"
            };
            const part = {
                parameters: {language: "English"},
                uniqueId: testId,
                currentState: "awaitingAnswer",
                currentQuestion: question,
            }
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
                qType: "singleChoice"
            };
            const part = {
                uniqueId: testId,
                currentState: "awaitingAnswer",
                currentQuestion: question,
            }
            it('Should return failure', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "toast")
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            });
        })

    })
    describe('Qualtrics', () => {
        const question = {
            qId: "test2",
            text: "questionText",
            qType: "qualtrics"
        };
        const part = {
            parameters: {language: "English"},
            uniqueId: testId,
            currentState: "awaitingAnswer",
            currentQuestion: question,
        }
        describe('String exactly equal expected', () => {
            let returnObj;
            let ansString = "Done";
            it('Should return success and next action', async () => {
                returnObj = await AnswerHandler.processAnswer(part, ansString)
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            });
            it('Should have added answer to part answers', async () => {
                let participant = await participants.get(part.uniqueId);
                let ans = participant.answers;
                expect(ans[ans.length-1].answer[0]).to.equal(ansString)
            });
        });
        describe('String expected with some punctuation', () => {
            let returnObj;
            let ansString = "?!.Do.ne -;:";
            it('Should return success and next action', async () => {
                returnObj = await AnswerHandler.processAnswer(part, ansString)
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            });
            it('Should have added answer to part answers', async () => {
                let participant = await participants.get(part.uniqueId);
                let ans = participant.answers;
                expect(ans[ans.length-1].answer[0]).to.equal(ansString)
            });
        });
        describe('String expected with wrong case', () => {
            let returnObj;
            let ansString = "dOnE";
            it('Should return success and next action', async () => {
                returnObj = await AnswerHandler.processAnswer(part, ansString)
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            });
            it('Should have added answer to part answers', async () => {
                let participant = await participants.get(part.uniqueId);
                let ans = participant.answers;
                expect(ans[ans.length-1].answer[0]).to.equal(ansString)
            });
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

    describe('Multi choice', () => {

        describe('Option valid', () => {
            let returnObj;
            const question = {
                qId: "test2",
                text: "questionText",
                options: ["hello", "bye"],
                qType: "multiChoice"
            };
            const part = {
                parameters: {language: "English"},
                uniqueId: testId,
                currentState: "awaitingAnswer",
                currentQuestion: question,
            }
            it('Should return success and no response', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "hello")
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NO_RESPONSE_STRING);
            });
            it('Should have added answer to current answer', async () => {
                let participant = await participants.get(part.uniqueId);
                assert(participant.currentAnswer.includes("hello"));;
            });
        });
        describe('Option invalid', () => {
            let returnObj;
            const question = {
                qId: "test2",
                text: "questionText",
                options: ["hello", "bye"],
                qType: "multiChoice"
            };
            const part = {
                parameters: {language: "English"},
                uniqueId: testId,
                currentState: "awaitingAnswer",
                currentQuestion: question,
            }
            it('Should return partial failure and repeat question', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "toast")
                expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
                expect(returnObj.successData).to.equal(DevConfig.REPEAT_QUESTION_STRING);
            });
        })
        describe('Terminate choosing', () => {
            let returnObj;
            const question = {
                qId: "test2",
                text: "questionText",
                options: ["hello", "bye"],
                qType: "multiChoice"
            };
            const part = {
                parameters: {language: "English"},
                uniqueId: testId,
                currentState: "awaitingAnswer",
                currentQuestion: question,
            }
            it('Should return success and next action', async () => {
                returnObj = await AnswerHandler.processAnswer(part, config.phrases.keyboards.terminateAnswer[part.parameters.language])
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            });
        })
        describe('Options missing', () => {
            let returnObj;
            const question = {
                qId: "test2",
                text: "questionText",
                qType: "multiChoice"
            };
            const part = {
                parameters: {language: "English"},
                uniqueId: testId,
                currentState: "awaitingAnswer",
                currentQuestion: question,
            }
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
                qType: "multiChoice"
            };
            const part = {
                uniqueId: testId,
                currentState: "awaitingAnswer",
                currentQuestion: question,
            }
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
                qId: "test2",
                text: "questionText",
                qType: "freeform"
            };
            const part = {
                parameters: {language: "English"},
                uniqueId: testId,
                currentState: "awaitingAnswer",
                currentQuestion: question,
            }
            it('Should return success and next action', async () => {
                returnObj = await AnswerHandler.processAnswer(part, "hello")
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);
            });
        });
    })

    describe('Number', () => {

        let returnObj;
        describe('No range', () => {
            const question = {
                qId : "test",
                qType : "number"
            }
            const part = {
                parameters: {language: "English"},
                uniqueId: testId,
                currentState: "awaitingAnswer",
                currentQuestion: question,
            }
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
                const part = {
                    parameters: {language: "English"},
                    uniqueId: testId,
                    currentState: "awaitingAnswer",
                    currentQuestion: question,
                }
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
                const part = {
                    parameters: {language: "English"},
                    uniqueId: testId,
                    currentState: "awaitingAnswer",
                    currentQuestion: question,
                }
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
        let lastAnswer = participant.answers[participant.answers.length-1];
        expect(lastAnswer.answer).to.eql([DevConfig.NO_RESPONSE_STRING]);
        expect(lastAnswer.qId).to.equal(testQuestion.qId);
        expect(lastAnswer.text).to.equal(testQuestion.text);
        expect(participant.currentState).to.equal("answerReceived");
    });
    it('Should update answer with invalid answer', async () => {
        await participants.updateField(testId, "currentState", "invalidAnswer");
        await participants.eraseCurrentAnswer(testId);
        await participants.updateField(testId, "currentQuestion", testQuestion);
        let returnObj = await AnswerHandler.handleNoResponse(testId);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.equal(DevConfig.NEXT_ACTION_STRING);

        let participant = await participants.get(testId);
        let lastAnswer = participant.answers[participant.answers.length-1];
        expect(lastAnswer.answer).to.eql([DevConfig.INVALID_ANSWER_STRING]);
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
        let lastAnswer = participant.answers[participant.answers.length-1];
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
        let lastAnswer = participant.answers[participant.answers.length-1];
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
