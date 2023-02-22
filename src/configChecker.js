
/**
  Method to validate the config class to make sure it has all of the necessary parameters
  to define an experiment
**/

const lodash = require('lodash')
const ConfigReader = require('./configReader');
const ReturnMethods = require('./returnMethods')
const ConfigParser = require('./configParser')
const origConfig = ConfigReader.getExpConfig();
// Use copy of config file for checking
const config = JSON.parse(JSON.stringify(origConfig));
const DevConfig = ConfigReader.getDevConfig();

let fakeParticipantObj = {
  firstName: "test",
  uniqueId: "12345",
  parameters: {...config.customParameters, ...config.mandatoryParameters},
  conditionName: "Test",
  currentAnswer: ["Test"],
  stages: {
    stageName: "Test",
    stageDay: 0
  }
}

let configFileInvalid = false;

let assert = (exp, errorMsg) => {
  if(!exp){
    console.error('\x1b[41m\x1b[37m%s\x1b[0m', 'ERROR: ' + errorMsg);
    process.exit()
  }
}

module.exports.checkConfig = () => {
  // ---------- Required Fields ----------
  let requiredFields = [
      "experimentName", "experimentId",
    "experimentLengthWeeks", "experimentStages", "phrases","mandatoryParameters", "debug", "languages",
    "defaultLanguage", "questionCategories", "instructionText"
  ]

  // Main experiment information
  let fieldTypeChecks = {
    experimentName: (value) => typeof value === "string" && value.length > 0,
    experimentId: (value) => typeof value === "string" && value.length > 0,
    experimentConditions: (value) => Array.isArray(value) && value.length > 0 && value.every(el => typeof el === "string"),
    relConditionSizes: (value) => Array.isArray(value) && value.length > 0 && value.every(el => typeof el === "number"),
    assignmentScheme: (value) => typeof value === "string" && value.length > 0,
    experimentLengthWeeks: (value) => typeof value === "number" && value > 0,
    experimentStages: (value) => typeof value === "object",
    phrases: (value) => typeof value === "object",
    msPerCharacterDelay: (value) => typeof value === "number",
    mandatoryParameters: (value) => typeof value === "object",
    customParameters: (value) => typeof value === "object",
    debug: (value) => typeof value === "object",
    languages: (value) => Array.isArray(value) && value.length > 0 && value.every(el => typeof el === "string"),
    defaultLanguage: (value) => typeof value === "string" && value.length > 0,
    instructionText: (value) => typeof value === "object",
    questionCategories: (value) => typeof value === "object",
    conditionQuestions: (value) => typeof value === "object",
    conditionMapping: (value) => typeof value === "object"
  }

  // Checking if all required fields are present
  for(const fieldName of requiredFields){
    assert(fieldTypeChecks[fieldName](config[fieldName]), "field " + fieldName + ": absent or incorrect format")
  }

  // ---------- Conditions ----------
  if("experimentConditions" in config){
    let configRequiredFields = ["experimentConditions", "relConditionSizes", "assignmentScheme", "conditionQuestions"];

    for(const fieldName of configRequiredFields){
      assert(fieldTypeChecks[fieldName](config[fieldName]), "field " + fieldName + ": absent or incorrect format")
    }

    // Condition sizes equal to num conditions
    assert(config.experimentConditions.length === config.relConditionSizes.length,
        "# of condition assigments does not match # of expt conditions");

    // Assignment scheme valid
    assert(DevConfig.VALID_ASSIGNMENT_SCHEMES.includes(config.assignmentScheme), "assignmentScheme is invalid");

    // Check if condition mapping present when assignment scheme is PID
    if(config.assignmentScheme === "pid"){
      assert(("conditionMapping" in config && fieldTypeChecks["conditionMapping"](config["conditionMapping"])),
          "PID to condition map must be present and in proper format for assignment scheme pid")
      assert(Object.keys(config["conditionMapping"]).every(el => typeof el === "string" && el.length > 0),
          "Condition map keys must be non-empty strings")
      assert(Object.values(config["conditionMapping"]).every(el => typeof el === "number" && el >= 0 && el < config.experimentConditions.length),
          "Condition map values must be index [0 to n-1] of any of n experiment conditions")
    }

  } else {
    config.experimentConditions = []
  }

  // ---------- Debug flags ----------
  let requiredDebugFlags = ["experimenter", "actionMessages", "enableNext", "messageDelay", "developer", "saveDebugInfo"];
  for(const flagName of requiredDebugFlags){
    assert(flagName in config.debug && typeof config.debug[flagName] == "boolean",
        "debug flag \"" + flagName + "\" must be present and boolean")
  }

  // ---------- Languages ----------
  // Check if default language is in languages
  assert(config.languages.includes(config.defaultLanguage), "default language must be present in languages")

  // ---------- Parameters ------------
  // Check if mandatory parameters are present and in proper format
  let mandatoryParameters = {
    "language" : "string",
    "timezone" : "string",
    "PID" : "string"
  }
  for(const [key, value] of Object.entries(mandatoryParameters)){
    assert(config.mandatoryParameters[key] === value,
    "parameter \"" + key + "\" must be present in mandatoryParameters and of type " + value)
  }

  // Ensure all custom parameters have valid data types
  if("customParameters" in config){
    assert(fieldTypeChecks["customParameters"](config.customParameters), "customParameters must be an object")
    for(const [key,value] of Object.entries(config.customParameters)){
      assert(typeof key === "string" && DevConfig.VALID_PARAMETER_TYPES.includes(value),
          "custom parameter \"" + key + "\" must be string and have a valid parameter type")
    }
  } else {
    config.customParameters = {}
  }

  // ---------- Stages ------------
  let validateStagesObj = ConfigParser.validateStages(config.experimentStages, config.experimentConditions)
  assert(validateStagesObj.returnCode === DevConfig.SUCCESS_CODE, validateStagesObj.data)

  let confirmAllLanguages = (langObj) => {
    let intersect = lodash.intersection(Object.keys(langObj), config.languages);
    return intersect.length === config.languages.length;
  }

  // ---------- Phrases ------------

  // Define all the phrases that are required
  let requiredPhrases = {
    answerValidation: [
      'defaultInvalid',
      'invalidOption',
      'noOptions',
      'notANumber',
      'numberTooHigh',
      'numberTooLow',
      'notLongEnoughChars',
      'notLongEnoughWords',
      'answerNotConforming',
      'terminateSurveyProperly'
    ],
    keyboards: [
      'singleChoice',
      'multiChoice',
      'terminateAnswer',
      'finishedChoosingReply',
      'qualtricsFillPrompt',
      'qualtricsDonePrompt',
      'freeformSinglePrompt',
      'freeformMultiPrompt',
      'linkToSurvey',
      'likert5Options',
      'likert7Options'
    ],
    schedule: [
      'scheduleQNotif',
      'scheduleANotif',
      'dayNames',
      'reminderTextLong',
      'reminderTextShort'
    ],
    experiment: [
      'endExperiment',
      'reportFeedback',
      'reportFeedbackCancel',
      'experimentContinue',
      'reportFeedbackThanks',
      'repeatFail',
      'cannotHelp',
      'didntUnderstand',
      'cannotInteract',
      'cannotInteractAfterEnd',
      'nothingToCancel',
      'talkStart',
      'talkCancelDescription',
      'talkCancelled',
      'talkKeywordNotRecognized',
      'cannotStartTalk',
      'cannotStartTalkOutstanding'
    ]
  }
  let arrayPhrases = ["likert5Options", "likert7Options", "dayNames"]

  // Ensure that all required phrases are present and in correct format
  for(const [category, list] of Object.entries(requiredPhrases)){
    // Ensure that the category is present
    assert(category in config.phrases, "Phrase category \"" + category + "\" missing!")

    for(const phrase of list){
      // Ensure that the phrase is present
      assert(phrase in config.phrases[category],
          "Phrase \"" + phrase + "\" of category \"" + category + "\" missing!")

      // Ensure that the phrase is translated into all languages
      assert(confirmAllLanguages(config.phrases[category][phrase]),
          "Phrase \"" + phrase + "\" of category \"" + category + "\" must be present in all languages!")

      // Ensure that the phrases are either strings or string arrays
      if(!arrayPhrases.includes(phrase)){
        assert(Object.values(config.phrases[category][phrase]).every(el => typeof el === "string"),
            "Phrase \"" + phrase + "\" of category \"" + category + "\" must have only strings!")
      } else {
        assert(Object.values(config.phrases[category][phrase]).every(el => {
              return Array.isArray(el) && el.every(subel => typeof subel === "string")
            }),
            "Phrase \"" + phrase + "\" of category \"" + category + "\" must have only string arrays!")
      }
    }
  }

  // ---------- Questions ------------

  let validateSentText = (str) => {
    if(str.length > 4096){
      return ReturnMethods.returnFailure("Message text cannot be longer than 4096 characters")
    }
    let replaceVarsObj = ConfigParser.replaceVariablesInString(fakeParticipantObj, str, true)
    if(replaceVarsObj.returnCode === DevConfig.FAILURE_CODE) return replaceVarsObj

    // TODO: Ensure that HTML tags are closed

    return ReturnMethods.returnSuccess(true);
  }

  // Question Object
  let validateQuestionObj = (questionObj, questionCategory, condition) => {

    // Validate question ID
    if(!("qId" in questionObj) || typeof questionObj.qId !== "string"){
      assert(false,"Condition: " + condition + "\nCategory: " + questionCategory +
          "\nField \"qId\" for question in category is either missing or not valid: " + questionObj.qId)
    }

    // Validate question type
    if(!("qType" in questionObj) || !DevConfig.VALID_QUESTION_TYPES.includes(questionObj.qType)){
      assert(false, "Condition: " + condition + "\nCategory: " + questionCategory +
          "\nField \"qType\" of question \"" + questionObj.qId + "\" is either missing or not valid: " + questionObj.qType)
    }

    // Validate text
    if(questionObj.qType !== "dummy"){
      if(!("text" in questionObj)){
        assert(false,"Condition: " + condition + "\nCategory: " + questionCategory +
            "\nField \"text\" is missing for question: " + questionObj.qId)
      }
      if(!confirmAllLanguages(questionObj.text) || !Object.values(questionObj.text).every(el => typeof el === "string")){
        assert(false,"Condition: " + condition + "\nCategory: " + questionCategory +
            "\nField \"text\" must have a string present for all languages: "
            + questionObj.qId)
      }
      for(const [lang, text] of Object.entries(questionObj.text)){
        let validateTextObj = validateSentText(text);
        assert(validateTextObj.returnCode === DevConfig.SUCCESS_CODE,
            "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
            + "\n text for language " + lang + " invalid:\n" + validateTextObj.data)
      }
    }

    // Check for required fields depending on question type
    for(const prop of DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType]["required"]){
      assert(prop in questionObj,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId +
        "\nquestion of qType " + questionObj.qType + " must have property " + prop)
    }

    // Validate all properties of questionObj
    if("minLengthWords" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("minLengthWords"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "Question type " + questionObj.qType + " cannot contain property minLengthWords")
      assert(typeof questionObj.minLengthWords === "number" && questionObj.minLengthWords > 0,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " minLengthWords must be a number greater than 0"
      )
      assert(!("minLengthChars" in questionObj),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " question object cannot contain both minLengthChars and minLengthWords"
      )
    }

    if("minLengthChars" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("minLengthChars"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "Question type " + questionObj.qType + " cannot contain property minLengthChars")
      assert(typeof questionObj.minLengthChars === "number" && questionObj.minLengthChars > 0,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "minLengthChars must be a number greater than 0"
      )
    }

    if("answerShouldBe" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("answerShouldBe"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "Question type " + questionObj.qType + " cannot contain property answerShouldBe")

      assert(questionObj.answerShouldBe.every(el => typeof el === "string"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "answerShouldBe must be an array of strings"
      )
    }

    if("options" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("options"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "Question type " + questionObj.qType + " cannot contain property options")
      assert(confirmAllLanguages(questionObj.options),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "options must be available in all languages"
      )
      let optionArrays = Object.values(questionObj.options);
      assert(optionArrays.every(arr => arr.every(el => typeof el === "string")),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "options must be an array of strings for each language"
      )
    }

    if("buttonLayoutCols" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("buttonLayoutCols"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "Question type " + questionObj.qType + " cannot contain property buttonLayoutCols")
      assert(typeof questionObj.buttonLayoutCols === "number",
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " buttonLayoutCols must be a number"
      )
      assert(questionObj.buttonLayoutCols <= Math.min(...(Object.values(questionObj.options).map(arr => arr.length))),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " buttonLayoutCols cannot be greater than the number of available options"
      )
    }

    if("range" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("range"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " Question type " + questionObj.qType + " cannot contain property range")
      assert(typeof questionObj.range === "object",
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " range must be an object"
      )
      assert("upper" in questionObj.range || "lower" in questionObj.range,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " range must contain an upper bound or lower bound"
      )
      assert(!("upper" in questionObj.range) || typeof questionObj.range.upper === 'number',
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " upper bound of range must be a number"
      )
      assert(!("lower" in questionObj.range) || typeof questionObj.range.lower === 'number',
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " lower bound of range must be a number"
      )
    }

    if("qualtricsLink" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("qualtricsLink"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " Question type " + questionObj.qType + " cannot contain property qualtricsLink")
      assert(typeof questionObj.qualtricsLink === "string",
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " qualtricsLink must be a string"
      )
    }

    if("qualtricsFields" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("qualtricsFields"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " Question type " + questionObj.qType + " cannot contain property qualtricsFields")
      assert(Array.isArray(questionObj.qualtricsFields),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " qualtricsFields must be an array"
      )
      assert(questionObj.qualtricsFields.every(el => typeof el === "object"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " every element of qualtricsFields array must be an object"
      )
      assert(questionObj.qualtricsFields.every(el => {
        return "field" in el && typeof el.field === "string" && !el.field.match(/[&,?]/g)
        &&  "value" in el && typeof el.value === "string" && !el.value.match(/[&,?]/g)
      }),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " every element of qualtricsFields array must have a string \"field\" and string \"value\" " +
          "without invalid characters"
      )

      // If any of the fields has a parameter reference
      questionObj.qualtricsFields.forEach(param => {
        if(param.value.startsWith("${") && param.value.charAt(param.value.length-1) === "}"){
          let variableTypeChecker = ConfigParser.getVariableType(
              fakeParticipantObj.parameters, param.value.substring(2,param.value.length-1), "qualtrics")
          assert(variableTypeChecker.returnCode === DevConfig.SUCCESS_CODE,
              "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
              + " " + param.value + " is not a valid parameter name")
        }
      })
    }

    if("continueStrings" in questionObj){
      assert(DevConfig.VALID_QUESTION_PROPERTIES[questionObj.qType].possible.includes("continueStrings"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " Question type " + questionObj.qType + " cannot contain property continueStrings")
      assert(Array.isArray(questionObj.continueStrings),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " continueStrings must be an array"
      )
      assert(questionObj.continueStrings.every(el => typeof el === "string"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " every element of continueStrings array must be a string"
      )
    }

    if("inputPrompt" in questionObj){
      assert(typeof questionObj.inputPrompt === "object",
          "Condition: " + condition + "\nCategory: " + questionCategory +
          "\nField \"inputPrompt\" must be an object: "
          + questionObj.qId)
      assert(confirmAllLanguages(questionObj.inputPrompt)
          && Object.values(questionObj.inputPrompt).every(el => typeof el === "string"),
          "Condition: " + condition + "\nCategory: " + questionCategory +
            "\nField \"inputPrompt\" must have a string present for all languages: "
            + questionObj.qId)
      for(const [lang, text] of Object.entries(questionObj.inputPrompt)){
        let validateTextObj = validateSentText(text);
        assert(validateTextObj.returnCode === DevConfig.SUCCESS_CODE,
            "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
            + "\n inputPrompt for language " + lang + " invalid:\n" + validateTextObj.data)
      }
    }

    if("reminder" in questionObj){
      assert(typeof questionObj.reminder === "object",
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " reminder must be an object"
      )
      assert("freqMins" in questionObj.reminder && "numRepeats" in questionObj.reminder,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " reminder must contain both freqMins and numRepeats"
      )
      assert(typeof questionObj.reminder.freqMins === 'number' && questionObj.reminder.freqMins > 0,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " freqMins of reminder must be a number greater than 0"
      )
      assert(typeof questionObj.reminder.numRepeats === 'number' && questionObj.reminder.numRepeats > 0,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " numRepeats of reminder must be a number greater than 0"
      )
    }

    if("image" in questionObj){
      assert(typeof questionObj.image === "object",
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " image must be an object"
      )
      assert("sourceType" in questionObj.image && "source" in questionObj.image,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " image must contain both source and sourceType"
      )
      assert(DevConfig.VALID_IMAGE_SOURCE_TYPES.includes(questionObj.image.sourceType),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " sourceType " + questionObj.image.sourceType + " is not valid"
      )
      // Image source can be different for different language, or can be a single source for all languages
      if(typeof questionObj.image.source === "object"){
        assert(confirmAllLanguages(questionObj.image.source) && Object.values(questionObj.image.source).every(el => typeof el === "string"),
            "Condition: " + condition + "\nCategory: " + questionCategory +
            "\nField \"source\" of image must have a string present for all languages: "
            + questionObj.qId)
      } else {
        assert(typeof questionObj.image.source === "string",
            "Condition: " + condition + "\nCategory: " + questionCategory +
            "\nField \"source\" of image must be a string: "
            + questionObj.qId)
      }

    }

    // Next possible steps
    if("selectQFirst" in questionObj){
      assert(typeof questionObj.selectQFirst === "boolean",
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " selectQFirst must be boolean"
      )
    }

    // Validating a single action object
    let validateActionObj = (actionObj, condition, qType) => {
      // Validate action Type
      if(!("aType" in actionObj) || !Object.keys(DevConfig.VALID_ACTIONS_ARGS).includes(actionObj.aType)){
        return ReturnMethods.returnFailure("action type \"" + actionObj.aType + "\" is not valid")
      }

      // Validate arguments
      let requiredArgNum = DevConfig.VALID_ACTIONS_ARGS[actionObj.aType];
      // Args must be present
      if((!("args" in actionObj) && requiredArgNum !== 0)){
        return ReturnMethods.returnFailure("action type \"" + actionObj.aType + "\" must take at least one argument")
      }
      // Args must be an array with the correct number of arguments
      if(requiredArgNum !== 0) {
        if ((!Array.isArray(actionObj.args)
                || requiredArgNum !== -1 && actionObj.args.length !== requiredArgNum)
            || (requiredArgNum === -1 && actionObj.args.length === 0)
        ) {
          let lengthString = requiredArgNum === -1 ? "at least one" : "" + requiredArgNum;
          return ReturnMethods.returnFailure(
              "args for action type \"" + actionObj.aType + "\" must be an array of length " + lengthString)
        }


        // Ensure arguments are of valid type
        let argTypes = DevConfig.ACTION_ARG_TYPES[actionObj.aType];
        if (requiredArgNum === -1) {
          argTypes = [].concat(...Array.from({length: actionObj.args.length}, () => argTypes));
        }
        for (let i = 0; i < argTypes.length; i++) {
          let argType = argTypes[i]
          // Variable
          if (argType.charAt(0) === "_") {
            let validVarTypes = argType.substring(1).split(",");
            if (!validVarTypes.includes(fakeParticipantObj.parameters[actionObj.args[i]])) {
              return ReturnMethods.returnFailure(
                  "arg number " + (i + 1) + " for action type \"" + actionObj.aType +
                  "\" must be name of a valid variable of types " + validVarTypes.join(", "))
            }
          } else if(argType.charAt(0) === "*") {
            // Normal string without token format
            let validVarTypes = argType.substring(1).split(",");
            if (!validVarTypes.includes(typeof actionObj.args[i])) {
              return ReturnMethods.returnFailure(
                  "arg number " + (i + 1) + " for action type \"" + actionObj.aType +
                  "\" must be a non-token constant of types " + validVarTypes.join(", "))
            }

          } else {
            // Constant/token
            let tokenValidateObj;
            if (argType === "boolean") {
              tokenValidateObj = ConfigParser.parseBooleanToken(actionObj.args[i])
            } else if (argType === "number") {
              tokenValidateObj = ConfigParser.parseNumberToken(actionObj.args[i])
            } else if (argType === "string") {
              tokenValidateObj = ConfigParser.parseStringToken(actionObj.args[i])
            }

            // If it's not a token, check if it's referencing the value of a variable
            //  and update the validation object accordingly
            if (tokenValidateObj.returnCode === DevConfig.FAILURE_CODE) {
              // Invalid token format
              if (!(actionObj.args[i].startsWith("${") && actionObj.args[i].charAt(actionObj.args[i].length - 1) === "}")) {
                tokenValidateObj.data += "\ninvalid token or variable reference"
              } else {
                // Check if variable exists
                let variableCheck = ConfigParser.getVariableType(fakeParticipantObj.parameters, qType);
                // Variable does not exist
                if (variableCheck.returnCode === DevConfig.FAILURE_CODE) {
                  tokenValidateObj.data += "\n" + variableCheck.data
                } else {
                  // Variable exists and is of right data type
                  if (tokenValidateObj.data === argType) {
                    tokenValidateObj.returnCode === DevConfig.SUCCESS_CODE
                    tokenValidateObj.data = true
                  } else {
                    // Variable exists and is of wrong data type
                    tokenValidateObj.data = "variable type " + variableCheck.data + " does not match required data type " + argType;
                  }
                }
              }
            }

            if (tokenValidateObj.returnCode === DevConfig.FAILURE_CODE) {
              return ReturnMethods.returnFailure(
                  "arg number " + (i + 1) + " for action type \"" + actionObj.aType +
                  "\" must be a valid constant of type " + argType + "\n" + tokenValidateObj.data)
            }
          }
        }
      }

      // Handle specific actions - ensure that question type matches arg type
      if(actionObj.aType === "startStage"){
        let stageList = typeof condition !== "undefined" ? config.experimentStages[condition] : config.experimentStages;
        if(typeof stageList === "object"){
          // participant not assigned to condition yet, just check if stage exists in any condition
          stageList = Object.values(stageList).flat()
        }
        if(!stageList.map(obj => obj.name).includes(actionObj.args[0])){
          return ReturnMethods.returnFailure(
              "arg number 1 for action type \"" + actionObj.aType +
              "\" must be a valid stage name in the condition " + condition)
        }
      }

      if(actionObj.aType === "saveAnswerTo"){
        let requiredVariableType = ConfigParser.getVariableType(fakeParticipantObj.parameters, DevConfig.VAR_STRINGS.CURRENT_ANSWER, qType);
        let argType = fakeParticipantObj.parameters[actionObj.args[0]];
        if(requiredVariableType.data !== argType){
          return ReturnMethods.returnFailure(
              "arg number 1 for action type \"" + actionObj.aType +
              "\": cannot save answer of qType " + qType + " to variable of type " + argType)
        }
      }

      if(actionObj.aType === "saveOptionIdxTo"){
        let argType = fakeParticipantObj.parameters[actionObj.args[0]];
        if(qType === "singleChoice"){
          if("number" !== argType){
            return ReturnMethods.returnFailure(
                "arg number 1 for action type \"" + actionObj.aType +
                "\": cannot add options of qType " + qType + " to variable of type " + argType)
          }
        } else if(qType === "multiChoice"){
          if("numArr" !== argType){
            return ReturnMethods.returnFailure(
                "arg number " + (i+1) +" for action type \"" + actionObj.aType +
                "\": cannot add options of qType " + qType + " to variable of type " + argType)
          }
        } else {
          return ReturnMethods.returnFailure(
              "action type \"" + actionObj.aType +
              "\": cannot save option Idx for question type " + qType);
        }
      }

      if(actionObj.aType === "addAnswerTo"){
        let saveVariableType = ConfigParser.getVariableType(fakeParticipantObj.parameters, DevConfig.VAR_STRINGS.CURRENT_ANSWER, qType);
        let argType = fakeParticipantObj.parameters[actionObj.args[0]];
        if(["str", "strArr"].includes(saveVariableType.data)){
          if(argType !== "strArr"){
            return ReturnMethods.returnFailure(
                "arg number 1 for action type \"" + actionObj.aType +
                "\": cannot add answer of qType " + qType + " to variable of type " + argType)
          }
        }
        if(["number"].includes(saveVariableType.data)){
          if(argType !== "numArr"){
            return ReturnMethods.returnFailure(
                "arg number 1 for action type \"" + actionObj.aType +
                "\": cannot add answer of qType " + qType + " to variable of type " + argType)
          }
        }
      }

      return ReturnMethods.returnSuccess(true)

    }

    // Validating a list of actions
    let validateActionList = (actionList, questionCategory, condition) => {
      assert(Array.isArray(actionList) && actionList.every(ob => typeof ob === "object"),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + "actionList must be an array of action objects"
      )

      actionList.forEach(actionObj => {
        let actionValidation = validateActionObj(actionObj, condition, questionObj.qType)
        assert(actionValidation.returnCode === DevConfig.SUCCESS_CODE,
            "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
            + "\n" + actionValidation.data)
      })
    }

    // Validating field nextActions
    if("nextActions" in questionObj){
      assert(!("cNextActions" in questionObj),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " question object cannot contain both nextActions and cNextActions"
      )
      validateActionList(questionObj.nextActions, questionCategory, condition);
    }

    // cNextActions

    // nextQuestion
    let validateNextQuestion = (qString, condition) => {
      if(typeof qString !== "string"){
        return ReturnMethods.returnFailure(
            "nextQuestion must be a string")
      }
      let qSplit = qString.split(".")
      if(qSplit.length !== 2){
        return ReturnMethods.returnFailure(
            "nextQuestion must be of the form `category.qId`"
        )
      }
      let questionCatObject;
      if(typeof condition !== "undefined"){
        // Check only the question categories of that condition
        questionCatObject = config.conditionQuestions[condition].questionCategories;
      } else {
        // Check all conditions to see if any of them have the question category
        questionCatObject = config.questionCategories
        if("conditionQuestions" in config){
          for(const [condition, condObj] of Object.entries(config.conditionQuestions)){
            questionCatObject = {...questionCatObject, ...condObj.questionCategories}
          }
        }
      }

      if(!(qSplit[0] in questionCatObject)){
        return ReturnMethods.returnFailure(
            "question category " + qSplit[0]+ " not present for condition " + condition
        )
      }
      if(!questionCatObject[qSplit[0]].some(qObj => qObj.qId === qSplit[1])){
        return ReturnMethods.returnFailure(
            "qId " + qSplit[1] + " does not exist in category " + qSplit[0]+ " for condition " + condition
        )
      }
      return ReturnMethods.returnSuccess(true)
    }
    if("nextQuestion" in questionObj){
      assert(!("cNextQuestions" in questionObj),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " question object cannot contain both nextQuestion and cNextQuestions"
      )
      let nextQVal = validateNextQuestion(questionObj.nextQuestion, condition);
      assert(nextQVal.returnCode === DevConfig.SUCCESS_CODE,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " nextQuestion is invalid\n" + nextQVal.data)
    }

    // cNextQuestions

    // replyMessages

    // cReplyMessages

  }

  // Ensure condition-independent setup questions are present
  assert("setupQuestions" in config.questionCategories, "setupQuestions required in main questionCategories object")

  // Check all question objects of default question categories
  for(const [defaultCat, qList] of Object.entries(config.questionCategories)){
    assert(Array.isArray(qList), "question category " + defaultCat + " must be an array")
  }
  assert(config.questionCategories.setupQuestions.filter(qObj => "start" in qObj && qObj.start).length === 1,
      "exactly one of the questions in setupQuestions has to have boolean property \"start\" set to true");
  for(const [defaultCat, qList] of Object.entries(config.questionCategories)){
    qList.forEach(questionObj => {
      validateQuestionObj(questionObj, defaultCat, undefined)
    })
  }

  // TODO: scheduled questions
  // TODO: user prompted questions

  // Ensure there are questions for each condition
  config.experimentConditions.forEach(condition => {
    assert(condition in config.conditionQuestions,
        "questions for condition \"" + condition + "\" not present in question categories")
  })

  // Test the question objects for each question category
  for(const [condition, condObj] of Object.entries(config.conditionQuestions)){
    assert("questionCategories" in condObj,
        "condition " + condition + " missing question categories in conditionQuestions")
    assert(typeof condObj.questionCategories === "object",
        "questionCategories of condition " + condition + " must be an object")
  }
  for(const [condition, condObj] of Object.entries(config.conditionQuestions)){
    for(const [catName, qList] of Object.entries(condObj.questionCategories)){
      assert(Array.isArray(qList),
          "question category " + catName + " of condition " + condition + "  must be an array")
      qList.forEach(questionObj => {
        validateQuestionObj(questionObj, catName, condition)
      })
    }
  }

  // : Check whether scheduled questions have necessary components

  console.log('\x1b[42m\x1b[30m%s\x1b[0m', 'Config file valid');

}

module.exports.checkConfig()