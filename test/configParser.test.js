const { expect, assert } = require('chai');
const config = require('../json/config.json');
const DevConfig = require('../json/devConfig.json');

const ConfigParser = require('../src/configParser');


describe('Replacing variables', () => {
    describe('Isolate Variables', () => {
        it('Should isolate variable at beginning', () => {
            let testString = "${Name} am I";
            let expectedSplit = ["{Name}", " am I"];
            let expectedIsVarArr = [true, false];
            let returnObj = ConfigParser.isolateVariables(testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.splitArr).to.eql(expectedSplit);
            expect(returnObj.data.isVarArr).to.eql(expectedIsVarArr);
        })
        it('Should isolate variable at end', () => {
            let testString = "I am ${Name}";
            let expectedSplit = ["I am ", "{Name}"];
            let expectedIsVarArr = [false, true];

            let returnObj = ConfigParser.isolateVariables(testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.splitArr).to.eql(expectedSplit);
            expect(returnObj.data.isVarArr).to.eql(expectedIsVarArr);
        })
        it('Should isolate multiple variables', () => {
            let testString = "${MyName} is ${Name}, I promise";
            let expectedSplit = ["{MyName}", " is ", "{Name}", ", I promise"];
            let expectedIsVarArr = [true, false, true, false];

            let returnObj = ConfigParser.isolateVariables(testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.splitArr).to.eql(expectedSplit);
            expect(returnObj.data.isVarArr).to.eql(expectedIsVarArr);
        })
        it('Should consider normal $ as text', () => {
            let testString = "I owe ${name} $100 dollars";
            let expectedSplit = ["I owe ", "{name}", " $100 dollars"];
            let expectedIsVarArr = [false, true, false];
            let returnObj = ConfigParser.isolateVariables(testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.splitArr).to.eql(expectedSplit);
            expect(returnObj.data.isVarArr).to.eql(expectedIsVarArr);
        })
        it('Should handle one $ as text before variable', () => {
            let testString = "The product costs $${dollarAmt}";
            let expectedSplit = ["The product costs $", "{dollarAmt}"];
            let expectedIsVarArr = [false, true];
            let returnObj = ConfigParser.isolateVariables(testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.splitArr).to.eql(expectedSplit);
            expect(returnObj.data.isVarArr).to.eql(expectedIsVarArr);
        })
        it('Should handle arbitrary number of $ as text before variable', () => {
            let testString = "The product costs $$$${dollarAmt}";
            let expectedSplit = ["The product costs $$$", "{dollarAmt}"];
            let expectedIsVarArr = [false, true];
            let returnObj = ConfigParser.isolateVariables(testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.splitArr).to.eql(expectedSplit);
            expect(returnObj.data.isVarArr).to.eql(expectedIsVarArr);
        })
        it('Should consider normal {} as text', () => {
            let testString = "The {product} costs $${dollarAmt}";
            let expectedSplit = ["The {product} costs $", "{dollarAmt}"];
            let expectedIsVarArr = [false, true];
            let returnObj = ConfigParser.isolateVariables(testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.splitArr).to.eql(expectedSplit);
            expect(returnObj.data.isVarArr).to.eql(expectedIsVarArr);
        })
        it('Should fail when variable bracket } not closed in middle', () => {
            let testString = "${Name is my name";
            let returnObj = ConfigParser.isolateVariables(testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when variable bracket } not closed at end', () => {
            let testString = "The product costs ${dollarAmt";
            let returnObj = ConfigParser.isolateVariables(testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if not string', () => {
            let testString = 1234;
            let returnObj = ConfigParser.isolateVariables(testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
    })
    describe('Get Variables', () => {
        it('Should fetch string variable', () => {
            let testString = DevConfig.VAR_STRINGS.FIRST_NAME;
            let participant = {
                firstName: "John",
                currentAnswer: ["speem"]
            }
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(participant.firstName)
        })
        it('Should fetch array variable', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;
            let participant = {
                firstName: "John",
                currentAnswer: ["speem", "spoom"]
            }
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(participant.currentAnswer);
        })

        it('Should fail if participant undefined', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;
            let participant;
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if participant not object', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;
            let participant = "crack";
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if participant doesnt have firstName', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;
            let participant = {
                currentAnswer: ["speem"]
            }
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if participant dont have currentAnswer', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;
            let participant = {
                firstName: "John"
            }
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if not string', () => {
            let testString = 1234;
            let participant = {
                firstName: "John",
                currentAnswer: ["speem"]
            }
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if variable name dont exist', () => {
            let testString = "scoop";
            let participant = {
                firstName: "John",
                currentAnswer: ["speem"]
            }
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
    })
    describe('Replace variables in string', () => {
        it('Should replace variable at beginning of string', () => {
            let testString = "${" + DevConfig.VAR_STRINGS.FIRST_NAME + "} is going to school";
            let expectedString = "John is going to school"
            let participant = {
                firstName: "John",
                currentAnswer: ["Speem"]
            }
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString);
            console.log(returnObj.data);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expectedString)
        })
        it('Should replace variable at end of string', () => {
            let testString = "My name is ${" + DevConfig.VAR_STRINGS.FIRST_NAME + "}";
            let expectedString = "My name is John"
            let participant = {
                firstName: "John",
                currentAnswer: ["Speem"]
            }
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expectedString)
        })

        it('Should replace multiple variables', () => {
            let testString = "${" + DevConfig.VAR_STRINGS.FIRST_NAME + "} is ${" + DevConfig.VAR_STRINGS.FIRST_NAME + "}";
            let expectedString = "John is John"
            let participant = {
                firstName: "John",
                currentAnswer: ["Speem"]
            }
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expectedString)
        })
        it('Should replace array variables', () => {
            let testString = "I go to school on ${" + DevConfig.VAR_STRINGS.CURRENT_ANSWER + "}";
            let expectedString = "I go to school on Mon, Tue, Wed"
            let participant = {
                firstName: "John",
                currentAnswer: ["Mon", "Tue", "Wed"]
            }
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expectedString)
        })
        it('Should replace array variables of length 1', () => {
            let testString = "My birthday is on ${" + DevConfig.VAR_STRINGS.CURRENT_ANSWER + "}";
            let expectedString = "My birthday is on 23rd March"
            let participant = {
                firstName: "John",
                currentAnswer: ["23rd March"]
            }
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expectedString)
        })
        it('Should fail if participant not object', () => {
            let testString = "My birthday is on ${" + DevConfig.VAR_STRINGS.CURRENT_ANSWER + "}";
            let participant = "crack";
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if participant doesnt have firstName', () => {
            let testString = "My birthday is on ${" + DevConfig.VAR_STRINGS.CURRENT_ANSWER + "}";
            let participant = {
                currentAnswer: ["speem"]
            }
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if participant dont have currentAnswer', () => {
            let testString = "My birthday is on ${" + DevConfig.VAR_STRINGS.CURRENT_ANSWER + "}";
            let participant = {
                firstName: "John"
            }
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if not string', () => {
            let testString = 1234;
            let participant = {
                firstName: "John",
                currentAnswer: ["speem"]
            }
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if variable name dont exist', () => {
            let testString = "My birthday is on ${birthday}";
            let participant = {
                firstName: "John",
                currentAnswer: ["speem"]
            }
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when variable bracket } not closed in middle', () => {
            let testString = "${Name is my name";
            let participant = {
                firstName: "John",
                currentAnswer: ["speem"]
            }
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when variable bracket } not closed at end', () => {
            let testString = "The product costs ${dollarAmt";
            let participant = {
                firstName: "John",
                currentAnswer: ["speem"]
            }
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
    })
})