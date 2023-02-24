
/**
  File to validate the experimenter configuration to check whether all of the fields are present
 and in the correct format, and provide warning about what is wrong/missing
**/

const lodash = require('lodash')
const emoji = require('node-emoji')
const ConfigReader = require('./configReader');
const ReturnMethods = require('./returnMethods')
const ConfigParser = require('./configParser')
const origConfig = ConfigReader.getExpConfig();
// Use copy of config file for checking
const config = JSON.parse(JSON.stringify(origConfig));
const DevConfig = ConfigReader.getDevConfig();

let testValues = {
  "number": 24,
  "string": "Europe/Berlin",
  "boolean": false,
  "strArr":["Declaration", "of", "independence"],
  "numArr":[8,6,7,5,3,0,9]
}

let parameterTypes = {...config.customParameters, ...config.mandatoryParameters}
let testParameters = {}
for(const [param, type] of Object.entries(parameterTypes)){
  testParameters[param] = testValues[type]
}

let fakeParticipantObj = {
  firstName: "testName",
  uniqueId: "12345",
  parameterTypes: parameterTypes,
  parameters: testParameters,
  conditionName: "TestCondition",
  currentAnswer: ["4"],
  stages: {
    stageName: "Test",
    stageDay: 0
  },
  currentQuestion: {
    qId: "test",
    qType: "freeform",
    options: ["a", "b"]
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

  // Function to validate the contents of text that is to be sent to the
  //  user to ensure that it adheres to formatting syntax
  let validateSentText = (str) => {
    if(str.length > 4096){
      return ReturnMethods.returnFailure("Message text cannot be longer than 4096 characters")
    }
    let replaceVarsObj = ConfigParser.replaceVariablesInString(fakeParticipantObj, str, true)
    if(replaceVarsObj.returnCode === DevConfig.FAILURE_CODE) return replaceVarsObj

    let extractedHTMLTags = str.match(/<\/*[^<>]*>/g);
    if(extractedHTMLTags){
      let openTagStack = [];
      // Match open and close tags
      for(const tag of extractedHTMLTags){
        let tagText = tag.replace(/[<>]/g, "");
        let tagName = tagText.split(" ")[0]
        if(tagName.length === 0){
          continue;
        }
        if(tagName.charAt(0) === '/'){
          // Close tag
          tagName = tagName.substring(1);

          // Match to last opened tag
          if(openTagStack.length === 0){
            return ReturnMethods.returnFailure("Cannot close HTML tag " + tag + " when no tag is open");
          } else {
            let lastOpenTag = openTagStack[openTagStack.length - 1];

            if(tagName !== lastOpenTag){
              return ReturnMethods.returnFailure("Cannot close HTML tag " + tag + " when last open tag was <"
                  +lastOpenTag + ">");
            } else {
              openTagStack.pop();
            }
          }
        } else {
          // Open tag
          if(!DevConfig.VALID_HTML_TAGS.includes(tagName)){
            return ReturnMethods.returnFailure("HTML tag "+ tag + " is not a valid tag");
          }
          openTagStack.push(tagName)
        }
      }
      if(!openTagStack.every(remainingTag => remainingTag === 'br')){
        return ReturnMethods.returnFailure("Following open HTML tags not closed: "
        + openTagStack.filter(tag => tag !== "br").map(el => "<" + el + ">").join(", "));
      }
    }

    // Check if all emojis present in text are valid (emoji format is :text:, where text has no spaces)
    let extractedEmojis = str.match(/:[^ \n]*:/g)
    if(extractedEmojis){
      for(const e of extractedEmojis){
        if(!emoji.hasEmoji(e)){
          return ReturnMethods.returnFailure("Invalid Emoji: " + e);
        }
      }
    }

    return ReturnMethods.returnSuccess(true);
  }

  // Function to validate a single Question Object
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
              fakeParticipantObj.parameterTypes, param.value.substring(2,param.value.length-1), "qualtrics")
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
            if (!validVarTypes.includes(fakeParticipantObj.parameterTypes[actionObj.args[i]])) {
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
                let variableCheck = ConfigParser.getVariableType(fakeParticipantObj.parameterTypes, qType);
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
        let requiredVariableType = ConfigParser.getVariableType(fakeParticipantObj.parameterTypes, DevConfig.VAR_STRINGS.CURRENT_ANSWER, qType);
        let argType = fakeParticipantObj.parameterTypes[actionObj.args[0]];
        if(requiredVariableType.data !== argType){
          return ReturnMethods.returnFailure(
              "arg number 1 for action type \"" + actionObj.aType +
              "\": cannot save answer of qType " + qType + " to variable of type " + argType)
        }
      }

      if(actionObj.aType === "saveOptionIdxTo"){
        let argType = fakeParticipantObj.parameterTypes[actionObj.args[0]];
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
        let saveVariableType = ConfigParser.getVariableType(fakeParticipantObj.parameterTypes, DevConfig.VAR_STRINGS.CURRENT_ANSWER, qType);
        let argType = fakeParticipantObj.parameterTypes[actionObj.args[0]];
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
          + " actionList must be an array of action objects"
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
    let validateConditionalObject = (condObj, thenType, fieldName, qType, validationFn) => {
      // Function to check if a given variable is of a particular type
      let isType = (value, type) => {
        switch(type){
          case "boolean":
          case "number":
          case "string":
            return typeof value === type
          case "arr":
            return Array.isArray(value)
          case "object":
            return typeof value === type && !Array.isArray(value) && value !== null
          case "strArr":
            return Array.isArray(value) && value.every(el => typeof el === "string")
          case "numArr":
            return Array.isArray(value) && value.every(el => typeof el === "string")
        }
      }

      // Ensure fields "if" and "then" are present
      if(!("if" in condObj && "then" in condObj)){
        return ReturnMethods.returnFailure("conditional object must have properties \"if\" and \"then\"")
      }

      // Ensure "if" and "then" are in the correct format
      if(!(isType(condObj.if, "string") && isType(condObj.then, thenType))){
        return ReturnMethods.returnFailure(
            " fields \"if\" and \"then\" of conditional object in " +fieldName+ " must be of type string and "
            + thenType + " respectively.")
      }
      // Ensure that "if" is a valid conditional expression
      let copyPart = JSON.parse(JSON.stringify(fakeParticipantObj));
      copyPart.currentQuestion.qType = qType
      let validateCondObj = ConfigParser.evaluateConditionString(copyPart, condObj.if)
      if(validateCondObj.returnCode === DevConfig.FAILURE_CODE){
        return validateCondObj;
      }


      // Validate the outcomes of the then clause
      validationFn(condObj.then);

      if("else" in condObj){
        if(!isType(condObj.else, thenType)){
          return ReturnMethods.returnFailure(
              "field \"else\" must be of type " + thenType)
        }
        validationFn(condObj.else);
      }
      return ReturnMethods.returnSuccess(true)

    }
    if("cNextActions" in questionObj){
      assert(Array.isArray(questionObj.cNextActions),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " cNextActions must be an array of condition objects")
      for(const condObj of questionObj.cNextActions){
        let validateCondObj = validateConditionalObject(condObj, "arr", "cNextActions",
            questionObj.qType, (actionList) => validateActionList(actionList, questionCategory, condition))
        assert(validateCondObj.returnCode === DevConfig.SUCCESS_CODE,
            "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
            + "\n" + validateCondObj.data)
      }
    }

    // nextQuestion
    let validateNextQuestion = (qString, condition) => {
      let valObj = validateQuestionIdentifier(qString, condition);
      assert(valObj.returnCode === DevConfig.SUCCESS_CODE,
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + ", nextQuestion is not valid\n" + valObj.data);
    }
    if("nextQuestion" in questionObj){
      assert(!("cNextQuestions" in questionObj),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " question object cannot contain both nextQuestion and cNextQuestions"
      )
      validateNextQuestion(questionObj.nextQuestion, condition);
    }

    // cNextQuestions
    if("cNextQuestions" in questionObj){
      assert(Array.isArray(questionObj.cNextQuestions),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " cNextQuestions must be an array of condition objects")
      for(const condObj of questionObj.cNextQuestions){
        let validateCondObj = validateConditionalObject(condObj, "string", "cNextQuestions",
            questionObj.qType, (nextQ) => validateNextQuestion(nextQ, condition))
        assert(validateCondObj.returnCode === DevConfig.SUCCESS_CODE,
            "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
            + "\n" +validateCondObj.data)
      }
    }

    // replyMessages
    let validateReplyObject = (replyObject) => {
      assert(typeof replyObject === "object",
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " replyMessages must be an object")
      assert(confirmAllLanguages(replyObject),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " replyMessages must have a translation for every language")

      assert(!(!Object.values(replyObject).every(rep => Array.isArray(rep)
             && rep.length > 0 && rep.every(str => typeof str === "string"))),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " replyMessages must contain a non-empty array of strings for every language")

      for(const [lang, replies] of Object.entries(replyObject)){
        for(const text of replies){
          let validateTextObj = validateSentText(text)
          assert(validateTextObj.returnCode === DevConfig.SUCCESS_CODE,
              "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
              + "\n" + validateTextObj.data)
        }
      }
      return ReturnMethods.returnSuccess(true)
    }
    if("replyMessages" in questionObj){
      assert(!("cReplyMessages" in questionObj),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " question object cannot contain both replyMessages and cReplyMessages"
      )
      validateReplyObject(questionObj.replyMessages);
    }

    // cReplyMessages
    if("cReplyMessages" in questionObj){
      assert(Array.isArray(questionObj.cReplyMessages),
          "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
          + " cReplyMessages must be an array of condition objects")
      for(const condObj of questionObj.cReplyMessages){
        let validateCondObj = validateConditionalObject(condObj, "object", "cReplyMessages",
            questionObj.qType, (nextQ) => validateReplyObject(nextQ, condition))
        assert(validateCondObj.returnCode === DevConfig.SUCCESS_CODE,
            "Condition: " + condition + "\nCategory: " + questionCategory + "\nQID: " + questionObj.qId
            + "\n" + validateCondObj.data)
      }
    }

  }

  // Function to validate a question identifier category.qId, to make sure the
  //  question category exists in that condition and that the qId exists within that category
  let validateQuestionIdentifier = (qString, condition) => {
    if(typeof qString !== "string"){
      return ReturnMethods.returnFailure("question identifier must be a string")
    }

    let qSplit = qString.split(".")
    if(qSplit.length !== 2){
      return ReturnMethods.returnFailure("question identifier must be of the form `category.qId`")
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
      return ReturnMethods.returnFailure("question category " + qSplit[0]+ " not present for condition " + condition)
    }
    if(!questionCatObject[qSplit[0]].some(qObj => qObj.qId === qSplit[1])){
      return ReturnMethods.returnFailure(
          " qId " + qSplit[1] + " does not exist in category " + qSplit[0]+ " for condition " + condition)
    }

    return ReturnMethods.returnSuccess(true)
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

  // Validate a list of scheduled questions
  let validateScheduledQuestions = (schQList, condition) => {
    schQList.forEach(schQ => {
      assert(typeof schQ === "object",
          "Condition: " + condition + "\neach scheduled question must be object")
      assert("qId" in schQ && typeof schQ.qId === "string",
          "Condition: " + condition + "\nqId of scheduled question must be present and must be string")
      let validateQIDObj = validateQuestionIdentifier(schQ.qId, condition)
      assert(validateQIDObj.returnCode === DevConfig.SUCCESS_CODE,
          "Condition: " + condition + "\nqId of scheduled question not valid: "
          + schQ.qId +"\n" + validateQIDObj.data)

      // Ensure atTime field is present and valid
      assert("atTime" in schQ && typeof schQ.qId === "string",
          "Condition: " + condition
          + "\natTime of scheduled question must be present and must be string: " + schQ.qId)
      if(schQ.atTime.startsWith("${") && schQ.atTime.charAt(schQ.atTime.length-1) === "}"){
        // check if it is a valid string variable
        let varName = schQ.atTime.substring(2,schQ.atTime.length-1)
        assert(varName in fakeParticipantObj.parameterTypes
            && fakeParticipantObj.parameterTypes[varName] === "string",
            "Condition: " + condition
            + "\n" + varName + " is not a valid string variable for atTime")
      } else {
        // Ensure that it is in HH:MM format
        let scheduleTimeSplit = schQ.atTime.split(":");
        assert(scheduleTimeSplit.length === 2 && scheduleTimeSplit.every(el => el.length === 2),
            "Condition: " + condition
            + "\n" + schQ.atTime + " is not in `HH:MM` format: "+ schQ.qId)
        let [h, m] = scheduleTimeSplit;
        assert(!isNaN(h) && parseInt(h) >= 0 && parseInt(h) <= 23,
            "Condition: " + condition
            + "\n" + schQ.atTime + " must have hours as a number between 0 and 23 (inclusive): " + schQ.qId)
        assert(!isNaN(m) && parseInt(m) >= 0 && parseInt(m) <= 59,
            "Condition: " + condition
            + "\n" + schQ.atTime + " must have minutes as a number between 0 and 59 (inclusive): " + schQ.qId)
      }

      // Ensure onDays is present and in correct format
      assert("onDays" in schQ && Array.isArray(schQ.onDays),
          "Condition: " + condition
          + "\nonDays of scheduled question must be present and must be a string array: " + schQ.qId)
      schQ.onDays.forEach(el => {
        assert(DevConfig.DAY_INDEX_ORDERING.includes(el),
            "Condition: " + condition
            + "\nonDays of scheduled question " + schQ.qId + " has an invalid member: " + el)
      })

      // Validate the condition if present
      if("if" in schQ){
        assert(typeof schQ.if === "string",
            "Condition: " + condition
            + "\nfield \"if\" must be a string" + schQ.qId)
        let validateCondObj = ConfigParser.evaluateConditionString(fakeParticipantObj, schQ.if)
        assert(validateCondObj.returnCode === DevConfig.SUCCESS_CODE,
            "Condition: " + condition
            + "\nfield \"if\" of scheduled question " + schQ.qId + " has an invalid expression:\n"
            + validateCondObj.data)
      }

      // Validate the stages if present
      if("stages" in schQ){
        assert(Array.isArray(schQ.stages) && schQ.stages.every(stage => typeof stage === "string"),
            "Condition: " + condition
            + "\nfield \"stages\" must be an array of strings" + schQ.qId)
        let stageList = typeof condition !== "undefined" ? config.experimentStages[condition] : config.experimentStages;
        if(typeof stageList === "object"){
          // participant not assigned to condition yet, just check if stage exists in any condition
          stageList = Object.values(stageList).flat()
        }
        schQ.stages.forEach(stage => {
          assert(stageList.map(obj => obj.name).includes(stage),
              "Condition: " + condition
              + "\nfield \"stages\" of " + schQ.qId + ": " + stage + " is not a valid stage for condition " + condition)
        })
      }
    })
  }

  // Validate default scheduled questions category, if it exists
  if("scheduledQuestions" in config){
    assert(Array.isArray(config.scheduledQuestions), " scheduledQuestions of main config file must be array")
    validateScheduledQuestions(config.scheduledQuestions, undefined)
  }

  // Validate a list of scheduled questions
  let validateUserPromptedQuestions = (qList, condition) => {
    qList.forEach(schQ => {
      assert(typeof schQ === "object",
          "Condition: " + condition + "\neach user prompted question must be object")
      assert("qId" in schQ && typeof schQ.qId === "string",
          "Condition: " + condition + "\nqId of user prompted question must be present and must be string")
      let validateQIDObj = validateQuestionIdentifier(schQ.qId, condition)
      assert(validateQIDObj.returnCode === DevConfig.SUCCESS_CODE,
          "Condition: " + condition + "\nqId of user prompted question not valid: "
          + schQ.qId +"\n" + validateQIDObj.data)

      // Ensure keyword field is present and valid
      assert("keyword" in schQ && typeof schQ.keyword === "object",
          "Condition: " + condition
          + "\nkeyword of scheduled question must be present and must be an object: " + schQ.qId)
      assert(confirmAllLanguages(schQ.keyword) && Object.values(schQ.keyword).every(el => typeof el === "string"),
          "Condition: " + condition + "\nQID: " + schQ.qId
          + "\nkeyword of scheduled question must have a string present for all languages")

      // Ensure description field is present and valid
      assert("description" in schQ && typeof schQ.description === "object",
          "Condition: " + condition
          + "\ndescription of scheduled question must be present and must be an object: " + schQ.qId)
      assert(confirmAllLanguages(schQ.description) && Object.values(schQ.description).every(el => typeof el === "string"),
          "Condition: " + condition + "\nQID: " + schQ.qId
          + "\ndescription of scheduled question must have a string present for all languages")

      // Validate the condition if present
      if("if" in schQ){
        assert(typeof schQ.if === "string",
            "Condition: " + condition
            + "\nfield \"if\" must be a string" + schQ.qId)
        let validateCondObj = ConfigParser.evaluateConditionString(fakeParticipantObj, schQ.if)
        assert(validateCondObj.returnCode === DevConfig.SUCCESS_CODE,
            "Condition: " + condition
            + "\nfield \"if\" of scheduled question " + schQ.qId + " has an invalid expression:\n"
            + validateCondObj.data)
      }

      // Validate the stages if present
      if("stages" in schQ){
        assert(Array.isArray(schQ.stages) && schQ.stages.every(stage => typeof stage === "string"),
            "Condition: " + condition
            + "\nfield \"stages\" must be an array of strings" + schQ.qId)
        let stageList = typeof condition !== "undefined" ? config.experimentStages[condition] : config.experimentStages;
        if(typeof stageList === "object"){
          // participant not assigned to condition yet, just check if stage exists in any condition
          stageList = Object.values(stageList).flat()
        }
        schQ.stages.forEach(stage => {
          assert(stageList.map(obj => obj.name).includes(stage),
              "Condition: " + condition
              + "\nfield \"stages\" of " + schQ.qId + ": " + stage + " is not a valid stage for condition " + condition)
        })
      }
    })
  }
  if("userPromptedQuestions" in config){
    assert(Array.isArray(config.userPromptedQuestions), " userPromptedQuestions of main config file must be array")
    validateUserPromptedQuestions(config.userPromptedQuestions, undefined)
  }

  // Ensure there are questions for each condition
  config.experimentConditions.forEach(condition => {
    assert(condition in config.conditionQuestions,
        "questions for condition \"" + condition + "\" not present in question categories")
  })

  // Test the question categories for each condition
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
    if("scheduledQuestions" in condObj){
      assert(Array.isArray(condObj.scheduledQuestions), " userPromptedQuestions of condition "
          + condition + " must be array")
      validateScheduledQuestions(condObj.scheduledQuestions, condition)
    }
    if("userPromptedQuestions" in condObj){
      assert(Array.isArray(condObj.userPromptedQuestions), " userPromptedQuestions of condition "
          + condition + " must be array")
      validateUserPromptedQuestions(condObj.userPromptedQuestions, condition)
    }
  }

  console.log('\x1b[42m\x1b[30m%s\x1b[0m', 'Config file valid');

}

module.exports.checkConfig()