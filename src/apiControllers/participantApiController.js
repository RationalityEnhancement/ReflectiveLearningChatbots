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

exports.getByExperimentId = async (experimentId, botId=null) => {
  try {
    if(botId){
      return Participant.find({ experimentId: experimentId, responsibleBot: botId });
    } else {
      return Participant.find({ experimentId: experimentId });
    }

  } catch(err) {
    console.error(err);
  }
}

// Add a new document with a given chat ID
exports.add = async (uniqueId) => {
  try {

    return Participant.create({
      uniqueId: uniqueId
    });
  } catch (err) {
    console.error(err);
  }
}


// Initialize the experiment document with some basic essential information
exports.initializeParticipant = async (uniqueId, config, botUsername) => {
  try{

    let paramTypes = {};
    for(const[key, value] of Object.entries(config.customParameters)){
      if(key in ParticipantSchemaObject.parameters){
        paramTypes[key] = value;
      }
    }
    for(const[key, value] of Object.entries(config.mandatoryParameters)){
      if(key in ParticipantSchemaObject.parameters){
        paramTypes[key] = value;
      }
    }
    return Participant.findOneAndUpdate(
        {
            uniqueId : uniqueId
          },
        {
          experimentId: config.experimentId,
          currentState: "starting",
          responsibleBot: botUsername,
          parameters: {
            language: config.defaultLanguage
          },
          parameterTypes: paramTypes
        },
        {new: true}
    );
  } catch(err){
    console.log('Participant API Controller: Unable to initializeParticipant');
    console.error(err);
  }
}

// Update the field of a document with a new value
exports.updateField = async (uniqueId, field, value) => {
  try{
    let update = {}
    update[field] = value;
    return Participant.findOneAndUpdate(
        { uniqueId: uniqueId },
        update,
        {new : true}
    );
  } catch(err){
    console.log('Participant API Controller: Unable to update field ' + field);
    console.error(err);
  }
}

// Update multiple fields
exports.updateFields = async (uniqueId, newFields) => {
  try{
    let update = {}
    for(const [field, value] of Object.entries(newFields)){
      update[field] = value;
    }
    return Participant.findOneAndUpdate(
        { uniqueId: uniqueId },
        update,
        {new : true}
    );
  } catch(err){
    console.log('Participant API Controller: Unable to update field ' + field);
    console.error(err);
  }
}

// Update the 'parameters' field of the participant with a new value
exports.updateParameter = async (uniqueId, param, value) => {
  try{
    let update = {
      "$set":{

      }
    }
    update["$set"]["parameters."+param] = value;
    return Participant.findOneAndUpdate(
        { uniqueId: uniqueId },
        update,
        {new : true}
    );
  } catch(err){
    console.log('Participant API Controller: Unable to update parameters ' + param);
    console.error(err);
  }
}

// Update a value of the object 'stages' of the participant with a new value
exports.updateStageParameter = async (uniqueId, param, value) => {

  try{
    let update = {
      "$set":{

      }
    }
    update["$set"]["stages."+param] = value;
    return Participant.findOneAndUpdate(
        { uniqueId: uniqueId },
        update,
        {new : true}
    );
  } catch(err){
    console.log('Participant API Controller: Unable to update stage parameter ' + param);
    console.error(err);
  }
}

// Clear the value of a given parameters
exports.clearStageParam = async (uniqueId, param) => {

  try{
    let defaultVal = Participant.schema.tree.stages[param].default;
    let update = {
      "$set":{

      }
    }
    update["$set"]["stages."+param] = defaultVal;
    return Participant.findOneAndUpdate(
        { uniqueId: uniqueId },
        update,
        {new : true}
    );
  } catch(err){
    console.log('Participant API Controller: Unable to clear stage parameter ' + param);
    console.error(err);
  }
}

// Update the 'parameters' field of the participant by adding a new value
exports.addToArrParameter = async (uniqueId, param, value) => {

  try{
    let update = {
      "$push":{

      }
    }
    update["$push"]["parameters."+param] = value;
    return Participant.findOneAndUpdate(
        { uniqueId: uniqueId },
        update,
        {new : true}
    );
  } catch(err){
    console.log('Participant API Controller: Unable to add value to array parameter');
    console.error(err);
  }
}

// Add a value to an array parameter
exports.addToArrField = async (uniqueId, fieldName, value) => {
  try{
    let update = {
      "$push":{

      }
    }
    update["$push"][fieldName] = value;
    return Participant.findOneAndUpdate(
        { uniqueId: uniqueId },
        update,
        {new : true}
    );
  }
  catch(err){
    console.log('Participant API Controller: Unable to add to array field ' + fieldName);
    console.error(err);
  }
}

// Clear the value of a given parameters
exports.clearParamValues = async (uniqueId, params) => {

  try{

    let update = {
      "$set":{

      }
    }
    params.forEach(param => {
      update["$set"]["parameters."+param] = Participant.schema.tree.parameters[param].default;
    })
    return Participant.findOneAndUpdate(
        { uniqueId: uniqueId },
        update,
        {new : true}
    );
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
    let update = {
      "$push":{

      }
    }
    update["$push"]["answers"] = answer;
    if(updateAnswer){
      update["$set"] = {
        currentAnswer: updateAnswer
      }
    }
    return Participant.findOneAndUpdate(
        { uniqueId: uniqueId },
        update,
        {new : true}
    );
  } catch(err){
    console.log('Participant API Controller: Unable to add answer');
    console.error(err);
  }
}

// Add debug information to the chronological list
exports.addDebugInfo = async (uniqueId, infoObj) => {
  try{
    let update = {
      "$push":{

      }
    }
    update["$push"]["debugInfo"] = infoObj;
    return Participant.findOneAndUpdate(
        { uniqueId: uniqueId },
        update,
        {new : true}
    );
  } catch(err){
    console.log('Participant API Controller: Unable to add answer');
    console.error(err);
  }
}

// Adds an object to the stages.activity array
exports.addStageActivity = async (uniqueId, activity) => {
  try{
    let update = {
      "$push":{

      }
    }
    update["$push"]["stages.activity"] = activity;
    return Participant.findOneAndUpdate(
        { uniqueId: uniqueId },
        update,
        {new : true}
    );
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
    let condition = {
      uniqueId : uniqueId
    }
    condition["scheduledOperations."+type+".jobId"] = {
      $ne: jobInfo.jobId
    }
    let update = {
      "$push":{

      }
    }
    update["$push"]["scheduledOperations."+type] = jobInfo;
    return Participant.findOneAndUpdate(
        condition,
        update,
        {new : true}
    );
  }
  catch(err){
    console.log('Participant API Controller: Unable to add scheduled question');
    console.error(err);
  }
}
/**
 *  adds multiple scheduled operations as specified in operations
 * @param uniqueId
 * @param operations array of objects
 *              {
 *                  type: "questions", "actions", or "reminders",
 *                  jobInfo: {
 *                      jobId: string jobId,
 *                      atTime: HH:MM
 *                      onDays: Array of 3-letter day names
 *                      if: string condition
 *                  }
 *              }
 * @returns {Promise<BulkWriteResult>}
 */
exports.addScheduledOperations = async (uniqueId, operations) => {
  try{
    let writeOps = []
    operations.forEach(op => {
      let condition = {
        uniqueId : uniqueId
      }
      condition["scheduledOperations."+op.type+".jobId"] = {
        $ne: op.jobInfo.jobId
      }
      let update = {
        "$push":{

        }
      }
      update["$push"]["scheduledOperations."+op.type] = op.jobInfo;
      writeOps.push({
        updateOne: {
          filter: condition,
          update: update
        }
      })
    })

    return Participant.bulkWrite(
        writeOps
    );
  }
  catch(err){
    console.log('Participant API Controller: Unable to add scheduled operations');
    console.error(err);
  }
}
exports.removeScheduledOperation = async (uniqueId, type, jobId) => {
  try{
    let update = {
      "$pull" : {

      }
    }
    update["$pull"]["scheduledOperations."+type] = {
      jobId: jobId
    }
    return Participant.findOneAndUpdate(
        {uniqueId : uniqueId},
        update,
        {new : true}
    );
  }
  catch(err){
    console.log('Participant API Controller: Unable to remove scheduled operation');
    console.error(err);
  }
}

/**
 *  removes multiple scheduled operations as specified in operations
 * @param uniqueId
 * @param operations array of objects
 *              {
 *                  type: "questions", "actions", or "reminders",
 *                  jobId: string jobId
 *              }
 * @returns {Promise<BulkWriteResult>}
 */
exports.removeScheduledOperations = async (uniqueId, operations) => {
  try{
    let writeOps = []
    operations.forEach(op => {
      let update = {
        "$pull" : {

        }
      }
      update["$pull"]["scheduledOperations."+op.type] = {
        jobId: op.jobId
      }
      writeOps.push({
        updateOne: {
          filter: {uniqueId: uniqueId},
          update: update
        }
      })
    })

    return Participant.bulkWrite(
        writeOps
    );
  }
  catch(err){
    console.log('Participant API Controller: Unable to remove scheduled operations');
    console.error(err);
  }
}

exports.removeAllScheduledOperations = async (uniqueId) => {
  let operations = ["questions", "actions", "reminders"];
  try{
    let writeOps = []
    let update = {
      "$set" : {
        "scheduledOperations" : {}
      }
    }
    operations.forEach(op => {
      update["$set"]["scheduledOperations"][op] = []
    })
    return Participant.updateOne(
        { uniqueId: uniqueId},
        update,
        { new: true }
    );
  }
  catch(err){
    console.log('Participant API Controller: Unable to remove scheduled operations');
    console.error(err);
  }
}

exports.addToCurrentAnswer = async (uniqueId, answerPart) => {
  try{
    // Don't add to current answer if it's a duplicate answer
    return Participant.findOneAndUpdate(
        {
          uniqueId: uniqueId,
          currentAnswer : {
            $nin: [answerPart]
          }
        },
        {
          $push: {
            currentAnswer: answerPart
          }
        }
    )
  }
  catch(err){
    console.log('Participant API Controller: Unable to add scheduled question');
    console.error(err);
  }
}

exports.eraseCurrentAnswer = async (uniqueId) => {
  try{
    let defaultVal = Participant.schema.tree.currentAnswer.default;
    return Participant.findOneAndUpdate(
        { uniqueId: uniqueId},
        {
          $set: {
            currentAnswer: defaultVal
          }
        }
    )
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


