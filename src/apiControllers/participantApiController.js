/**
 * Class to write data about the current experiment to the
 * MongoDB database.
 *
 * Primary identifier of a participant document is the
 * Telegram chat id
 */

const { Participant } = require('../models/Participant');
const moment = require('moment-timezone');
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
exports.get = async (chatId) => {
  try {
    return Participant.findOne({ chatId });
  } catch (err) {
    console.error(err);
  }
}

// Add a new document with a given chat ID
exports.add = async (chatId) => {
  try {
    const participant = new Participant();
    participant.chatId = chatId;
    return participant.save();
  } catch (err) {
    console.error(err);
  }
}


// Initialize the experiment document with some basic essential information
exports.initializeParticipant = async (chatId, experimentId, defaultLanguage) => {
  try{
    const participant = await Participant.findOne({ chatId });
    participant['experimentId'] = experimentId;
    participant['parameters'] = {
      "language" : defaultLanguage
    };
    participant['currentState'] = "starting";
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to initializeParticipant');
    console.error(err);
  }
}

// Update the field of a document with a new value
exports.updateField = async (chatId, field, value) => {
  try{
    let participant = await Participant.findOne({ chatId });  
    participant[field] = value;
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to update field');
    console.error(err);
  }
}

// Update the 'parameters' field of the participant with a new value
exports.updateParameter = async (chatId, param, value) => {

  try{
    let participant = await Participant.findOne({ chatId });  
    let updatedParams = participant.parameters;
    updatedParams[param] = value;
    participant.parameters = updatedParams;
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to update parameters');
    console.error(err);
  }
}

// Add an answer to the end of a chronological list of answers
// given by the participants in response to question prompts
exports.addAnswer = async (chatId, answer) => {
  try{
    let participant = await Participant.findOne({ chatId });  
    participant.answers.push(answer);
    
    return participant.save();
  } catch(err){
    console.log('Participant API Controller: Unable to add answer');
    console.error(err);
  }
}

exports.addScheduledQuestion = async (chatId, jobInfo) => {
  try{
    let participant = await Participant.findOne({ chatId });
    participant.scheduledOperations["questions"].push(jobInfo);

    return participant.save();
  }
  catch(err){
    console.log('Participant API Controller: Unable to add scheduled question');
    console.error(err);
  }
}
exports.removeScheduledQuestion = async (chatId, jobId) => {
  try{
    let participant = await Participant.findOne({ chatId });
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

exports.addToCurrentAnswer = async (chatId, answerPart) => {
  try{
    let participant = await Participant.findOne({ chatId });
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

exports.eraseCurrentAnswer = async (chatId) => {
  try{
    let participant = await Participant.findOne({ chatId });
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
exports.remove = async chatId => {
  try {
    return Participant.deleteOne({ chatId });
  } catch (err) {
    console.error(err);
  }
}


