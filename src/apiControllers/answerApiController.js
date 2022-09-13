/**
 * Class to write data about the current experiment to the
 * MongoDB database.
 *
 * Primary identifier of a participant document is the
 * Telegram chat id
 */

const { AnswerSchemaObject, Answers } = require('../models/Answers');
const lodash = require('lodash');

// Get all documents
exports.getAll = async () => {
  try {
    return Answers.find();
  } catch (err) {
    console.error(err);
  }
}

// Get a single document by chatID
exports.get = async (uniqueId) => {
  try {
    return Answers.findOne({ uniqueId: uniqueId });
  } catch (err) {
    console.error(err);
  }
}

exports.getByExperimentId = async (experimentId) => {
  try {
    return Answers.find({ experimentId: experimentId });
  } catch(err) {
    console.error(err);
  }
}

// Add a new document with a given chat ID
exports.add = async (uniqueId) => {
  try {

    return Answers.create({
      uniqueId: uniqueId
    });
  } catch (err) {
    console.error(err);
  }
}


// Initialize the experiment document with some basic essential information
exports.initializeAnswer = async (uniqueId, experimentId) => {
  try{
    return Answers.findOneAndUpdate(
        {
            uniqueId : uniqueId
          },
        {
          $set: {
            experimentId: experimentId
          },
        },
        {new: true}
    );
  } catch(err){
    console.log('Answer API Controller: Unable to initializeAnswers');
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
    return Answers.findOneAndUpdate(
        { uniqueId: uniqueId },
        update,
        {new : true}
    );
  } catch(err){
    console.log('Answer API Controller: Unable to add answer');
    console.error(err);
  }
}

exports.removeAllForExperiment = async experimentId => {
  try {
    return Answers.deleteMany({ experimentId : experimentId });
  } catch (err) {
    console.error(err);
  }
}

// remove a single record by chat ID
exports.remove = async uniqueId => {
  try {
    return Answers.deleteOne({ uniqueId });
  } catch (err) {
    console.error(err);
  }
}


