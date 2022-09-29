/**
 * Class to write data about the current experiment to the
 * MongoDB database.
 *
 * Primary identifier of a participant document is the
 * Telegram chat id
 */

const { Answers } = require('../models/Answers');

// Get all documents
exports.getAll = async () => {
  try {
    return Answers.find();
  } catch (err) {
    console.error(err);
  }
}

// Get the current linked list node
exports.getCurrent = async (uniqueId) => {
  try {
    return Answers.findOne({ uniqueId: uniqueId, current: true });
  } catch (err) {
    console.error(err);
  }
}

// Get all the linked list nodes for participant with uniqueId
exports.getAllForId = async (uniqueId) => {
  try {
    return Answers.find({ uniqueId: uniqueId });
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

// Get a single document by linkId
exports.getByLinkId = async (uniqueId, linkId) => {
  try {
    return Answers.findOne({ uniqueId: uniqueId, linkId: linkId });
  } catch (err) {
    console.error(err);
  }
}

// Add a new document with a given chat ID
//  Starts a new linked list
exports.add = async (uniqueId) => {
  try {

    return Answers.create({
      uniqueId: uniqueId,
      current: true,
      start: true
    });
  } catch (err) {
    console.error(err);
  }
}

exports.generateLinkId = (uniqueId) => {
  let randInt = Math.floor(Math.random() * (99999999 - 10000000) + 10000000);
  return uniqueId + "_" + randInt;
}

// Initialize the experiment document with some basic essential information
exports.initializeAnswer = async (uniqueId, experimentId) => {
  try{
    let linkId = this.generateLinkId(uniqueId);
    return Answers.findOneAndUpdate(
        {
            uniqueId : uniqueId
          },
        {
          $set: {
            experimentId: experimentId,
            linkId: linkId
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
//  Adds to the current node of the linked list
exports.addAnswer = async (uniqueId, answer) => {
  try{
    let update = {
      "$push":{

      }
    }
    update["$push"]["answers"] = answer;
    return Answers.findOneAndUpdate(
        { uniqueId: uniqueId, current: true },
        update,
        {new : true}
    );
  } catch(err){
    console.log('Answer API Controller: Unable to add answer');
    console.error(err);
  }
}

// Creates a new node in the linked list of answers for a given participant
//  and makes the new node current
exports.addNode = async(uniqueId) => {
  let currentAnswers = await Answers.findOne({
    uniqueId: uniqueId,
    current: true
  })
  let currentLinkId = currentAnswers.linkId;
  let currentExperimentId = currentAnswers.experimentId;
  let newLinkId = this.generateLinkId(uniqueId);
  let writeOps = [
    {
      insertOne: {
        "document" : {
          "uniqueId": uniqueId,
          "experimentId": currentExperimentId,
          "current": true,
          "start" : false,
          "linkId": newLinkId,
        }
      }
    },
    {
      updateOne: {
        filter: {
          "uniqueId": uniqueId,
          "linkId": currentLinkId
        },
        update: {
          $set: {
            "current" : false,
            "nextLinkId": newLinkId
          }
        }
      }
    }
  ]

  return Answers.bulkWrite(
      writeOps
  )

}

// Return a single list of answer objects by re-constructing the linked list
exports.getSingleList = async (uniqueId) => {
  let allDocs = await Answers.find({ uniqueId: uniqueId })
  let answerList = []
  let currentDoc = allDocs.filter(doc => doc.start)[0]
  try{
    while(true){
      answerList = answerList.concat(currentDoc.answers)
      let nextDocId = currentDoc.nextLinkId
      if(!nextDocId) break;
      currentDoc = allDocs.filter(doc => (doc.linkId === nextDocId))[0]
    }
    return answerList;
  } catch(e) {
    console.log("No single list created for participant " + uniqueId + "\n" + e.message + "\n" + e.stack);
    return []
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
exports.removeAllForId = async uniqueId => {
  try {
    return Answers.deleteMany({ uniqueId: uniqueId });
  } catch (err) {
    console.error(err);
  }
}


