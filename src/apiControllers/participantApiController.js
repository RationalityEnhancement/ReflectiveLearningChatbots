/**
 * Class to write data about the current experiment to the
 * MongoDB database.
 *
 * Primary identifier of a participant document is the
 * Telegram chat id
 */

const { ParticipantSchemaObject, Participant } = require('../models/Participant');
const lodash = require('lodash');

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
    return Participant.findOne({ uniqueId: uniqueId });
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
    const participant = await Participant.findOne({ uniqueId: uniqueId });
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
    let participant = await Participant.findOne({ uniqueId: uniqueId });
    participant[field] = value;
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to update field ' + field);
    console.error(err);
  }
}

// Update multiple fields
exports.updateFields = async (uniqueId, newFields) => {
  try{
    let participant = await Participant.findOne({ uniqueId: uniqueId });
    for(const [field, value] of Object.entries(newFields)){
      participant[field] = value;
    }
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to update field ' + field);
    console.error(err);
  }
}

// Update the 'parameters' field of the participant with a new value
exports.updateParameter = async (uniqueId, param, value) => {

  try{
    let participant = await Participant.findOne({ uniqueId: uniqueId });
    let updatedParams = participant.parameters;
    updatedParams[param] = value;
    participant.parameters = updatedParams;
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to update parameters ' + param);
    console.error(err);
  }
}

// Update a value of the object 'stages' of the participant with a new value
exports.updateStageParameter = async (uniqueId, param, value) => {

  try{
    let participant = await Participant.findOne({ uniqueId: uniqueId });
    let updatedParams = participant.stages;
    updatedParams[param] = value;
    participant.stages = updatedParams;
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to update stage parameter ' + param);
    console.error(err);
  }
}

// Clear the value of a given parameters
exports.clearStageParam = async (uniqueId, param) => {

  try{
    let participant = await Participant.findOne({ uniqueId: uniqueId });
    if(param in participant.stages){
      participant.stages[param] = undefined;
    }
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to clear stage parameter ' + param);
    console.error(err);
  }
}

// Update the 'parameters' field of the participant by adding a new value
exports.addToArrParameter = async (uniqueId, param, value) => {

  try{
    let participant = await Participant.findOne({ uniqueId: uniqueId });
    let updatedParams = participant.parameters;
    updatedParams[param].push(value);
    participant.parameters = updatedParams;
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to add value to array parameter');
    console.error(err);
  }
}

// Add a value to an array parameter
exports.addToArrField = async (uniqueId, fieldName, value) => {
  try{
    let participant = await Participant.findOne({ uniqueId: uniqueId });
    let ans = participant[fieldName];
    if(Array.isArray(ans)){
      participant[fieldName].push(value);
    }
    return participant.save();
  }
  catch(err){
    console.log('Participant API Controller: Unable to add to array field ' + fieldName);
    console.error(err);
  }
}

// Clear the value of a given parameters
exports.clearParamValue = async (uniqueId, param) => {

  try{
    let participant = await Participant.findOne({ uniqueId: uniqueId });
    if(param in participant.parameters){
      participant.parameters[param] = undefined;
    }
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to clear parameter value');
    console.error(err);
  }
}


// Add an answer to the end of a chronological list of answers
// given by the participants in response to question prompts
// If updateAnswer is not undefined, then set current answer to that
exports.addAnswer = async (uniqueId, answer, updateAnswer) => {
  try{
    // console.time(uniqueId + " adding answer - getting the participant")
    let participant = await Participant.findOne({ uniqueId: uniqueId });
    // console.timeEnd(uniqueId + " adding answer - getting the participant")
    // console.time(uniqueId + " adding answer - pushing answer")
    participant.answers.push(answer);
    if(updateAnswer){
      participant.currentAnswer = updateAnswer
    }
    // console.timeEnd(uniqueId + " adding answer - pushing answer")
    // console.time(uniqueId + " adding answer - saving participant")
    let newP = await participant.save();
    // console.timeEnd(uniqueId + " adding answer - saving participant")
    return newP;
  } catch(err){
    console.log('Participant API Controller: Unable to add answer');
    console.error(err);
  }
}

// Add debug information to the chronological list
exports.addDebugInfo = async (uniqueId, infoObj) => {
  try{
    // console.time(uniqueId + " adding debug - getting the participant")
    let participant = await Participant.findOne({ uniqueId: uniqueId });
    // console.timeEnd(uniqueId + " adding debug - getting the participant")
    // console.time(uniqueId + " adding debug - pushing debug")
    participant.debugInfo.push(infoObj);
    // console.timeEnd(uniqueId + " adding debug - pushing debug")
    // console.time(uniqueId + " adding debug - saving participant")
    let newP = await participant.save();
    // console.timeEnd(uniqueId + " adding debug - saving participant")
  } catch(err){
    console.log('Participant API Controller: Unable to add answer');
    console.error(err);
  }
}

// Adds an object to the stages.activity array
exports.addStageActivity = async (uniqueId, activity) => {
  try{
    let participant = await Participant.findOne({ uniqueId: uniqueId });
    participant.stages.activity.push(activity);
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to add answer');
    console.error(err);
  }
}

// Pass participant object to check if it has scheduled operation
exports.hasScheduledOperationObject = (participant, type, jobInfo) => {
  try{
    let exists = false;
    let scheduledOperations = participant.scheduledOperations[type];
    for(let i = 0; i < scheduledOperations.length; i++){
      let curQ = scheduledOperations[i];
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

// Unnecessary call to database
exports.hasScheduledOperation = async (uniqueId, type, jobInfo) => {
  try{
    let exists = false;
    let participant = await Participant.findOne({ uniqueId: uniqueId });
    let scheduledOperations = participant.scheduledOperations[type];
    for(let i = 0; i < scheduledOperations.length; i++){
      let curQ = scheduledOperations[i];
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

exports.addScheduledOperation = async (uniqueId, type, jobInfo) => {
  try{
    // console.time(uniqueId + " adding SO - getting the participant")
    let participant = await Participant.findOne({ uniqueId: uniqueId });
    // console.timeEnd(uniqueId + " adding SO - getting the participant")
    // console.time(uniqueId + " adding SO - checking if has SO")
    let hasOAlready = exports.hasScheduledOperationObject(participant, type, jobInfo)
    // console.timeEnd(uniqueId + " adding SO - checking if has SO")
    if(!hasOAlready){
      participant.scheduledOperations[type].push(jobInfo);
    }
    // console.time(uniqueId + " adding SO - saving participant")
    let newP = await participant.save();
    // console.timeEnd(uniqueId + " adding SO - saving participant")
    return newP;
  }
  catch(err){
    console.log('Participant API Controller: Unable to add scheduled question');
    console.error(err);
  }
}
exports.removeScheduledOperation = async (uniqueId, type, jobId) => {
  try{
    // console.time(uniqueId + " removing SO - getting the participant")
    let participant = await Participant.findOne({ uniqueId: uniqueId });
    // console.timeEnd(uniqueId + " removing SO - getting the participant")
    // console.time(uniqueId + " removing SO - removing stuff")
    let scheduledQs = participant.scheduledOperations[type];
    let jobIdx = -1;
    for(let i = 0; i < scheduledQs.length; i++){
      let scheduledQ = scheduledQs[i];
      if(scheduledQ.jobId === jobId){
        jobIdx = i;
        break;
      }
    }
    if(jobIdx != -1) participant.scheduledOperations[type].splice(jobIdx,1);
    // console.timeEnd(uniqueId + " removing SO - removing stuff")
    // TODO: Change this to update at some point? Can't do it now, apparently
    // console.time(uniqueId + " removing SO - saving participant")
    let newP = await participant.save();
    // console.timeEnd(uniqueId + " removing SO - saving participant")
    return newP;
  }
  catch(err){
    console.log('Participant API Controller: Unable to add scheduled question');
    console.error(err);
  }
}

exports.addToCurrentAnswer = async (uniqueId, answerPart) => {
  try{
    let participant = await Participant.findOne({ uniqueId: uniqueId });
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
    let participant = await Participant.findOne({ uniqueId: uniqueId });
    participant.currentAnswer = [];
    return participant.save();
  }
  catch(err){
    console.log('Participant API Controller: Unable to add scheduled question');
    console.error(err);
  }
}


exports.removeAllForExperiment = async experimentId => {
  try {
    return Participant.deleteMany({ experimentId : experimentId });
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


