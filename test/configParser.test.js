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