/**
 * Class to write data about the current experiment to the
 * MongoDB database.
 *
 * Primary identifier of a participant document is the
 * Telegram chat id
 */

const { ParticipantSchemaObject, Participant } = require('../models/Participant');
const lodash = require('lodash');
const moment = require('moment-timezone');
const config = require("../../json/config.json");
const defaultTimezone = 'Europe/Berlin';

// Get all documents
exports.getAll = async () => {
  try {
    return Participant.find();
  } catch (err) {
    console.error(err);
  }
}

// Get a single document by chatID
exports.get = async (uniqueId) => {
  try {
    return Participant.findOne({ uniqueId });
  } catch (err) {
    console.error(err);
  }
}

exports.getByExperimentId = async (experimentId) => {
  try {
    return Participant.find({ experimentId: experimentId });
  } catch(err) {
    console.error(err);
  }
}

// Add a new document with a given chat ID
exports.add = async (uniqueId) => {
  try {
    const participant = new Participant();
    participant.uniqueId = uniqueId;
    return participant.save();
  } catch (err) {
    console.error(err);
  }
}


// Initialize the experiment document with some basic essential information
exports.initializeParticipant = async (uniqueId, config) => {
  try{
    const participant = await Participant.findOne({ uniqueId });
    participant['experimentId'] = config.experimentId;
    participant['parameters'] = {
      "language" : config.defaultLanguage
    };
    participant['currentState'] = "starting";
    participant["parameterTypes"] = {};
    for(const[key, value] of Object.entries(config.customParameters)){
      if(key in ParticipantSchemaObject.parameters){
        participant["parameterTypes"][key] = value;
      }
    }
    for(const[key, value] of Object.entries(config.mandatoryParameters)){
      if(key in ParticipantSchemaObject.parameters){
        participant["parameterTypes"][key] = value;
      }
    }
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to initializeParticipant');
    console.error(err);
  }
}

// Update the field of a document with a new value
exports.updateField = async (uniqueId, field, value) => {
  try{
    let participant = await Participant.findOne({ uniqueId });  
    participant[field] = value;
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to update field');
    console.error(err);
  }
}

// Update the 'parameters' field of the participant with a new value
exports.updateParameter = async (uniqueId, param, value) => {

  try{
    let participant = await Participant.findOne({ uniqueId });  
    let updatedParams = participant.parameters;
    updatedParams[param] = value;
    participant.parameters = updatedParams;
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to update parameters');
    console.error(err);
  }
}
// Update the 'parameters' field of the participant by adding a new value
exports.addToArrParameter = async (uniqueId, param, value) => {

  try{
    let participant = await Participant.findOne({ uniqueId });
    let updatedParams = participant.parameters;
    updatedParams[param].push(value);
    participant.parameters = updatedParams;
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to add value to parameter');
    console.error(err);
  }
}

// Add a value to an array parameter
exports.addToArrField = async (uniqueId, fieldName, value) => {
  try{
    let participant = await Participant.findOne({ uniqueId });
    let ans = participant[fieldName];
    if(Array.isArray(ans)){
      participant[fieldName].push(value);
    }
    return participant.save();
  }
  catch(err){
    console.log('Participant API Controller: Unable to add scheduled question');
    console.error(err);
  }
}

// Clear the value of a given parameters
exports.clearArrParamValue = async (uniqueId, param) => {

  try{
    let participant = await Participant.findOne({ uniqueId });
    let updatedParams = participant.parameters;
    if(Array.isArray(updatedParams[param])){
      updatedParams[param] = [];
    }
    participant.parameters = updatedParams;
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to add value to parameter');
    console.error(err);
  }
}


// Add an answer to the end of a chronological list of answers
// given by the participants in response to question prompts
exports.addAnswer = async (uniqueId, answer) => {
  try{
    let participant = await Participant.findOne({ uniqueId });  
    participant.answers.push(answer);
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to add answer');
    console.error(err);
  }
}

exports.hasScheduledQuestion = async (uniqueId, jobInfo) => {
  try{
    let exists = false;
    let participant = await Participant.findOne({uniqueId});
    let scheduledQuestions = participant.scheduledOperations["questions"];
    for(let i = 0; i < scheduledQuestions.length; i++){
      let curQ = scheduledQuestions[i];
      let allEqual = true;
      for(const [key, value] of Object.entries(jobInfo)){
        if(!lodash.isEqual(jobInfo[key], curQ[key])){
          allEqual = false;
          break;
        }
      }
      if(allEqual){
        exists = true;
        break;
      }
    }
    return exists;
  }
  catch(err){
    console.log('Participant API Controller: Unable to check if scheduled question exists');
    console.error(err);
  }
}

exports.addScheduledQuestion = async (uniqueId, jobInfo) => {
  try{
    let participant = await Participant.findOne({ uniqueId });
    let hasQAlready = await exports.hasScheduledQuestion(uniqueId, jobInfo)
    if(!hasQAlready){
      participant.scheduledOperations["questions"].push(jobInfo);
    }
    return participant.save();
  }
  catch(err){
    console.log('Participant API Controller: Unable to add scheduled question');
    console.error(err);
  }
}
exports.removeScheduledQuestion = async (uniqueId, jobId) => {
  try{
    let participant = await Participant.findOne({ uniqueId });
    let scheduledQs = participant.scheduledOperations["questions"];
    let jobIdx = -1;
    for(let i = 0; i < scheduledQs.length; i++){
      let scheduledQ = scheduledQs[i];
      if(scheduledQ.jobId === jobId){
        jobIdx = i;
        break;
      }
    }
    if(jobIdx != -1) participant.scheduledOperations["questions"].splice(jobIdx,1);

    return participant.save();
  }
  catch(err){
    console.log('Participant API Controller: Unable to add scheduled question');
    console.error(err);
  }
}

exports.addToCurrentAnswer = async (uniqueId, answerPart) => {
  try{
    let participant = await Participant.findOne({ uniqueId });
    let ans = participant.currentAnswer;
    if(!ans.includes(answerPart)){
      participant.currentAnswer.push(answerPart);
    }
    return participant.save();
  }
  catch(err){
    console.log('Participant API Controller: Unable to add scheduled question');
    console.error(err);
  }
}

exports.eraseCurrentAnswer = async (uniqueId) => {
  try{
    let participant = await Participant.findOne({ uniqueId });
    participant.currentAnswer = [];
    return participant.save();
  }
  catch(err){
    console.log('Participant API Controller: Unable to add scheduled question');
    console.error(err);
  }
}

// Remove all records
exports.removeAll = async () => {
  try {
    return Participant.deleteMany({});
  } catch (err) {
    console.error(err);
  }
}

// remove a single record by chat ID
exports.remove = async uniqueId => {
  try {
    return Participant.deleteOne({ uniqueId });
  } catch (err) {
    console.error(err);
  }
}


