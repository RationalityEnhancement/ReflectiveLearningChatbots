const { expect, assert } = require('chai');
const ConfigReader = require('../src/configReader');
const DevConfig = ConfigReader.getDevConfig();

const ConfigParser = require('../src/configParser');
const testConfig = require("../json/test/qHandlerTestConfig.json");
const testConfigConds = require("../json/test/qHandlerTestConfigConds.json");
const testConfigCondsOrig = JSON.parse(JSON.stringify(testConfigConds));
const testConfigOrig = JSON.parse(JSON.stringify(testConfig));


describe('Replacing variables', () => {
    afterEach( () => {
        expect(testConfig).to.eql(testConfigOrig);
        expect(testConfigConds).to.eql(testConfigCondsOrig)
    })
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
            "PID" : "80085",
            "pLength" : undefined,
            "timezone" : "Europe/Berlin"
        },
        parameterTypes : {
            "PID" : "string",
            "pLength" : "number",
            "timezone" : "string"
        },
        stages : {
            activity : [],
            stageName : "Test",
            stageDay : 0
        },
        currentQuestion : {
            qType : "freeformMulti",
        },
        conditionName : "Test"
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
        it('Should fetch current answer as number', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;

            let copyPart = JSON.parse(JSON.stringify(participant));
            copyPart.currentAnswer = ["34"];
            copyPart.currentQuestion.qType = "number";

            let returnObj = ConfigParser.getVariable(copyPart, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(34);
        })
        it('Should fetch current answer as string', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;

            let copyPart = JSON.parse(JSON.stringify(participant));
            copyPart.currentAnswer = ["34"];
            copyPart.currentQuestion.qType = "freeform";

            let returnObj = ConfigParser.getVariable(copyPart, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal("34");
        })
        it('Should fetch if variable name is param', () => {
            let testString = "PID";
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(participant.parameters.PID);
        })
        it('Should fetch if variable name is STAGE_Name', () => {
            let testString = DevConfig.VAR_STRINGS.STAGE_NAME;
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(participant.stages.stageName);
        })
        it('Should fetch if variable name is STAGE_DAY', () => {
            let testString = DevConfig.VAR_STRINGS.STAGE_DAY;
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(participant.stages.stageDay);
        })
        it('Should fetch ANSWER_LEN_CHARS if it is more than one element', () => {
            participant.currentAnswer = ["o", "on", "one"];
            let testString = DevConfig.VAR_STRINGS.ANSWER_LEN_CHARS;
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(6);
        })
        it('Should fetch ANSWER_LEN_CHARS if it is one element', () => {
            participant.currentAnswer = ["oneone"];
            let testString = DevConfig.VAR_STRINGS.ANSWER_LEN_CHARS;
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(6);
        })
        it('Should fetch ANSWER_LEN_CHARS if it is empty', () => {
            participant.currentAnswer = [];
            let testString = DevConfig.VAR_STRINGS.ANSWER_LEN_CHARS;
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(0);
        })
        it('Should fetch ANSWER_LEN_WORDS if it is more than one element', () => {
            participant.currentAnswer = ["I had breakfast", "on the beach", "last Tuesday"];
            let testString = DevConfig.VAR_STRINGS.ANSWER_LEN_WORDS;
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(8);
        })
        it('Should fetch ANSWER_LEN_WORDS if it is one element', () => {
            participant.currentAnswer = ["I had breakfast"];
            let testString = DevConfig.VAR_STRINGS.ANSWER_LEN_WORDS;
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(3);
        })
        it('Should fetch ANSWER_LEN_WORDS if it is empty', () => {
            participant.currentAnswer = [];
            let testString = DevConfig.VAR_STRINGS.ANSWER_LEN_WORDS;
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(0);
        })
        it('Should fetch CONDITION', () => {
            let testString = DevConfig.VAR_STRINGS.CONDITION;
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(participant.conditionName);
        })
        it('Should fetch CONDITION if it is undefined', () => {
            let copyPart = JSON.parse(JSON.stringify(participant));
            copyPart["conditionName"] = undefined;
            let testString = DevConfig.VAR_STRINGS.CONDITION;
            let returnObj = ConfigParser.getVariable(copyPart, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal("");
        })
        it('Should fetch current hour as number', () => {

            let testString = DevConfig.VAR_STRINGS.CURRENT_HOUR;
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(typeof returnObj.data).to.equal("number");
        })
        it('Should fetch current minute as number', () => {

            let testString = DevConfig.VAR_STRINGS.CURRENT_MIN;
            let returnObj = ConfigParser.getVariable(participant, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(typeof returnObj.data).to.equal("number");
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
        it('Should fail if participant dont have stages', () => {
            let testString = DevConfig.VAR_STRINGS.STAGE_NAME;
            let copyPart = JSON.parse(JSON.stringify(participant));
            delete copyPart["stages"];
            let returnObj = ConfigParser.getVariable(copyPart, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail if participant dont have conditionName', () => {
            let testString = DevConfig.VAR_STRINGS.STAGE_NAME;
            let copyPart = JSON.parse(JSON.stringify(participant));
            delete copyPart["conditionName"];
            let returnObj = ConfigParser.getVariable(copyPart, testString);
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
    describe('Get Variable type', () => {
        it('Should fetch string variable', () => {
            let testString = DevConfig.VAR_STRINGS.FIRST_NAME;
            let returnObj = ConfigParser.getVariableType(participant.parameterTypes, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal("string")
        })
        it('Should fetch array variable', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;

            let returnObj = ConfigParser.getVariableType(participant.parameterTypes, testString,"freeformMulti");
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal("strArr")
        })
        it('Should fetch current answer as string', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;

            let returnObj = ConfigParser.getVariableType(participant.parameterTypes, testString,"freeform");
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal("string")
        })
        it('Should fetch current answer as number', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;

            let returnObj = ConfigParser.getVariableType(participant.parameterTypes, testString,"number");
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal("number")
        })

        it('Should fetch if variable name is param', () => {
            let testString = "PID";
            let returnObj = ConfigParser.getVariableType(participant.parameterTypes, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(participant.parameterTypes[testString]);
        })
        it('Should fetch if variable name is STAGE_Name', () => {
            let testString = DevConfig.VAR_STRINGS.STAGE_NAME;
            let returnObj = ConfigParser.getVariableType(participant.parameterTypes, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal("string");
        })
        it('Should fetch if variable name is STAGE_DAY', () => {
            let testString = DevConfig.VAR_STRINGS.STAGE_DAY;
            let returnObj = ConfigParser.getVariableType(participant.parameterTypes, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal("number");
        })
        it('Should fetch ANSWER_LEN_CHARS', () => {
            participant.currentAnswer = ["o", "on", "one"];
            let testString = DevConfig.VAR_STRINGS.ANSWER_LEN_CHARS;
            let returnObj = ConfigParser.getVariableType(participant.parameterTypes, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal("number");
        })

        it('Should fetch ANSWER_LEN_WORDS', () => {
            participant.currentAnswer = ["I had breakfast", "on the beach", "last Tuesday"];
            let testString = DevConfig.VAR_STRINGS.ANSWER_LEN_WORDS;
            let returnObj = ConfigParser.getVariableType(participant.parameterTypes, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal("number");
        })
        it('Should fetch CONDITION', () => {
            let testString = DevConfig.VAR_STRINGS.CONDITION;
            let returnObj = ConfigParser.getVariableType(participant.parameterTypes, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal("string");
        })
        it('Should fetch current hour as number', () => {

            let testString = DevConfig.VAR_STRINGS.CURRENT_HOUR;
            let returnObj = ConfigParser.getVariableType(participant.parameterTypes, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal("number");
        })
        it('Should fetch current minute as number', () => {

            let testString = DevConfig.VAR_STRINGS.CURRENT_MIN;
            let returnObj = ConfigParser.getVariableType(participant.parameterTypes, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal("number");
        })
        it('Should fail if parameterTypes undefined', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;
            let returnObj = ConfigParser.getVariableType(undefined, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if parameterTypes not object', () => {
            let testString = DevConfig.VAR_STRINGS.CURRENT_ANSWER;

            let returnObj = ConfigParser.getVariableType("crack", testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })

        it('Should fail if not string', () => {
            let testString = 1234;
            let returnObj = ConfigParser.getVariableType(participant.parameterTypes, testString);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if variable name dont exist and not in param', () => {
            let testString = "scoop";
            let returnObj = ConfigParser.getVariableType(participant.parameterTypes, testString);
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
        it('Should replace single string with variable', () => {
            let testString = "${" + DevConfig.VAR_STRINGS.FIRST_NAME + "}";
            let expectedString = "John"
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

describe('Evaluating conditions old', () => {
    afterEach( () => {
        expect(testConfig).to.eql(testConfigOrig);
        expect(testConfigConds).to.eql(testConfigCondsOrig)
    })
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
            let returnObj = ConfigParser.evaluateAnswerConditionsOld(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[0].data);
        })
        it('Should return narrower match when multiple match', () =>{
            let answer = ["Sad"];
            let returnObj = ConfigParser.evaluateAnswerConditionsOld(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[2].data);
        })
        it('Should return success when match - 2', () =>{
            let answer = ["Content"];
            let returnObj = ConfigParser.evaluateAnswerConditionsOld(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[1].data);
        })
        it('Should return partial failure when no match', () =>{
            let answer = ["Secret"];
            let returnObj = ConfigParser.evaluateAnswerConditionsOld(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
            expect(returnObj.successData).to.equal(DevConfig.NO_RESPONSE_STRING);
        })
        it('Should return partial failure when answer doesnt exist', () =>{
            let answer = ["Peepee"];
            let returnObj = ConfigParser.evaluateAnswerConditionsOld(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
            expect(returnObj.successData).to.equal(DevConfig.NO_RESPONSE_STRING);
        })
    })
    describe('Multiple choice ', function () {
        it('Should return correct option when whole match', () =>{
            let answer = ["Frustrated", "Sad"];
            let returnObj = ConfigParser.evaluateAnswerConditionsOld(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[0].data);
        })
        it('Should return outweighing match when multiple rules match ', () =>{
            let answer = ["Frustrated", "Sad", "Happy"];
            let returnObj = ConfigParser.evaluateAnswerConditionsOld(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[0].data);
        })
        it('Should return first success when even match of even resolution', () =>{
            let answer = ["Frustrated", "Happy"];
            let returnObj = ConfigParser.evaluateAnswerConditionsOld(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[0].data);
        })
        it('Should return correct option when whole match - 2', () =>{
            let answer = ["Content", "Excited"];
            let returnObj = ConfigParser.evaluateAnswerConditionsOld(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[1].data);
        })
        it('Should return outweighing match when multiple rules match - 2', () =>{
            let answer = ["Content", "Excited", "Stressed"];
            let returnObj = ConfigParser.evaluateAnswerConditionsOld(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[1].data);
        })
        it('Should return narrower match when two rules overlap', () =>{
            let answer = ["Sad", "Discontent"];
            let returnObj = ConfigParser.evaluateAnswerConditionsOld(replyRules,options,answer);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[2].data);
        })
    });
    describe('Failures', () => {
        it('Should fail when rule list not list', () => {
            let returnObj = ConfigParser.evaluateAnswerConditionsOld("test", options, ["Sad"]);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when options not list', () => {
            let returnObj = ConfigParser.evaluateAnswerConditionsOld(replyRules, "options", ["Sad"]);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when answer not list', () => {
            let returnObj = ConfigParser.evaluateAnswerConditionsOld(replyRules, options, "Sad");
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when reply rules missing option indices', () => {
            let newRules = JSON.parse(JSON.stringify(replyRules));
            delete newRules[0]['optionIndices'];
            let returnObj = ConfigParser.evaluateAnswerConditionsOld(newRules, options, ["Sad"]);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when reply rules option indices not array', () => {
            let newRules = JSON.parse(JSON.stringify(replyRules));
            newRules[0]['optionIndices'] = "string";
            let returnObj = ConfigParser.evaluateAnswerConditionsOld(newRules, options, ["Sad"]);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
    })
})

describe('Evaluating conditions', () => {
    afterEach( () => {
        expect(testConfig).to.eql(testConfigOrig);
        expect(testConfigConds).to.eql(testConfigCondsOrig)
    })
    const options = ["Sad", "Frustrated", "Discontent", "Stressed","Content", "Happy", "Proud", "Excited", "Secret"];

    const participant = {
        uniqueId : "124",
        parameters : {
            language : "English",
            isSmoker : true
        },
        firstName : "John",
        currentAnswer : [],
        currentQuestion : {
            options : options
        },
        stages : {
            activity : [],
            stageName : "Test",
            stageDay : 0
        },
        conditionName : "Test"
    }
    describe('If-else', () => {
        const replyRules = [
            {
                if: "${CURRENT_ANSWER} HAS_CHOICE_IDX $N*{0,1,2,3}",
                then: ["Sorry to hear! :("],
                else : ["Good to know!"]
            },
            {
                if: "${CURRENT_ANSWER} HAS_CHOICE_IDX $N*{4,5}",
                then: ["Third option! :)"]
            },
            {
                if: "${CURRENT_ANSWER} HAS_CHOICE_IDX $N*{0,1,2,3}",
                then: ["Fourth option! :("]
            }
        ]
        it('Should return success when match', () =>{
            let answer = ["Frustrated"];
            participant.currentAnswer = answer;
            let returnObj = ConfigParser.evaluateAnswerConditions(participant, replyRules);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[0].then);
        })
        it('Should return success when multiple match first', () =>{
            let answer = ["Frustrated", "Sad", "Happy", "Proud", "Excited"];
            participant.currentAnswer = answer;
            let returnObj = ConfigParser.evaluateAnswerConditions(participant, replyRules);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[0].then);
        })
        it('Should return else when not match', () =>{
            let answer = ["Happy"];
            participant.currentAnswer = answer;
            let returnObj = ConfigParser.evaluateAnswerConditions(participant, replyRules);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[0].else);
        })
        it('Should return else when answer dont exist', () =>{
            let answer = ["Peepoo"];
            participant.currentAnswer = answer;
            let returnObj = ConfigParser.evaluateAnswerConditions(participant, replyRules);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[0].else);
        })
        it('Should skip then if not valid', () =>{
            let answer = ["Frustrated"];
            participant.currentAnswer = answer;
            let rulesCopy = JSON.parse(JSON.stringify(replyRules));
            rulesCopy[0]["then"] = undefined;
            let returnObj = ConfigParser.evaluateAnswerConditions(participant, rulesCopy);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[2].then);
        })
        it('Should skip else if not valid', () =>{
            let answer = ["Happy"];
            participant.currentAnswer = answer;
            let rulesCopy = JSON.parse(JSON.stringify(replyRules));
            rulesCopy[0]["else"] = undefined;
            let returnObj = ConfigParser.evaluateAnswerConditions(participant, rulesCopy);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[1].then);
        })


    })
    describe('If without else', () => {
        const replyRules = [
            {
                if: "${CURRENT_ANSWER} HAS_CHOICE_IDX $N*{0,1,2,3}",
                then: ["Sorry to hear! :("]
            },
            {
                if: "${CURRENT_ANSWER} HAS_CHOICE_IDX $N*{4,5,6,7}",
                then: ["Third option! :)"]
            }
        ]
        it('Should return success when match', () =>{
            let answer = ["Frustrated"];
            participant.currentAnswer = answer;
            let returnObj = ConfigParser.evaluateAnswerConditions(participant, replyRules);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[0].then);
        })
        it('Should return success when multiple match first', () =>{
            let answer = ["Frustrated", "Sad", "Happy", "Proud", "Excited"];
            participant.currentAnswer = answer;
            let returnObj = ConfigParser.evaluateAnswerConditions(participant, replyRules);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[0].then);
        })
        it('Should success on second condition when match', () =>{
            let answer = ["Happy"];
            participant.currentAnswer = answer;
            let returnObj = ConfigParser.evaluateAnswerConditions(participant, replyRules);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(replyRules[1].then);
        })
        it('Should return partial failure when no match', () =>{
            let answer = ["Secret"];
            participant.currentAnswer = answer;
            let returnObj = ConfigParser.evaluateAnswerConditions(participant, replyRules);
            expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
            expect(returnObj.successData).to.eql(DevConfig.NO_RESPONSE_STRING);
        })
        it('Should return partial failure when answer dont exist', () =>{
            let answer = ["Peepoo"];
            participant.currentAnswer = answer;
            let returnObj = ConfigParser.evaluateAnswerConditions(participant, replyRules);
            expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
            expect(returnObj.successData).to.eql(DevConfig.NO_RESPONSE_STRING);
        })


    })
    describe('Failures', () => {
        const replyRules = [
            {
                if: "${CURRENT_ANSWER} HAS_CHOICE_IDX $N*{0,1,2,3}",
                then: ["Sorry to hear! :("]
            },
            {
                if: "${CURRENT_ANSWER} HAS_CHOICE_IDX $N*{4,5,6,7}",
                then: ["Third option! :)"]
            }
        ]
        it('Should fail if rule list is not array', () =>{
            let answer = ["Frustrated"];
            participant.currentAnswer = answer;
            let returnObj = ConfigParser.evaluateAnswerConditions(participant, "replyRules");
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if participant undefined', () =>{
            let answer = ["Frustrated"];
            participant.currentAnswer = answer;
            let returnObj = ConfigParser.evaluateAnswerConditions("participant", replyRules);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if participant currentAnswer missing with var reference to CURRENT_ANSWER', () =>{
            let answer = ["Frustrated"];
            participant.currentAnswer = answer;
            let copyPart = JSON.parse(JSON.stringify(participant));
            delete copyPart["currentAnswer"];
            let returnObj = ConfigParser.evaluateAnswerConditions(copyPart, replyRules);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if participant currentQuestion missing with HAS_CHOICE_IDX', () =>{
            let answer = ["Frustrated"];
            participant.currentAnswer = answer;
            let copyPart = JSON.parse(JSON.stringify(participant));
            delete copyPart["currentQuestion"];
            let returnObj = ConfigParser.evaluateAnswerConditions(copyPart, replyRules);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if rule list missing a then', () =>{
            let answer = ["Frustrated"];
            participant.currentAnswer = answer;
            let copyRules = JSON.parse(JSON.stringify(replyRules));
            delete copyRules[0]["then"];
            let returnObj = ConfigParser.evaluateAnswerConditions(participant, copyRules);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if rule list missing an if', () =>{
            let answer = ["Frustrated"];
            participant.currentAnswer = answer;
            let copyRules = JSON.parse(JSON.stringify(replyRules));
            delete copyRules[0]["if"];
            let returnObj = ConfigParser.evaluateAnswerConditions(participant, copyRules);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if rule list if not string', () =>{
            let answer = ["Frustrated"];
            participant.currentAnswer = answer;
            let copyRules = JSON.parse(JSON.stringify(replyRules));
            copyRules[0]["if"] = 25;
            let returnObj = ConfigParser.evaluateAnswerConditions(participant, copyRules);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if expression syntactically incorrect', () =>{
            let answer = ["Frustrated"];
            participant.currentAnswer = answer;
            let copyRules = JSON.parse(JSON.stringify(replyRules));
            copyRules[0]["if"] = "${Participant AND ${isSmoker}";
            let returnObj = ConfigParser.evaluateAnswerConditions(participant, copyRules);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail if expression not valid', () =>{
            let answer = ["Frustrated"];
            participant.currentAnswer = answer;
            let copyRules = JSON.parse(JSON.stringify(replyRules));
            copyRules[0]["if"] = "${Participant} AND ${isSmoker}";
            let returnObj = ConfigParser.evaluateAnswerConditions(participant, copyRules);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })

    })
})
describe('Parse simple expression', () => {
    afterEach( () => {
        expect(testConfig).to.eql(testConfigOrig);
        expect(testConfigConds).to.eql(testConfigCondsOrig)
    })
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
    it('Should fail if brackets mismatched', () => {
        let expression = "${Parameter} GREATER_THAN $N{10})"
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
    afterEach( () => {
        expect(testConfig).to.eql(testConfigOrig);
        expect(testConfigConds).to.eql(testConfigCondsOrig)
    })
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
    afterEach( () => {
        expect(testConfig).to.eql(testConfigOrig);
        expect(testConfigConds).to.eql(testConfigCondsOrig)
    })
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
    describe('Boolean', () => {
        it('Should return true (case insensitive)', () => {
            let testStr = "tRuE";
            let expectedVal = true;
            let returnObj = ConfigParser.getBooleanFromString(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return false (case insensitive)', () => {
            let testStr = "FalSe";
            let expectedVal = false;
            let returnObj = ConfigParser.getBooleanFromString(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should fail when not either true or false', () => {
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
    describe('Parse Boolean Token', () => {
        it('Should return true (case insensitive)', () => {
            let testStr = "$B{tRuE}";
            let expectedVal = true;
            let returnObj = ConfigParser.parseBooleanToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return false (case insensitive)', () => {
            let testStr = "$B{FalSe}";
            let expectedVal = false;
            let returnObj = ConfigParser.parseBooleanToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should fail when not either true or false', () => {
            let testStr = "$B{afd}";
            let returnObj = ConfigParser.parseBooleanToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when not string', () => {
            let testStr = 123;
            let returnObj = ConfigParser.parseBooleanToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when string doesnt start with $B{ ', () => {
            let testStr = "${true}";
            let returnObj = ConfigParser.parseBooleanToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when string doesnt end with } ', () => {
            let testStr = "$B{true";
            let returnObj = ConfigParser.parseBooleanToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
    })

    describe('Parse String Token', () => {
        it('Should return string', () => {
            let testStr = "$S{tRuE}";
            let expectedVal = "tRuE";
            let returnObj = ConfigParser.parseStringToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return empty string', () => {
            let testStr = "$S{}";
            let expectedVal = "";
            let returnObj = ConfigParser.parseStringToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should string with quotes', () => {
            let testStr = "$S{\"hello\"}";
            let expectedVal = "\"hello\"";
            let returnObj = ConfigParser.parseStringToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should fail when not string', () => {
            let testStr = 123;
            let returnObj = ConfigParser.parseStringToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when string doesnt start with $S{ ', () => {
            let testStr = "${true}";
            let returnObj = ConfigParser.parseStringToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when string doesnt end with } ', () => {
            let testStr = "$S{true";
            let returnObj = ConfigParser.parseStringToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
    })
    describe('Parse String Array Token', () => {
        it('Should return string array of size 1', () => {
            let testStr = "$S*{tRuE}";
            let expectedVal = ["tRuE"];
            let returnObj = ConfigParser.parseStrArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return string array of size 2', () => {
            let testStr = "$S*{tRuE,FaLsE}";
            let expectedVal = ["tRuE","FaLsE"];
            let returnObj = ConfigParser.parseStrArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return string array of size 3 with empty string in between', () => {
            let testStr = "$S*{tRuE,,FaLsE}";
            let expectedVal = ["tRuE","","FaLsE"];
            let returnObj = ConfigParser.parseStrArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return string array of size 3 with empty string in beginning', () => {
            let testStr = "$S*{,tRuE,FaLsE}";
            let expectedVal = ["","tRuE","FaLsE"];
            let returnObj = ConfigParser.parseStrArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return string array of size 3 with empty string at end', () => {
            let testStr = "$S*{tRuE,FaLsE,}";
            let expectedVal = ["tRuE","FaLsE",""];
            let returnObj = ConfigParser.parseStrArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return string array of size 2 with both empty strings', () => {
            let testStr = "$S*{,}";
            let expectedVal = ["",""];
            let returnObj = ConfigParser.parseStrArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return empty string array', () => {
            let testStr = "$S*{}";
            let expectedVal = [];
            let returnObj = ConfigParser.parseStrArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should string array with quotes', () => {
            let testStr = "$S*{\"hello\",beans}";
            let expectedVal = ["\"hello\"", "beans"];
            let returnObj = ConfigParser.parseStrArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should fail when not string', () => {
            let testStr = 123;
            let returnObj = ConfigParser.parseStrArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when string doesnt start with $S*{ ', () => {
            let testStr = "$S{true}";
            let returnObj = ConfigParser.parseStrArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when string doesnt end with } ', () => {
            let testStr = "$S*{true";
            let returnObj = ConfigParser.parseStrArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
    })
    describe('Parse Number Array Token', () => {
        it('Should return number array of size 1', () => {
            let testStr = "$N*{1}";
            let expectedVal = [1];
            let returnObj = ConfigParser.parseNumArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return number array of size 2', () => {
            let testStr = "$N*{1,2}";
            let expectedVal = [1,2];
            let returnObj = ConfigParser.parseNumArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return number array with negative numbers', () => {
            let testStr = "$N*{-1,2}";
            let expectedVal = [-1,2];
            let returnObj = ConfigParser.parseNumArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return number array with float', () => {
            let testStr = "$N*{1.3462,2}";
            let expectedVal = [1.3462,2];
            let returnObj = ConfigParser.parseNumArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return number array with zero', () => {
            let testStr = "$N*{0,2}";
            let expectedVal = [0,2];
            let returnObj = ConfigParser.parseNumArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })

        it('Should return empty number array', () => {
            let testStr = "$N*{}";
            let expectedVal = [];
            let returnObj = ConfigParser.parseNumArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should fail with empty string in between', () => {
            let testStr = "$N*{1,,2}";
            let returnObj = ConfigParser.parseNumArrToken(testStr);
            console.log(returnObj)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);


        })
        it('Should fail when not string', () => {
            let testStr = 123;
            let returnObj = ConfigParser.parseNumArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when string doesnt start with $N*{ ', () => {
            let testStr = "$N{1}";
            let returnObj = ConfigParser.parseNumArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when string doesnt end with } ', () => {
            let testStr = "$N*{1";
            let returnObj = ConfigParser.parseNumArrToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
    })
    describe('Parse Number Token', () => {
        it('Should return integer', () => {
            let testStr = "$N{12}";
            let expectedVal = 12;
            let returnObj = ConfigParser.parseNumberToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return zero', () => {
            let testStr = "$N{0}";
            let expectedVal = 0;
            let returnObj = ConfigParser.parseNumberToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return negative', () => {
            let testStr = "$N{-19}";
            let expectedVal = -19;
            let returnObj = ConfigParser.parseNumberToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should return float', () => {
            let testStr = "$N{13.55}";
            let expectedVal = 13.55;
            let returnObj = ConfigParser.parseNumberToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.eql(expectedVal)

        })
        it('Should fail when not number', () => {
            let testStr = "$N{afd}";
            let returnObj = ConfigParser.parseNumberToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when not string', () => {
            let testStr = 123;
            let returnObj = ConfigParser.parseNumberToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when string doesnt start with $N{ ', () => {
            let testStr = "${23}";
            let returnObj = ConfigParser.parseNumberToken(testStr);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

        })
        it('Should fail when string doesnt end with } ', () => {
            let testStr = "$N{23";
            let returnObj = ConfigParser.parseNumberToken(testStr);
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
describe('Construct expression object', () => {
    const part = {
        uniqueId : "12345",
        firstName : "John",
        currentAnswer : ["answer", "answer2"],
        parameters : {
            language : "English",
            isSmoker : true
        },
        stages : {
            activity : [],
            stageDay : 0,
            stageName : "Test"
        },
        conditionName : "Test"
    }
    afterEach( () => {
        expect(testConfig).to.eql(testConfigOrig);
        expect(testConfigConds).to.eql(testConfigCondsOrig)
    })
    it('Should parse parameter and number operands normally', () => {
        let expression = "${UNIQUE_ID} >= $N{34565}"
        let expectedObj = {
            operand1: {
                value : "12345",
                type : DevConfig.OPERAND_TYPES.STRING
            },
            operator : ">=",
            operand2 : {
                value : 34565,
                type : DevConfig.OPERAND_TYPES.NUMBER
            }
        }
        let returnObj = ConfigParser.constructExpressionObject(part, expression);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.eql(expectedObj);
    })
    it('Should fail if variable doesnt exist', () => {
        let expression = "${Parameter} >= $N{10}"
        let returnObj = ConfigParser.constructExpressionObject(part, expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if number is not a number', () => {
        let expression = "${UNIQUE_ID} >= $N{test}"
        let returnObj = ConfigParser.constructExpressionObject(part, expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if expression not valid', () => {
        let expression = "${UNIQUE_ID} $N{10}"
        let returnObj = ConfigParser.constructExpressionObject(part, expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if operator not valid', () => {
        let expression = "${UNIQUE_ID} GREATER_THAN $N{10}"
        let returnObj = ConfigParser.constructExpressionObject(part, expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })

    it('Should parse string and number array operands normally', () => {
        let expression = "$S{John} HAS_CHOICE_IDX $N*{1,3,4}"
        let expectedObj = {
            operand1: {
                value : "John",
                type : DevConfig.OPERAND_TYPES.STRING
            },
            operator : "HAS_CHOICE_IDX",
            operand2 : {
                value : [1,3,4],
                type : DevConfig.OPERAND_TYPES.NUMBER_ARRAY
            }
        }
        let returnObj = ConfigParser.constructExpressionObject(part, expression);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.eql(expectedObj);
    })
    it('Should parse string and float array operands normally', () => {
        let expression = "$S{John} HAS_CHOICE_IDX $N*{1.3,3.2,4}"
        let expectedObj = {
            operand1: {
                value : "John",
                type : DevConfig.OPERAND_TYPES.STRING
            },
            operator : "HAS_CHOICE_IDX",
            operand2 : {
                value : [1.3,3.2,4],
                type : DevConfig.OPERAND_TYPES.NUMBER_ARRAY
            }
        }
        let returnObj = ConfigParser.constructExpressionObject(part, expression);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.eql(expectedObj);
    })
    it('Should fail if string token braces not opened', () => {
        let expression = "$Shelp} AND $N{10}"
        let returnObj = ConfigParser.constructExpressionObject(part, expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if number array not valid', () => {
        let expression = "$S{help} AND $N*{10,not}"
        let returnObj = ConfigParser.constructExpressionObject(part, expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })

    it('Should parse boolean and string array operands normally', () => {
        let expression = "$B{TRUE} IN_ARRAY $S*{fee,fi,fo,fum}"
        let expectedObj = {
            operand1: {
                value : true,
                type : DevConfig.OPERAND_TYPES.BOOLEAN
            },
            operator : "IN_ARRAY",
            operand2 : {
                value : ["fee","fi","fo","fum"],
                type : DevConfig.OPERAND_TYPES.STRING_ARRAY
            }
        }
        let returnObj = ConfigParser.constructExpressionObject(part, expression);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.eql(expectedObj);
    })
    it('Should parse boolean and string array operands normally - empty string', () => {
        let expression = "$B{FALSE} IN_ARRAY $S*{fee,,,}"
        let expectedObj = {
            operand1: {
                value : false,
                type : DevConfig.OPERAND_TYPES.BOOLEAN
            },
            operator : "IN_ARRAY",
            operand2 : {
                value : ["fee","","",""],
                type : DevConfig.OPERAND_TYPES.STRING_ARRAY
            }
        }
        let returnObj = ConfigParser.constructExpressionObject(part, expression);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.eql(expectedObj);
    })
    it('Should fail if boolean token braces not opened', () => {
        let expression = "$BTRUE} AND $S*{fee,fi,fo,fum}"
        let returnObj = ConfigParser.constructExpressionObject(part, expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if boolean token not true or false', () => {
        let expression = "$B{beans} AND $S*{fee,fi,fo,fum}"
        let returnObj = ConfigParser.constructExpressionObject(part, expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })

    it('Should parse expression operands normally', () => {
        let expression = "(${UNIQUE_ID} == $B{TRUE}) AND (${language} == $S{English})"
        let expectedObj = {
            operand1: {
                value : {
                    operand1 : {
                        value : part.uniqueId,
                        type : DevConfig.OPERAND_TYPES.STRING
                    },
                    operator: "==",
                    operand2 : {
                        value : true,
                        type : DevConfig.OPERAND_TYPES.BOOLEAN
                    }
                },
                type : DevConfig.OPERAND_TYPES.EXPRESSION
            },
            operator : "AND",
            operand2 : {
                value : {
                    operand1 : {
                        value : part.parameters.language,
                        type : DevConfig.OPERAND_TYPES.STRING
                    },
                    operator: "==",
                    operand2 : {
                        value : "English",
                        type : DevConfig.OPERAND_TYPES.STRING
                    }
                },
                type : DevConfig.OPERAND_TYPES.EXPRESSION
            }
        }
        let returnObj = ConfigParser.constructExpressionObject(part, expression);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.eql(expectedObj);
    })
    it('Should parse multiple nested expressions operands normally with enclosing brackets', () => {
        let expression = "(((${UNIQUE_ID} == $B{TRUE}) AND (${language} == $S{English})) OR ${isSmoker})"
        let expectedObj = {
            operand1: {
                value : {
                    operand1 : {
                        value : {
                            operand1 : {
                                value : part.uniqueId,
                                type : DevConfig.OPERAND_TYPES.STRING
                            },
                            operator: "==",
                            operand2 : {
                                value : true,
                                type : DevConfig.OPERAND_TYPES.BOOLEAN
                            }
                        },
                        type : DevConfig.OPERAND_TYPES.EXPRESSION
                    },
                    operator: "AND",
                    operand2 : {
                        value : {
                            operand1 : {
                                value : part.parameters.language,
                                type : DevConfig.OPERAND_TYPES.STRING
                            },
                            operator: "==",
                            operand2 : {
                                value : "English",
                                type : DevConfig.OPERAND_TYPES.STRING
                            }
                        },
                        type : DevConfig.OPERAND_TYPES.EXPRESSION
                    }
                },
                type : DevConfig.OPERAND_TYPES.EXPRESSION
            },
            operator : "OR",
            operand2 : {
                value : true,
                type : DevConfig.OPERAND_TYPES.BOOLEAN
            }
        }
        let returnObj = ConfigParser.constructExpressionObject(part, expression);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.eql(expectedObj);
    })

    it('Should fail if expression braces not balanced - extra close', () => {
        let expression = "(${isSmoker} == $B{TRUE})) AND (${language} == $S{English})"
        let returnObj = ConfigParser.constructExpressionObject(part, expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
    it('Should fail if expression braces not balanced - extra open', () => {
        let expression = "((${isSmoker} == $B{TRUE}) AND (${language} == $S{English})"
        let returnObj = ConfigParser.constructExpressionObject(part, expression);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
    })
})
describe('Constructing expressions', () => {
    afterEach( () => {
        expect(testConfig).to.eql(testConfigOrig);
        expect(testConfigConds).to.eql(testConfigCondsOrig)
    })
    describe('Multiple AND conditions', () => {
        let op1 = "A";
        let operator = "=="
        it('Should work for length 1', () => {
            let op2List = ["B"];
            let expResult = "A == B"
            let returnObj = ConfigParser.buildMultipleORCondition(op1, operator, op2List);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expResult);
        })
        it('Should work for length 2', () => {
            let op2List = ["B","C"];
            let expResult = "(A == B) OR (A == C)"
            let returnObj = ConfigParser.buildMultipleORCondition(op1, operator, op2List);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expResult);
        })
        it('Should work for length 3', () => {
            let op2List = ["B","C","D"];
            let expResult = "((A == B) OR (A == C)) OR (A == D)"
            let returnObj = ConfigParser.buildMultipleORCondition(op1, operator, op2List);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data).to.equal(expResult);
        })
        it('Should fail when operator not valid', () => {
            let op2List = ["B","C","D"];
            let returnObj = ConfigParser.buildMultipleORCondition(op1, "NOT", op2List);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when op2 list empty', () => {
            let op2List = [];
            let returnObj = ConfigParser.buildMultipleORCondition(op1, operator, op2List);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
        it('Should fail when op2 list not list', () => {
            let op2List = "string";
            let returnObj = ConfigParser.buildMultipleORCondition(op1, operator, op2List);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data);
        })
    })
})
describe('Get operand type', () => {
    afterEach( () => {
        expect(testConfig).to.eql(testConfigOrig);
        expect(testConfigConds).to.eql(testConfigCondsOrig)
    })
    it('Should return number array', () => {
        let testVal = [1,23];
        let expected = DevConfig.OPERAND_TYPES.NUMBER_ARRAY;
        let retVal = ConfigParser.getOperandType(testVal);
        expect(retVal).to.equal(expected);
    })
    it('Should return number', () => {
        let testVal = 1;
        let expected = DevConfig.OPERAND_TYPES.NUMBER;
        let retVal = ConfigParser.getOperandType(testVal);
        expect(retVal).to.equal(expected);
    })
    it('Should return string array', () => {
        let testVal = ["1","23"];
        let expected = DevConfig.OPERAND_TYPES.STRING_ARRAY;
        let retVal = ConfigParser.getOperandType(testVal);
        expect(retVal).to.equal(expected);
    })
    it('Should return string array when empty array', () => {
        let testVal = [];
        let expected = DevConfig.OPERAND_TYPES.STRING_ARRAY;
        let retVal = ConfigParser.getOperandType(testVal);
        expect(retVal).to.equal(expected);
    })
    it('Should return boolean', () => {
        let testVal = false;
        let expected = DevConfig.OPERAND_TYPES.BOOLEAN;
        let retVal = ConfigParser.getOperandType(testVal);
        expect(retVal).to.equal(expected);
    })
    it('Should return undefined for undefined', () => {
        let testVal = undefined;
        let expected = DevConfig.OPERAND_TYPES.UNDEFINED;
        let retVal = ConfigParser.getOperandType(testVal);
        expect(retVal).to.equal(expected);
    })
    it('Should return undefined for object', () => {
        let testVal = { test: "hello" };
        let expected = DevConfig.OPERAND_TYPES.UNDEFINED;
        let retVal = ConfigParser.getOperandType(testVal);
        expect(retVal).to.equal(expected);
    })

})

describe("Evaluate expression object", () => {
    afterEach( () => {
        expect(testConfig).to.eql(testConfigOrig);
        expect(testConfigConds).to.eql(testConfigCondsOrig)
    })
    const part = {
        uniqueId : "12345",
        firstName : "John",
        currentAnswer : ["yes"],
        currentQuestion : {
            options: ["yes", "no", "maybe"]
        },
        parameters : {
            language : "English",
            isSmoker : true
        },
        stages : {
            activity : [],
            stageName : "Test",
            stageDay : 0
        }
    }
    describe('AND', () => {
        it('Should return true when true', () => {
            let expressionObj = {
                operand1 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                },
                operator : "AND",
                operand2 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            };
            let expectedAnswer = true;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should return false when false', () => {
            let expressionObj = {
                operand1 : {
                    value : false,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                },
                operator : "AND",
                operand2 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            };
            let expectedAnswer = false;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should fail when any operand not boolean', () => {
            let expressionObj = {
                operand1 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : "AND",
                operand2 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            };
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });
        it('Should fail when any operand value undefined', () => {
            let expressionObj = {
                operand1 : {
                    value : undefined,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                },
                operator : "AND",
                operand2 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            };
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });
        it('Should fail when any operand type undefined', () => {
            let expressionObj = {
                operand1 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.UNDEFINED
                },
                operator : "AND",
                operand2 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            };
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });
        it('Should fail when any operand missing', () => {
            let expressionObj = {
                operator : "AND",
                operand2 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            };
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });
        it('Should fail when operator invalid', () => {
            let expressionObj = {
                operand1 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                },
                operator : "NAND",
                operand2 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            };
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });
        it('Should fail when operator missing', () => {
            let expressionObj = {
                operand1 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                },
                operand2 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            };
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });
    })
    describe('OR', () => {
        it('Should return true when true', () => {
            let expressionObj = {
                operand1 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                },
                operator : "OR",
                operand2 : {
                    value : false,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            };
            let expectedAnswer = true;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should return false when false', () => {
            let expressionObj = {
                operand1 : {
                    value : false,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                },
                operator : "OR",
                operand2 : {
                    value : false,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            };
            let expectedAnswer = false;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should fail when any operand not boolean', () => {
            let expressionObj = {
                operand1 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : "OR",
                operand2 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            };
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });
    })
    describe('<', () => {
        it('Should return true when true', () => {
            let expressionObj = {
                operand1 : {
                    value : 12,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : "<",
                operand2 : {
                    value : 14.5,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                }
            };
            let expectedAnswer = true;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should return false when false', () => {
            let expressionObj = {
                operand1 : {
                    value : 14.5,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : "<",
                operand2 : {
                    value : 14.5,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                }
            };
            let expectedAnswer = false;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should fail when any operand not number', () => {
            let expressionObj = {
                operand1 : {
                    value : 123,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : "<",
                operand2 : {
                    value : false,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            };
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });
    })
    describe('>', () => {
        it('Should return true when true', () => {
            let expressionObj = {
                operand1 : {
                    value : 123,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : ">",
                operand2 : {
                    value : 14.5,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                }
            };
            let expectedAnswer = true;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should return false when false', () => {
            let expressionObj = {
                operand1 : {
                    value : 14.5,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : ">",
                operand2 : {
                    value : 14.5,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                }
            };
            let expectedAnswer = false;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should fail when any operand not number', () => {
            let expressionObj = {
                operand1 : {
                    value : 123,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : ">",
                operand2 : {
                    value : false,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            };
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });
    })
    describe('<=', () => {
        it('Should return true when true', () => {
            let expressionObj = {
                operand1 : {
                    value : 14.5,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : "<=",
                operand2 : {
                    value : 14.5,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                }
            };
            let expectedAnswer = true;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should return false when false', () => {
            let expressionObj = {
                operand1 : {
                    value : 14.6,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : "<=",
                operand2 : {
                    value : 14.5,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                }
            };
            let expectedAnswer = false;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should fail when any operand not number', () => {
            let expressionObj = {
                operand1 : {
                    value : 123,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : "<=",
                operand2 : {
                    value : false,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            };
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });
    })
    describe('>=', () => {
        it('Should return true when true', () => {
            let expressionObj = {
                operand1 : {
                    value : 14.5,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : ">=",
                operand2 : {
                    value : 14.5,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                }
            };
            let expectedAnswer = true;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should return false when false', () => {
            let expressionObj = {
                operand1 : {
                    value : 14.4,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : ">=",
                operand2 : {
                    value : 14.5,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                }
            };
            let expectedAnswer = false;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should fail when any operand not number', () => {
            let expressionObj = {
                operand1 : {
                    value : 123,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : ">=",
                operand2 : {
                    value : false,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            };
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });
    })
    describe('==', () => {
        describe('Numbers', () => {
            it('Should return true when true', () => {
                let expressionObj = {
                    operand1 : {
                        value : 14.5,
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    },
                    operator : "==",
                    operand2 : {
                        value : 14.5,
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    }
                };
                let expectedAnswer = true;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
            it('Should return false when false', () => {
                let expressionObj = {
                    operand1 : {
                        value : 14.56,
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    },
                    operator : "==",
                    operand2 : {
                        value : 14.5,
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    }
                };
                let expectedAnswer = false;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
            it('Should fail when operand types dont match', () => {
                let expressionObj = {
                    operand1 : {
                        value : 123,
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    },
                    operator : "==",
                    operand2 : {
                        value : false,
                        type : DevConfig.OPERAND_TYPES.BOOLEAN
                    }
                };
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            });
        })
        describe('Number Arrays', () => {
            it('Should return true when true', () => {
                let expressionObj = {
                    operand1 : {
                        value : [14.5, 23],
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    },
                    operator : "==",
                    operand2 : {
                        value : [14.5, 23],
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    }
                };
                let expectedAnswer = true;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
            it('Should return false when false', () => {
                let expressionObj = {
                    operand1 : {
                        value : [14.56],
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    },
                    operator : "==",
                    operand2 : {
                        value : [14.5, 23],
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    }
                };
                let expectedAnswer = false;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
        })
        describe('Strings', () => {
            it('Should return true when true', () => {
                let expressionObj = {
                    operand1 : {
                        value : "14.5",
                        type : DevConfig.OPERAND_TYPES.STRING
                    },
                    operator : "==",
                    operand2 : {
                        value : "14.5",
                        type : DevConfig.OPERAND_TYPES.STRING
                    }
                };
                let expectedAnswer = true;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
            it('Should return false when false', () => {
                let expressionObj = {
                    operand1 : {
                        value : "14.56",
                        type : DevConfig.OPERAND_TYPES.STRING
                    },
                    operator : "==",
                    operand2 : {
                        value : "14.5",
                        type : DevConfig.OPERAND_TYPES.STRING
                    }
                };
                let expectedAnswer = false;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
        })
        describe('String Arrays', () => {
            it('Should return true when true', () => {
                let expressionObj = {
                    operand1 : {
                        value : ["14.5", "23"],
                        type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                    },
                    operator : "==",
                    operand2 : {
                        value : ["23", "14.5"],
                        type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                    }
                };
                let expectedAnswer = true;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
            it('Should return false when false', () => {
                let expressionObj = {
                    operand1 : {
                        value : ["14.56"],
                        type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                    },
                    operator : "==",
                    operand2 : {
                        value : ["14.5", "12"],
                        type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                    }
                };
                let expectedAnswer = false;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
        })
        describe('Boolean', () => {
            it('Should return true when true', () => {
                let expressionObj = {
                    operand1 : {
                        value : true,
                        type : DevConfig.OPERAND_TYPES.BOOLEAN
                    },
                    operator : "==",
                    operand2 : {
                        value : true,
                        type : DevConfig.OPERAND_TYPES.BOOLEAN
                    }
                };
                let expectedAnswer = true;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
            it('Should return false when false', () => {
                let expressionObj = {
                    operand1 : {
                        value : true,
                        type : DevConfig.OPERAND_TYPES.STRING
                    },
                    operator : "==",
                    operand2 : {
                        value : false,
                        type : DevConfig.OPERAND_TYPES.STRING
                    }
                };
                let expectedAnswer = false;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
        })
    })
    describe('!=', () => {
        describe('Numbers', () => {
            it('Should return false when false', () => {
                let expressionObj = {
                    operand1 : {
                        value : 14.5,
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    },
                    operator : "!=",
                    operand2 : {
                        value : 14.5,
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    }
                };
                let expectedAnswer = false;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
            it('Should return true when true', () => {
                let expressionObj = {
                    operand1 : {
                        value : 14.56,
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    },
                    operator : "!=",
                    operand2 : {
                        value : 14.5,
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    }
                };
                let expectedAnswer = true;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
            it('Should fail when operand types dont match', () => {
                let expressionObj = {
                    operand1 : {
                        value : 123,
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    },
                    operator : "!=",
                    operand2 : {
                        value : false,
                        type : DevConfig.OPERAND_TYPES.BOOLEAN
                    }
                };
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            });
        })
        describe('Number Arrays', () => {
            it('Should return false when false', () => {
                let expressionObj = {
                    operand1 : {
                        value : [14.5, 23],
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    },
                    operator : "!=",
                    operand2 : {
                        value : [14.5, 23],
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    }
                };
                let expectedAnswer = false;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
            it('Should return true when true', () => {
                let expressionObj = {
                    operand1 : {
                        value : [14.56],
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    },
                    operator : "!=",
                    operand2 : {
                        value : [14.5, 23],
                        type : DevConfig.OPERAND_TYPES.NUMBER
                    }
                };
                let expectedAnswer = true;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
        })
        describe('Strings', () => {
            it('Should return false when false', () => {
                let expressionObj = {
                    operand1 : {
                        value : "14.5",
                        type : DevConfig.OPERAND_TYPES.STRING
                    },
                    operator : "!=",
                    operand2 : {
                        value : "14.5",
                        type : DevConfig.OPERAND_TYPES.STRING
                    }
                };
                let expectedAnswer = false;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
            it('Should return true when true', () => {
                let expressionObj = {
                    operand1 : {
                        value : "14.56",
                        type : DevConfig.OPERAND_TYPES.STRING
                    },
                    operator : "!=",
                    operand2 : {
                        value : "14.5",
                        type : DevConfig.OPERAND_TYPES.STRING
                    }
                };
                let expectedAnswer = true;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
        })
        describe('String Arrays', () => {
            it('Should return false when false', () => {
                let expressionObj = {
                    operand1 : {
                        value : ["14.5", "23"],
                        type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                    },
                    operator : "!=",
                    operand2 : {
                        value : ["23", "14.5"],
                        type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                    }
                };
                let expectedAnswer = false;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
            it('Should return true when true', () => {
                let expressionObj = {
                    operand1 : {
                        value : ["14.56"],
                        type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                    },
                    operator : "!=",
                    operand2 : {
                        value : ["14.5", "12"],
                        type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                    }
                };
                let expectedAnswer = true;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
        })
        describe('Boolean', () => {
            it('Should return false when false', () => {
                let expressionObj = {
                    operand1 : {
                        value : true,
                        type : DevConfig.OPERAND_TYPES.BOOLEAN
                    },
                    operator : "!=",
                    operand2 : {
                        value : true,
                        type : DevConfig.OPERAND_TYPES.BOOLEAN
                    }
                };
                let expectedAnswer = false;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
            it('Should return true when true', () => {
                let expressionObj = {
                    operand1 : {
                        value : true,
                        type : DevConfig.OPERAND_TYPES.STRING
                    },
                    operator : "!=",
                    operand2 : {
                        value : false,
                        type : DevConfig.OPERAND_TYPES.STRING
                    }
                };
                let expectedAnswer = true;
                let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data.value).to.equal(expectedAnswer);
                expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
            });
        })
    })
    describe('IN_ARRAY', () => {
        it('Should return true when true - number', () => {
            let expressionObj = {
                operand1 : {
                    value : 3,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : "IN_ARRAY",
                operand2 : {
                    value : [3,4,5],
                    type : DevConfig.OPERAND_TYPES.NUMBER_ARRAY
                }
            };
            let expectedAnswer = true;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should return false when false - number', () => {
            let expressionObj = {
                operand1 : {
                    value : 3,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : "IN_ARRAY",
                operand2 : {
                    value : [4,5],
                    type : DevConfig.OPERAND_TYPES.NUMBER_ARRAY
                }
            };
            let expectedAnswer = false;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should fail when operands dont match', () => {
            let expressionObj = {
                operand1 : {
                    value : "true",
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : "IN_ARRAY",
                operand2 : {
                    value : ["true"],
                    type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                }
            };
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });
        it('Should return true when true - string', () => {
            let expressionObj = {
                operand1 : {
                    value : "3",
                    type : DevConfig.OPERAND_TYPES.STRING
                },
                operator : "IN_ARRAY",
                operand2 : {
                    value : "[3,4,5]",
                    type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                }
            };
            let expectedAnswer = true;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should return false when false - number', () => {
            let expressionObj = {
                operand1 : {
                    value : "3",
                    type : DevConfig.OPERAND_TYPES.STRING
                },
                operator : "IN_ARRAY",
                operand2 : {
                    value : ["4","5"],
                    type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                }
            };
            let expectedAnswer = false;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should fail when operands dont match - 2', () => {
            let expressionObj = {
                operand1 : {
                    value : "true",
                    type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                },
                operator : "IN_ARRAY",
                operand2 : {
                    value : ["true", "False"],
                    type : DevConfig.OPERAND_TYPES.STRING
                }
            };
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });
    })
    describe('MULTIPLE_OF', () => {
        it('Should return true when true', () => {
            let expressionObj = {
                operand1 : {
                    value : 12,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : "MULTIPLE_OF",
                operand2 : {
                    value : 3,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                }
            };
            let expectedAnswer = true;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should return false when false', () => {
            let expressionObj = {
                operand1 : {
                    value : 12,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : "MULTIPLE_OF",
                operand2 : {
                    value : 5,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                }
            };
            let expectedAnswer = false;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should fail when any operand not number', () => {
            let expressionObj = {
                operand1 : {
                    value : 123,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                },
                operator : "MULTIPLE_OF",
                operand2 : {
                    value : false,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            };
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });
    })
    describe('CONTAINS_STRING', () => {
        it('Should return true when true - string', () => {
            let expressionObj = {
                operand1 : {
                    value : "[3,4,5]",
                    type : DevConfig.OPERAND_TYPES.STRING
                },
                operator : "CONTAINS_STRING",
                operand2 : {
                    value : "3,",
                    type : DevConfig.OPERAND_TYPES.STRING
                }
            };
            let expectedAnswer = true;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should return false when false - string', () => {
            let expressionObj = {
                operand1 : {
                    value : "[3,4,5]",
                    type : DevConfig.OPERAND_TYPES.STRING
                },
                operator : "CONTAINS_STRING",
                operand2 : {
                    value : "6,",
                    type : DevConfig.OPERAND_TYPES.STRING
                }
            };
            let expectedAnswer = false;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should return true when true - string arr', () => {
            let expressionObj = {
                operand1 : {
                    value : ["[3,", " 4, 5]"],
                    type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                },
                operator : "CONTAINS_STRING",
                operand2 : {
                    value : "3,",
                    type : DevConfig.OPERAND_TYPES.STRING
                }
            };
            let expectedAnswer = true;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should return false when false - string arr', () => {
            let expressionObj = {
                operand1 : {
                    value : ["[3,", " 4, 5]"],
                    type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                },
                operator : "CONTAINS_STRING",
                operand2 : {
                    value : "6,",
                    type : DevConfig.OPERAND_TYPES.STRING
                }
            };
            let expectedAnswer = false;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should fail when either operand not string', () => {
            let expressionObj = {
                operand1 : {
                    value : "[3,4,5]",
                    type : DevConfig.OPERAND_TYPES.STRING
                },
                operator : "CONTAINS_STRING",
                operand2 : {
                    value : 3,
                    type : DevConfig.OPERAND_TYPES.NUMBER
                }
            };
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });

    })
    describe('HAS_CHOICE_IDX', () => {
        it('Should return true when match found', () => {
            let expressionObj = {
                operand1 : {
                    value : ["yes"],
                    type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                },
                operator : "HAS_CHOICE_IDX",
                operand2 : {
                    value : [0,2],
                    type : DevConfig.OPERAND_TYPES.NUMBER_ARRAY
                }
            };
            let expectedAnswer = true;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should return false when match not found', () => {
            let expressionObj = {
                operand1 : {
                    value : ["no"],
                    type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                },
                operator : "HAS_CHOICE_IDX",
                operand2 : {
                    value : [0,2],
                    type : DevConfig.OPERAND_TYPES.NUMBER_ARRAY
                }
            };
            let expectedAnswer = false;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should return false when answer not in options', () => {
            let expressionObj = {
                operand1 : {
                    value : ["pee"],
                    type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                },
                operator : "HAS_CHOICE_IDX",
                operand2 : {
                    value : [0,2],
                    type : DevConfig.OPERAND_TYPES.NUMBER_ARRAY
                }
            };
            let expectedAnswer = false;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        });
        it('Should fail when first operand not string array', () => {
            let expressionObj = {
                operand1 : {
                    value : "yes",
                    type : DevConfig.OPERAND_TYPES.STRING
                },
                operator : "HAS_CHOICE_IDX",
                operand2 : {
                    value : [0,2],
                    type : DevConfig.OPERAND_TYPES.NUMBER_ARRAY
                }
            };
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });
        it('Should fail when second operand not number array', () => {
            let expressionObj = {
                operand1 : {
                    value : ["yes"],
                    type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                },
                operator : "HAS_CHOICE_IDX",
                operand2 : {
                    value : ["0","2"],
                    type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                }
            };
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });
        it('Should fail when options missing', () => {
            let expressionObj = {
                operand1 : {
                    value : ["yes"],
                    type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                },
                operator : "HAS_CHOICE_IDX",
                operand2 : {
                    value : [0,2],
                    type : DevConfig.OPERAND_TYPES.NUMBER_ARRAY
                }
            };
            let copyPart = JSON.parse(JSON.stringify(part));
            delete copyPart["currentQuestion"];
            let returnObj = ConfigParser.evaluateExpressionObject(copyPart, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });
        it('Should fail when options are invalid', () => {
            let expressionObj = {
                operand1 : {
                    value : ["yes"],
                    type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                },
                operator : "HAS_CHOICE_IDX",
                operand2 : {
                    value : [0,2],
                    type : DevConfig.OPERAND_TYPES.NUMBER_ARRAY
                }
            };
            let copyPart = JSON.parse(JSON.stringify(part));
            copyPart["currentQuestion"]["options"] = "options";
            let returnObj = ConfigParser.evaluateExpressionObject(copyPart, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        });

    })
    describe('Nested objects', () => {
        it('Should evaluate nested object normally - true', () => {
            let expressionObj = {
                operand1: {
                    value : {
                        operand1 : {
                            value : {
                                operand1 : {
                                    value : part.uniqueId,
                                    type : DevConfig.OPERAND_TYPES.STRING
                                },
                                operator: "==",
                                operand2 : {
                                    value : part.uniqueId + "lol",
                                    type : DevConfig.OPERAND_TYPES.STRING
                                }
                            },
                            type : DevConfig.OPERAND_TYPES.EXPRESSION
                        },
                        operator: "OR",
                        operand2 : {
                            value : {
                                operand1 : {
                                    value : part.parameters.language,
                                    type : DevConfig.OPERAND_TYPES.STRING
                                },
                                operator: "==",
                                operand2 : {
                                    value : "English",
                                    type : DevConfig.OPERAND_TYPES.STRING
                                }
                            },
                            type : DevConfig.OPERAND_TYPES.EXPRESSION
                        }
                    },
                    type : DevConfig.OPERAND_TYPES.EXPRESSION
                },
                operator : "AND",
                operand2 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            }
            let expectedAnswer = true;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        })
        it('Should evaluate nested object normally - false', () => {
            let expressionObj = {
                operand1: {
                    value : {
                        operand1 : {
                            value : {
                                operand1 : {
                                    value : part.uniqueId,
                                    type : DevConfig.OPERAND_TYPES.STRING
                                },
                                operator: "==",
                                operand2 : {
                                    value : part.uniqueId + "lol",
                                    type : DevConfig.OPERAND_TYPES.STRING
                                }
                            },
                            type : DevConfig.OPERAND_TYPES.EXPRESSION
                        },
                        operator: "OR",
                        operand2 : {
                            value : {
                                operand1 : {
                                    value : part.parameters.language,
                                    type : DevConfig.OPERAND_TYPES.STRING
                                },
                                operator: "!=",
                                operand2 : {
                                    value : "English",
                                    type : DevConfig.OPERAND_TYPES.STRING
                                }
                            },
                            type : DevConfig.OPERAND_TYPES.EXPRESSION
                        }
                    },
                    type : DevConfig.OPERAND_TYPES.EXPRESSION
                },
                operator : "AND",
                operand2 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            }
            let expectedAnswer = false;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
            expect(returnObj.data.value).to.equal(expectedAnswer);
            expect(returnObj.data.type).to.equal(DevConfig.OPERAND_TYPES.BOOLEAN);
        })
        it('Should fail when wrong operator is used', () => {
            let expressionObj = {
                operand1: {
                    value : {
                        operand1 : {
                            value : {
                                operand1 : {
                                    value : part.uniqueId,
                                    type : DevConfig.OPERAND_TYPES.STRING
                                },
                                operator: "==",
                                operand2 : {
                                    value : part.uniqueId + "lol",
                                    type : DevConfig.OPERAND_TYPES.STRING
                                }
                            },
                            type : DevConfig.OPERAND_TYPES.EXPRESSION
                        },
                        operator: "OR",
                        operand2 : {
                            value : {
                                operand1 : {
                                    value : part.parameters.language,
                                    type : DevConfig.OPERAND_TYPES.STRING
                                },
                                operator: "!=",
                                operand2 : {
                                    value : "English",
                                    type : DevConfig.OPERAND_TYPES.STRING
                                }
                            },
                            type : DevConfig.OPERAND_TYPES.EXPRESSION
                        }
                    },
                    type : DevConfig.OPERAND_TYPES.EXPRESSION
                },
                operator : "CONTAINS_STRING",
                operand2 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            }
            let expectedAnswer = false;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
        it('Should fail when there is failure in one of the nested expressions', () => {
            let expressionObj = {
                operand1: {
                    value : {
                        operand1 : {
                            value : {
                                operand1 : {
                                    value : part.uniqueId,
                                    type : DevConfig.OPERAND_TYPES.STRING
                                },
                                operator: "==",
                                operand2 : {
                                    value : [part.uniqueId + "lol"],
                                    type : DevConfig.OPERAND_TYPES.STRING_ARRAY
                                }
                            },
                            type : DevConfig.OPERAND_TYPES.EXPRESSION
                        },
                        operator: "OR",
                        operand2 : {
                            value : {
                                operand1 : {
                                    value : part.parameters.language,
                                    type : DevConfig.OPERAND_TYPES.STRING
                                },
                                operator: "!=",
                                operand2 : {
                                    value : "English",
                                    type : DevConfig.OPERAND_TYPES.STRING
                                }
                            },
                            type : DevConfig.OPERAND_TYPES.EXPRESSION
                        }
                    },
                    type : DevConfig.OPERAND_TYPES.EXPRESSION
                },
                operator : "AND",
                operand2 : {
                    value : true,
                    type : DevConfig.OPERAND_TYPES.BOOLEAN
                }
            }
            let expectedAnswer = false;
            let returnObj = ConfigParser.evaluateExpressionObject(part, expressionObj);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
        })
    })

})

describe('User prompted questions', () => {
    afterEach( () => {
        expect(testConfig).to.eql(testConfigOrig);
        expect(testConfigConds).to.eql(testConfigCondsOrig)
    })
    const participant = {
        firstName: "John",
        currentAnswer: ["Mon", "Tue", "Wed"],
        uniqueId: "12345",
        parameters : {
            "PID" : "80085",
            "pLength" : undefined,
            "timezone" : "Europe/Berlin",
            "language" : "Deutsch"
        },
        stages : {
            activity : [],
            stageName : "Test",
            stageDay : 0
        },
        currentQuestion : {
            qType : "freeformMulti",
        },
        conditionName : "Test"
    }
    let languages = ["English", "Deutsch"];
    let userPromptedGoodNoStages = [
        {
            "keyword" : {
                "English": "test1",
                "Deutsch": "testeins"
            },
            "description" : {
                "English": "desc1",
                "Deutsch": "beschr1"
            },
            "qId" : "eep"
        },
        {
            "keyword" : {
                "English": "test2",
                "Deutsch": "testzwei"
            },
            "description" : {
                "English": "desc2",
                "Deutsch": "beschr2"
            },
            "qId" : "oop",
            "if" : "${CONDITION} == $S{Test}"
        },
        {
            "keyword" : {
                "English": "test3",
                "Deutsch": "testdrei"
            },
            "description" : {
                "English": "desc3",
                "Deutsch": "beschr3"
            },
            "qId" : "aap",
            "if" : "${CONDITION} != $S{Test}"
        }
    ]
    let userPromptedGoodStages = [
        {
            "keyword" : {
                "English": "test1",
                "Deutsch": "testeins"
            },
            "description" : {
                "English": "desc1",
                "Deutsch": "beschr1"
            },
            "qId" : "eep"
        },
        {
            "keyword" : {
                "English": "test2",
                "Deutsch": "testzwei"
            },
            "description" : {
                "English": "desc2",
                "Deutsch": "beschr2"
            },
            "qId" : "oop",
            "stages" : ["Test", "Fake"]
        },
        {
            "keyword" : {
                "English": "test3",
                "Deutsch": "testdrei"
            },
            "description" : {
                "English": "desc3",
                "Deutsch": "beschr3"
            },
            "qId" : "aap",
            "stages" : ["Fake"]
        }
    ]
    let userPromptedGoodStagesAndConds = [
        {
            "keyword" : {
                "English": "test1",
                "Deutsch": "testeins"
            },
            "description" : {
                "English": "desc1",
                "Deutsch": "beschr1"
            },
            "qId" : "eep",
            "if" : "${CONDITION} != $S{Test}"
        },
        {
            "keyword" : {
                "English": "test2",
                "Deutsch": "testzwei"
            },
            "description" : {
                "English": "desc2",
                "Deutsch": "beschr2"
            },
            "qId" : "oop",
            "stages" : ["Test", "Fake"],
            "if" : "${CONDITION} == $S{Test}"
        },
        {
            "keyword" : {
                "English": "test3",
                "Deutsch": "testdrei"
            },
            "description" : {
                "English": "desc3",
                "Deutsch": "beschr3"
            },
            "qId" : "aap",
            "stages" : ["Fake"]
        }
    ]
    describe('Validate user prompted questions', () => {
        it('Should fail when keyword missing', () => {
            let copyPrompts = JSON.parse(JSON.stringify(userPromptedGoodNoStages));
            delete copyPrompts[0]["keyword"];
            let returnObj = ConfigParser.validateUserPrompts(copyPrompts, languages);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data)
        })
        it('Should fail when description missing', () => {
            let copyPrompts = JSON.parse(JSON.stringify(userPromptedGoodNoStages));
            delete copyPrompts[0]["description"];
            let returnObj = ConfigParser.validateUserPrompts(copyPrompts, languages);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data)
        })
        it('Should fail when qId missing', () => {
            let copyPrompts = JSON.parse(JSON.stringify(userPromptedGoodNoStages));
            delete copyPrompts[0]["qId"];
            let returnObj = ConfigParser.validateUserPrompts(copyPrompts, languages);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data)
        })
        it('Should fail when qId not string', () => {
            let copyPrompts = JSON.parse(JSON.stringify(userPromptedGoodNoStages));
            copyPrompts[0]["qId"] = 4;
            let returnObj = ConfigParser.validateUserPrompts(copyPrompts, languages);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data)
        })
        it('Should fail when keyword not object', () => {
            let copyPrompts = JSON.parse(JSON.stringify(userPromptedGoodNoStages));
            copyPrompts[0]["keyword"] = 4;
            let returnObj = ConfigParser.validateUserPrompts(copyPrompts, languages);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data)
        })
        it('Should fail when keyword not available in all languages', () => {
            let copyPrompts = JSON.parse(JSON.stringify(userPromptedGoodNoStages));
            delete copyPrompts[0]["keyword"]["Deutsch"];
            let returnObj = ConfigParser.validateUserPrompts(copyPrompts, languages);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data)
        })
        it('Should fail when lang keyword not string', () => {
            let copyPrompts = JSON.parse(JSON.stringify(userPromptedGoodNoStages));
            copyPrompts[0]["keyword"]["Deutsch"] = 4;
            let returnObj = ConfigParser.validateUserPrompts(copyPrompts, languages);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data)
        })

        it('Should fail when if not string', () => {
            let copyPrompts = JSON.parse(JSON.stringify(userPromptedGoodNoStages));
            copyPrompts[1]["if"] = 4;
            let returnObj = ConfigParser.validateUserPrompts(copyPrompts, languages);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data)
        })
        it('Should fail when not array', () => {
            let returnObj = ConfigParser.validateUserPrompts({});
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data)
        })
        it('Should fail when element of array not object', () => {
            let copyPrompts = JSON.parse(JSON.stringify(userPromptedGoodNoStages));
            copyPrompts[1] = ["1", "2", "3"]
            let returnObj = ConfigParser.validateUserPrompts(copyPrompts, languages);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data)
        })
        it('Should fail when element of array empty object', () => {
            let copyPrompts = JSON.parse(JSON.stringify(userPromptedGoodNoStages));
            copyPrompts[1] = {}
            let returnObj = ConfigParser.validateUserPrompts(copyPrompts, languages);
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
            console.log(returnObj.data)
        })
        it('Should succeed', () => {
            let returnObj = ConfigParser.validateUserPrompts(userPromptedGoodNoStages, languages);
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        })


    })
    describe('Filtering available prompts',() => {
        it('Should fail when condition is invalid', () => {
            let copyPrompts = JSON.parse(JSON.stringify(userPromptedGoodNoStages));
            copyPrompts[1]["if"] = "${CONDITION} == Test";
            let returnObj = ConfigParser.filterAvailableUserPrompts(participant, copyPrompts)
            expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE)
            console.log(returnObj.data);
        })
        it('Should successfully filter by condition', () => {
            let returnObj = ConfigParser.filterAvailableUserPrompts(participant, userPromptedGoodNoStages)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE)
            expect(returnObj.data.length).to.equal(2);
            expect(returnObj.data[0].keyword[participant.parameters.language]).to.equal("testeins")
            expect(returnObj.data[1].keyword[participant.parameters.language]).to.equal("testzwei")
        })
        it('Should successfully filter by stages', () => {
            let returnObj = ConfigParser.filterAvailableUserPrompts(participant, userPromptedGoodStages)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE)
            expect(returnObj.data.length).to.equal(2);
            expect(returnObj.data[0].keyword[participant.parameters.language]).to.equal("testeins")
            expect(returnObj.data[1].keyword[participant.parameters.language]).to.equal("testzwei")
        })
        it('Should successfully filter by stages and conditions', () => {
            let returnObj = ConfigParser.filterAvailableUserPrompts(participant, userPromptedGoodStagesAndConds)
            expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE)
            expect(returnObj.data.length).to.equal(1);
            expect(returnObj.data[0].keyword[participant.parameters.language]).to.equal("testzwei")
        })
    })
    describe('Getting question ID', () => {
        describe('Without conditions', () => {
            let copyPart = JSON.parse(JSON.stringify(participant));
            delete copyPart["conditionName"]
            it('Should succeed when keyword found', () => {
                let returnObj = ConfigParser.getUserPromptQID(copyPart, testConfig, "weltraum");
                console.log(returnObj)
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal("chain1.q1")
            })
            it('Should return partial failure when keyword not found', () => {
                let returnObj = ConfigParser.getUserPromptQID(copyPart, testConfig, "spork");
                expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
            })
        })
        describe('With conditions', () => {

            it('Should succeed when keyword found', () => {
                let copyPart = JSON.parse(JSON.stringify(participant));
                copyPart["conditionName"] = "Cond1"
                let returnObj = ConfigParser.getUserPromptQID(copyPart, testConfigConds, "weltraum");
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal("chain1.q1")
            })
            it('Should succeed when keyword found - case insensitive', () => {
                let copyPart = JSON.parse(JSON.stringify(participant));
                copyPart["conditionName"] = "Cond1"
                copyPart["parameters"]["language"] = "English"
                let returnObj = ConfigParser.getUserPromptQID(copyPart, testConfigConds, "sPacE?");
                expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
                expect(returnObj.data).to.equal("chain1.q1")
            })

            it('Should return partial failure when keyword not found', () => {
                let copyPart = JSON.parse(JSON.stringify(participant));
                copyPart["conditionName"] = "Cond1"
                let returnObj = ConfigParser.getUserPromptQID(copyPart, testConfigConds, "spork");
                expect(returnObj.returnCode).to.equal(DevConfig.PARTIAL_FAILURE_CODE);
            })
            it('Should fail when no user prompted questions found', () => {
                let copyPart = JSON.parse(JSON.stringify(participant));
                copyPart["conditionName"] = "Cond2"
                let returnObj = ConfigParser.getUserPromptQID(copyPart, testConfigConds, "weltraum");
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data)
            })
            it('Should fail when condition doesnt exist', () => {
                let copyPart = JSON.parse(JSON.stringify(participant));
                copyPart["conditionName"] = "FailCond"
                let returnObj = ConfigParser.getUserPromptQID(copyPart, testConfigConds, "weltraum");
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data)
            })
            it('Should fail when user prompted questions are not valid', () => {
                let copyPart = JSON.parse(JSON.stringify(participant));
                copyPart["conditionName"] = "FailCond1"
                let returnObj = ConfigParser.getUserPromptQID(copyPart, testConfigConds, "weltraum");
                expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);
                console.log(returnObj.data)
            })
        })
    })
})