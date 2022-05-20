const { expect, assert } = require('chai');
const config = require('../json/config.json');
const DevConfig = require('../json/devConfig.json');

const ConfigParser = require('../src/configParser');


describe('Replacing variables', () => {
    describe('Isolate Variables', () => {
        it('Should isolate variable at beginning', () => {
            let testString = "${Name} am I";
            let expectedSplit = ["${Name}", " am I"];
            let expectedIsVarArr = [true, false];
            let returnObj = ConfigParser.isolateVariables(testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.splitArr).to.eql(expectedSplit);
            expect(returnObj.data.isVarArr).to.eql(expectedIsVarArr);
        })
        it('Should isolate variable at end', () => {
            let testString = "I am ${Name}";
            let expectedSplit = ["I am ", "${Name}"];
            let expectedIsVarArr = [false, true];

            let returnObj = ConfigParser.isolateVariables(testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.splitArr).to.eql(expectedSplit);
            expect(returnObj.data.isVarArr).to.eql(expectedIsVarArr);
        })
        it('Should isolate multiple variables', () => {
            let testString = "${MyName} is ${Name}, I promise";
            let expectedSplit = ["${MyName}", " is ", "${Name}", ", I promise"];
            let expectedIsVarArr = [true, false, true, false];

            let returnObj = ConfigParser.isolateVariables(testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.splitArr).to.eql(expectedSplit);
            expect(returnObj.data.isVarArr).to.eql(expectedIsVarArr);
        })
        it('Should handle one variable right after another', () => {
            let testString = "The product costs $${dollarAmt}${dollarSymbol}";
            let expectedSplit = ["The product costs $", "${dollarAmt}", "${dollarSymbol}"];
            let expectedIsVarArr = [false, true, true];
            let returnObj = ConfigParser.isolateVariables(testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.splitArr).to.eql(expectedSplit);
            expect(returnObj.data.isVarArr).to.eql(expectedIsVarArr);
        })
        it('Should consider normal $ as text', () => {
            let testString = "I owe ${name} $100 dollars";
            let expectedSplit = ["I owe ", "${name}", " $100 dollars"];
            let expectedIsVarArr = [false, true, false];
            let returnObj = ConfigParser.isolateVariables(testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.splitArr).to.eql(expectedSplit);
            expect(returnObj.data.isVarArr).to.eql(expectedIsVarArr);
        })
        it('Should handle one $ as text before variable', () => {
            let testString = "The product costs $${dollarAmt}";
            let expectedSplit = ["The product costs $", "${dollarAmt}"];
            let expectedIsVarArr = [false, true];
            let returnObj = ConfigParser.isolateVariables(testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.splitArr).to.eql(expectedSplit);
            expect(returnObj.data.isVarArr).to.eql(expectedIsVarArr);
        })
        it('Should handle arbitrary number of $ as text before variable', () => {
            let testString = "The product costs $$$${dollarAmt}";
            let expectedSplit = ["The product costs $$$", "${dollarAmt}"];
            let expectedIsVarArr = [false, true];
            let returnObj = ConfigParser.isolateVariables(testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.splitArr).to.eql(expectedSplit);
            expect(returnObj.data.isVarArr).to.eql(expectedIsVarArr);
        })
        it('Should consider normal {} as text', () => {
            let testString = "The {product} costs $${dollarAmt}";
            let expectedSplit = ["The {product} costs $", "${dollarAmt}"];
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
    const participant = {
        firstName: "John",
        currentAnswer: ["Mon", "Tue", "Wed"],
        uniqueId: "12345",
        parameters : {
            "pId" : "80085",
            "pLength" : undefined
        }
    }

    describe('Get Variables', () => {
        it('Should fetch string variable', () => {
            let testString = DevConfig.VAR_STRINGS.FIRST_NAME;
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(participant.firstName)
        })
        it('Should fetch array variable', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;

            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(participant.currentAnswer);
        })
        it('Should fetch if variable name is param', () => {
            let testString = "pId";
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(participant.parameters.pId);
        })
        it('Should fail if participant undefined', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;
            let returnObj = ConfigParser.getVariable(undefined, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if participant not object', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;

            let returnObj = ConfigParser.getVariable("crack", testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if participant doesnt have firstName', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;
            delete participant["firstName"];
            let returnObj = ConfigParser.getVariable(participant, testString);
            participant["firstName"] = "John"
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if participant dont have currentAnswer', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;
            delete participant["currentAnswer"];
            let returnObj = ConfigParser.getVariable(participant, testString);
            participant["currentAnswer"] = ["Mon","Tue","Wed"];
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail if participant dont have uniqueId', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;
            delete participant["uniqueId"];
            let returnObj = ConfigParser.getVariable(participant, testString);
            participant["uniqueId"] = "12345";
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail if not string', () => {
            let testString = 1234;
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if variable name dont exist and not in param', () => {
            let testString = "scoop";
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if variable name in parameter but not defined', () => {
            let testString = "pLength";
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
    })
    describe('Replace variables in string', () => {
        it('Should replace variable at beginning of string', () => {
            let testString = "${" + DevConfig.VAR_STRINGS.FIRST_NAME + "} is going to school";
            let expectedString = "John is going to school"
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString, true);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expectedString)
        })
        it('Should replace variable at end of string', () => {
            let testString = "My name is ${" + DevConfig.VAR_STRINGS.FIRST_NAME + "}";
            let expectedString = "My name is " + participant.firstName;
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString, true);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expectedString)
        })

        it('Should replace multiple variables', () => {
            let testString = "${" + DevConfig.VAR_STRINGS.FIRST_NAME + "} is ${" + DevConfig.VAR_STRINGS.FIRST_NAME + "}";
            let expectedString = participant.firstName + " is " + participant.firstName;

            let returnObj = ConfigParser.replaceVariablesInString(participant, testString, true);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expectedString)
        })
        it('Should not replace sensitive data variables if filtered out', () => {
            let testString = "${" + DevConfig.VAR_STRINGS.FIRST_NAME + "} goes to school on" +
                " ${" + DevConfig.VAR_STRINGS.CURRENT_ANSWER + "}";
            let expectedString = "${" + DevConfig.VAR_STRINGS.FIRST_NAME + "} goes to school on " + participant.currentAnswer.join(', ');

            let returnObj = ConfigParser.replaceVariablesInString(participant, testString, false);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expectedString)
        })
        it('Should replace array variables', () => {
            let testString = "I go to school on ${" + DevConfig.VAR_STRINGS.CURRENT_ANSWER + "}";
            let expectedString = "I go to school on " + participant.currentAnswer.join(', ');
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString, true);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expectedString)
        })
        it('Should replace array variables of length 1', () => {
            let testString = "My birthday is on ${" + DevConfig.VAR_STRINGS.CURRENT_ANSWER + "}";
            participant["currentAnswer"] = ["23rd March"];
            let expectedString = "My birthday is on 23rd March"
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString, true);
            participant["currentAnswer"] = ["Mon", "Tue", "Wed"];
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expectedString)
        })
        it('Should fail if participant not object', () => {
            let testString = "My birthday is on ${" + DevConfig.VAR_STRINGS.CURRENT_ANSWER + "}";
            let returnObj = ConfigParser.replaceVariablesInString("crack", testString, true);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if participant doesnt have firstName', () => {
            let testString = "\"I go to school on ${\" + DevConfig.VAR_STRINGS.CURRENT_ANSWER + \"}\"";
            delete participant["firstName"];
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString, true);
            participant["firstName"] = "John"
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if participant dont have currentAnswer', () => {
            let testString = "I go to school on ${" + DevConfig.VAR_STRINGS.CURRENT_ANSWER + "}";
            delete participant["currentAnswer"];
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString, true);
            participant["currentAnswer"] = ["Mon","Tue","Wed"];
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail if participant dont have uniqueId', () => {
            let testString = "I go to school on ${" + DevConfig.VAR_STRINGS.CURRENT_ANSWER + "}";
            delete participant["uniqueId"];
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString, true);
            participant["uniqueId"] = "12345";
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail if not string', () => {
            let testString = 1234;

            let returnObj = ConfigParser.replaceVariablesInString(participant, testString, true);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if variable name dont exist', () => {
            let testString = "My birthday is on ${birthday}";

            let returnObj = ConfigParser.replaceVariablesInString(participant, testString, true);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when variable bracket } not closed in middle', () => {
            let testString = "${Name is my name";
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString, true);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when variable bracket } not closed at end', () => {
            let testString = "The product costs ${dollarAmt";
            let returnObj = ConfigParser.replaceVariablesInString(participant, testString, true);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
    })

    describe('Replace specific variables in string', () => {
        const varVals = {};
        varVals[DevConfig.VAR_STRINGS.FIRST_NAME] = participant.firstName;
        varVals[DevConfig.VAR_STRINGS.CURRENT_ANSWER] = participant.currentAnswer;
        varVals[DevConfig.VAR_STRINGS.UNIQUE_ID] = participant.uniqueId;
        it('Should replace variable at beginning of string', () => {
            let testString = "${" + DevConfig.VAR_STRINGS.FIRST_NAME + "} is going to school";
            let expectedString = "John is going to school"
            let returnObj = ConfigParser.replaceSpecificVariablesInString(testString, varVals);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expectedString)
        })
        it('Should replace variable at end of string', () => {
            let testString = "My name is ${" + DevConfig.VAR_STRINGS.FIRST_NAME + "}";
            let expectedString = "My name is " + participant.firstName;
            let returnObj = ConfigParser.replaceSpecificVariablesInString(testString, varVals);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expectedString)
        })

        it('Should replace multiple variables', () => {
            let testString = "${" + DevConfig.VAR_STRINGS.FIRST_NAME + "} is ${" + DevConfig.VAR_STRINGS.FIRST_NAME + "}";
            let expectedString = participant.firstName + " is " + participant.firstName;

            let returnObj = ConfigParser.replaceSpecificVariablesInString(testString, varVals);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expectedString)
        })

        it('Should replace array variables', () => {
            let testString = "I go to school on ${" + DevConfig.VAR_STRINGS.CURRENT_ANSWER + "}";
            let expectedString = "I go to school on " + participant.currentAnswer.join(', ');
            let returnObj = ConfigParser.replaceSpecificVariablesInString(testString, varVals);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expectedString)
        })
        it('Should replace array variables of length 1', () => {
            let testString = "My birthday is on ${" + DevConfig.VAR_STRINGS.CURRENT_ANSWER + "}";
            varVals[DevConfig.VAR_STRINGS.CURRENT_ANSWER] = ["23rd March"];
            let expectedString = "My birthday is on 23rd March"
            let returnObj = ConfigParser.replaceSpecificVariablesInString(testString, varVals);
            varVals[DevConfig.VAR_STRINGS.CURRENT_ANSWER] = ["Mon", "Tue", "Wed"];
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expectedString)
        })
        it('Should not replace if variable dont exist in varvals', () => {
            let testString = "My name is ${Name}";
            let expectedString = "My name is ${Name}";
            let returnObj = ConfigParser.replaceSpecificVariablesInString(testString, varVals);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expectedString)
        })
        it('Should fail if varvals not object', () => {
            let testString = "My birthday is on ${" + DevConfig.VAR_STRINGS.CURRENT_ANSWER + "}";
            let returnObj = ConfigParser.replaceSpecificVariablesInString(testString, "varVals");
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if not string', () => {
            let testString = 1234;
            let returnObj = ConfigParser.replaceSpecificVariablesInString(testString, varVals);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })

    })
})

describe('Evaluating conditions ', () => {
    const options = ["Sad", "Frustrated", "Discontent", "Stressed","Content", "Happy", "Proud", "Excited", "Secret"];
    const replyRules = [
        {
            optionIndices: [0,1,2,3],
            data: ["Sorry to hear! :("]
        },
        {
            optionIndices: [4,5,6,7],
            data: ["Good news! :)"]
        },
        {
            optionIndices: [0,2],
            data: ["Third option! :("]
        }

    ]
    describe('Single choice', () => {

        it('Should return success when match', () =>{
            let answer = ["Frustrated"];
            let returnObj = ConfigParser.evaluateAnswerConditions(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[0].data);
        })
        it('Should return narrower match when multiple match', () =>{
            let answer = ["Sad"];
            let returnObj = ConfigParser.evaluateAnswerConditions(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[2].data);
        })
        it('Should return success when match - 2', () =>{
            let answer = ["Content"];
            let returnObj = ConfigParser.evaluateAnswerConditions(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[1].data);
        })
        it('Should return partial failure when no match', () =>{
            let answer = ["Secret"];
            let returnObj = ConfigParser.evaluateAnswerConditions(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
            expect(returnObj.successData).to.equal(DevConfig.NO_RESPONSE_STRING);
        })
        it('Should return partial failure when answer doesnt exist', () =>{
            let answer = ["Peepee"];
            let returnObj = ConfigParser.evaluateAnswerConditions(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
            expect(returnObj.successData).to.equal(DevConfig.NO_RESPONSE_STRING);
        })
    })
    describe('Multiple choice ', function () {
        it('Should return correct option when whole match', () =>{
            let answer = ["Frustrated", "Sad"];
            let returnObj = ConfigParser.evaluateAnswerConditions(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[0].data);
        })
        it('Should return outweighing match when multiple rules match ', () =>{
            let answer = ["Frustrated", "Sad", "Happy"];
            let returnObj = ConfigParser.evaluateAnswerConditions(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[0].data);
        })
        it('Should return first success when even match of even resolution', () =>{
            let answer = ["Frustrated", "Happy"];
            let returnObj = ConfigParser.evaluateAnswerConditions(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[0].data);
        })
        it('Should return correct option when whole match - 2', () =>{
            let answer = ["Content", "Excited"];
            let returnObj = ConfigParser.evaluateAnswerConditions(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[1].data);
        })
        it('Should return outweighing match when multiple rules match - 2', () =>{
            let answer = ["Content", "Excited", "Stressed"];
            let returnObj = ConfigParser.evaluateAnswerConditions(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[1].data);
        })
        it('Should return narrower match when two rules overlap', () =>{
            let answer = ["Sad", "Discontent"];
            let returnObj = ConfigParser.evaluateAnswerConditions(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[2].data);
        })
    });
    describe('Failures', () => {
        it('Should fail when rule list not list', () => {
            let returnObj = ConfigParser.evaluateAnswerConditions("test", options, ["Sad"]);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when options not list', () => {
            let returnObj = ConfigParser.evaluateAnswerConditions(replyRules, "options", ["Sad"]);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when answer not list', () => {
            let returnObj = ConfigParser.evaluateAnswerConditions(replyRules, options, "Sad");
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when reply rules missing option indices', () => {
            let newRules = JSON.parse(JSON.stringify(replyRules));
            delete newRules[0]['optionIndices'];
            let returnObj = ConfigParser.evaluateAnswerConditions(newRules, options, ["Sad"]);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when reply rules option indices not array', () => {
            let newRules = JSON.parse(JSON.stringify(replyRules));
            newRules[0]['optionIndices'] = "string";
            let returnObj = ConfigParser.evaluateAnswerConditions(newRules, options, ["Sad"]);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
    })
})

describe('Parse simple expression', () => {
    it('Should parse parameter and number operands normally', () => {
        let expression = "${Parameter} GREATER_THAN $N{10}"
        let expectedObj = {
            operand1: {
                value : "Parameter",
                type : DevConfig.OPERAND_TYPES.VARIABLE
            },
            operator : "GREATER_THAN",
            operand2 : {
                value : "10",
                type : DevConfig.OPERAND_TYPES.NUMBER
            }
        }
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.eql(expectedObj);
    })
    it('Should fail if variable token not closed', () => {
        let expression = "${Parameter GREATER_THAN $N{10}"
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if variable token not opened', () => {
        let expression = "$Parameter} GREATER_THAN $N{10}"
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if expression doesnt begin with token', () => {
        let expression = "Parameter GREATER_THAN $N{10}"
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if expression doesnt have operator', () => {
        let expression = "${Parameter} $N{10}"
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if expression doesnt have second operand', () => {
        let expression = "${Parameter} AND "
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if expression not string', () => {
        let expression = 132
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if number token braces not opened', () => {
        let expression = "${Parameter} AND $N10}"
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if number token braces not closed', () => {
        let expression = "${Parameter} AND $N{10"
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should parse string and number array operands normally', () => {
        let expression = "$S{John} IS_CHOICE $N*{1,3,4}"
        let expectedObj = {
            operand1: {
                value : "John",
                type : DevConfig.OPERAND_TYPES.STRING
            },
            operator : "IS_CHOICE",
            operand2 : {
                value : "1,3,4",
                type : DevConfig.OPERAND_TYPES.NUMBER_ARRAY
            }
        }
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.eql(expectedObj);
    })
    it('Should fail if string token braces not opened', () => {
        let expression = "$Shelp} AND $N{10}"
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if string token braces not closed', () => {
        let expression = "$S{help AND $N{10}"
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if number array token braces not opened', () => {
        let expression = "$S{help} AND $N*1,3,4}"
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if number array token braces not closed', () => {
        let expression = "$S{help} AND $N*{1,3,4"
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should parse boolean and string array operands normally', () => {
        let expression = "$B{TRUE} IN_ARRAY $S*{fee,fi,fo,fum}"
        let expectedObj = {
            operand1: {
                value : "TRUE",
                type : DevConfig.OPERAND_TYPES.BOOLEAN
            },
            operator : "IN_ARRAY",
            operand2 : {
                value : "fee,fi,fo,fum",
                type : DevConfig.OPERAND_TYPES.STRING_ARRAY
            }
        }
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.eql(expectedObj);
    })
    it('Should fail if boolean token braces not opened', () => {
        let expression = "$BTRUE} AND $S*{fee,fi,fo,fum}"
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if boolean token braces not closed', () => {
        let expression = "$B{TRUE AND $S*{fee,fi,fo,fum}"
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if string array token braces not opened', () => {
        let expression = "$B{TRUE} AND $S*fee,fi,fo,fum}"
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if string array token braces not closed', () => {
        let expression = "$B{TRUE} AND $S*{fee,fi,fo,fum"
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })

    it('Should ignore everything after second operand', () => {
        let expression = "$B{TRUE} IN_ARRAY $S*{fee,fi,fo,fum} hello test"
        let expectedObj = {
            operand1: {
                value : "TRUE",
                type : DevConfig.OPERAND_TYPES.BOOLEAN
            },
            operator : "IN_ARRAY",
            operand2 : {
                value : "fee,fi,fo,fum",
                type : DevConfig.OPERAND_TYPES.STRING_ARRAY
            }
        }
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.eql(expectedObj);
    })
    it('Should parse expression operands normally', () => {
        let expression = "(${isMan} == $B{TRUE}) AND (${isWoman} == $B{FALSE})"
        let expectedObj = {
            operand1: {
                value : "${isMan} == $B{TRUE}",
                type : DevConfig.OPERAND_TYPES.EXPRESSION
            },
            operator : "AND",
            operand2 : {
                value : "${isWoman} == $B{FALSE}",
                type : DevConfig.OPERAND_TYPES.EXPRESSION
            }
        }
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.eql(expectedObj);
    })
    it('Should ignore everything after second expression operand', () => {
        let expression = "(${isMan} == $B{TRUE}) AND (${isWoman} == $B{FALSE}) scoop"
        let expectedObj = {
            operand1: {
                value : "${isMan} == $B{TRUE}",
                type : DevConfig.OPERAND_TYPES.EXPRESSION
            },
            operator : "AND",
            operand2 : {
                value : "${isWoman} == $B{FALSE}",
                type : DevConfig.OPERAND_TYPES.EXPRESSION
            }
        }
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.eql(expectedObj);
    })
    it('Should remove arbitrary number of enclosing brackets', () => {
        let expression = "(((${isMan} == $B{TRUE}) AND (${isWoman} == $B{FALSE})))"
        let expectedObj = {
            operand1: {
                value : "${isMan} == $B{TRUE}",
                type : DevConfig.OPERAND_TYPES.EXPRESSION
            },
            operator : "AND",
            operand2 : {
                value : "${isWoman} == $B{FALSE}",
                type : DevConfig.OPERAND_TYPES.EXPRESSION
            }
        }
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.eql(expectedObj);
    })
    it('Should fail if expression braces not balanced - extra close', () => {
        let expression = "(${isMan} == $B{TRUE})) AND (${isWoman} == $B{FALSE})"
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if expression braces not balanced - extra open', () => {
        let expression = "((${isMan} == $B{TRUE}) AND (${isWoman} == $B{FALSE})"
        let returnObj = ConfigParser.parseSimpleExpression(expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
})
describe('Removing enclosing braces', () => {
    it('Should remove enclosing braces normally', () => {
        let testString = "(hello)"
        let expectedString = "hello"
        let ret = ConfigParser.removeEnclosingBrackets(testString);
        expect(ret).to.equal(expectedString);
    })
    it('Should remove enclosing braces when there are nested expressions', () => {
        let testString = "((hello) and (bye))"
        let expectedString = "(hello) and (bye)"
        let ret = ConfigParser.removeEnclosingBrackets(testString);
        expect(ret).to.equal(expectedString);
    })

    it('Should remove enclosing braces when there are nested expressions - 2', () => {
        let testString = "((${isMan} == $B{TRUE}) AND (${isWoman} == $B{FALSE}))"
        let expectedString = "(${isMan} == $B{TRUE}) AND (${isWoman} == $B{FALSE})"
        let ret = ConfigParser.removeEnclosingBrackets(testString);
        expect(ret).to.equal(expectedString);
    })
    it('Should remove only one set of enclosing braces when there are multiple', () => {
        let testString = "(((hello) and (bye)))"
        let expectedString = "((hello) and (bye))"
        let ret = ConfigParser.removeEnclosingBrackets(testString);
        expect(ret).to.equal(expectedString);
    })
    it('Shouldnt remove when the brackets aint enclosed', () => {
        let testString = "(hello) and (bye)"
        let expectedString = "(hello) and (bye)"
        let ret = ConfigParser.removeEnclosingBrackets(testString);
        expect(ret).to.equal(expectedString);
    })
    it('Shouldnt change when doesnt end in bracket', () => {
        let testString = "(hello and bye"
        let expectedString = "(hello and bye"
        let ret = ConfigParser.removeEnclosingBrackets(testString);
        expect(ret).to.equal(expectedString);
    })
    it('Shouldnt change when doesnt begin with bracket', () => {
        let testString = "hello and bye)"
        let expectedString = "hello and bye)"
        let ret = ConfigParser.removeEnclosingBrackets(testString);
        expect(ret).to.equal(expectedString);
    })
})
describe('Getting values from strings', () => {
    describe('Number', () => {
        it('Should return integer', () => {
            let testStr = "123";
            let expectedVal = 123;
            let returnObj = ConfigParser.getNumberFromString(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return float', () => {
            let testStr = "123.2";
            let expectedVal = 123.2;
            let returnObj = ConfigParser.getNumberFromString(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should fail when not number', () => {
            let testStr = "afd";
            let returnObj = ConfigParser.getNumberFromString(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when not string', () => {
            let testStr = 123;
            let returnObj = ConfigParser.getNumberFromString(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when empty string', () => {
            let testStr = "  ";
            let returnObj = ConfigParser.getNumberFromString(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
    })
    describe('Number array', () => {
        it('Should return integer array', () => {
            let testStr = "123, 456, 789";
            let expectedVal = [123, 456, 789];
            let returnObj = ConfigParser.getNumberArrayFromString(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return float array', () => {
            let testStr = "123.4, 456.5, 789.6";
            let expectedVal = [123.4, 456.5, 789.6];
            let returnObj = ConfigParser.getNumberArrayFromString(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return int array of length 1', () => {
            let testStr = "123";
            let expectedVal = [123];
            let returnObj = ConfigParser.getNumberArrayFromString(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should fail when any part of string number', () => {
            let testStr = "123, test, 789";
            let returnObj = ConfigParser.getNumberArrayFromString(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when any part of string is empty', () => {
            let testStr = "123,, 789";
            let returnObj = ConfigParser.getNumberArrayFromString(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when not string', () => {
            let testStr = 123;
            let returnObj = ConfigParser.getNumberArrayFromString(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when empty string', () => {
            let testStr = "  ";
            let returnObj = ConfigParser.getNumberArrayFromString(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
    })
})