/**
 * Class to write data about mappings between the telegram chat ID
 * and the automatically generated unique Id to the
 * MongoDB database
 *
 * Primary identifier of the idMapping document is the
 * experiment Id defined in the config file
 */

const { IDMap } = require('../models/IDMap');


// Get all experiments
exports.getAll = async () => {
  try {
    return IDMap.find();
  } catch (err) {
    console.error(err);
  }
}

//Get a single experiment
exports.getExperiment = async(experimentId) => {
  try{
    return IDMap.findOne({experimentId : experimentId});
  } catch(err){
    console.error(err);
  }
}

// Get a single user's mapping by telegram chatId
let getByChatId = async (experimentId, chatId) => {
  try {
    let experiment = await IDMap.findOne({ experimentId: experimentId });
    let foundMap;
    for(let i = 0; i < experiment.IDMappings.length; i++){
      if(experiment.IDMappings[i].chatId === chatId){
        foundMap = experiment.IDMappings[i];
        break;
      }
    }
    return foundMap;
  } catch (err) {
    console.error(err);
  }
}
exports.getByChatId = getByChatId;

// Get a single user's mapping by bot-generated ID
let getByUniqueId = async (experimentId, uniqueId) => {
  try {
    let experiment = await IDMap.findOne({ experimentId: experimentId });
    let foundMap;
    for(let i = 0; i < experiment.IDMappings.length; i++){
      if(experiment.IDMappings[i].uniqueId === uniqueId){
        foundMap = experiment.IDMappings[i];
        break;
      }
    }
    return foundMap;
  } catch (err) {
    console.error(err);
  }
}

exports.getByUniqueId = getByUniqueId;

// Add a new experiment for mappings
exports.addExperiment = async (experimentId) => {
  try {
    const idMapping = new IDMap();
    idMapping.experimentId = experimentId;
    return idMapping.save();
  } catch (err) {
    console.error(err);
  }
}

// Checks if a given list of Id Mappings contains a given unique Id already
let hasChatId = (IDMappings, chatId) => {
  if(!Array.isArray(IDMappings)) return false;
  let foundChatId = false;
  for(let i = 0; i < IDMappings.length; i++){
    if(IDMappings[i].chatId === chatId){
      foundChatId = true;
      break;
    }
  }
  return foundChatId;
}
exports.hasChatId = hasChatId;

// Checks if a given list of Id Mappings contains a given unique Id already
let hasUniqueId = (IDMappings, uniqueId) => {
  if(!Array.isArray(IDMappings)) return false;
  let foundChatId = false;
  for(let i = 0; i < IDMappings.length; i++){
    if(IDMappings[i].uniqueId === uniqueId){
      foundChatId = true;
      break;
    }
  }
  return foundChatId;
}
exports.hasUniqueId = hasUniqueId;

// Generate a unique Id that doesn't exist already
let generateUniqueId = async (experimentId) => {
  let experiment = await IDMap.findOne({ experimentId : experimentId });
  let createdNewId = false;
  let newId;
  while(!createdNewId){
    // generate a random number 8 digit number in string form
    newId = "" + Math.floor(Math.random() * (99999999 - 10000000) + 10000000);
    if(!hasUniqueId(experiment.IDMappings, newId)) createdNewId = true;
  }
  return newId;
}
exports.generateUniqueId = generateUniqueId;

// Add a new Id Mapping
// If it already exists, update
let addIDMapping = async (experimentId, chatId, uniqueId) => {
  try {
    let experiment = await IDMap.findOne({ experimentId: experimentId});
    let presentMap = hasChatId(experiment.IDMappings);
    if(presentMap){
      return updateUniqueId(experimentId, chatId, uniqueId);
    }

    experiment.IDMappings.push({
      chatId : chatId,
      uniqueId : uniqueId
    });
    return experiment.save();

  } catch (err) {
    console.error(err);
  }
}

exports.addIDMapping = addIDMapping;

// Update the uniqueId based on the telegram chatID
let updateUniqueId = async (experimentId, chatId, uniqueId) => {
  
  try{
    let experiment = await IDMap.findOne({ experimentId: experimentId });
    let presentMap = hasChatId(experiment.IDMappings, chatId);
    if(!presentMap){
      return addIDMapping(experimentId, chatId, uniqueId);
    }
    for(let i = 0; i < experiment.IDMappings.length; i++){
      let curMap = experiment.IDMappings[i];
      if(curMap.chatId === chatId){
        curMap.uniqueId = uniqueId;
        break;
      }
    }
    return experiment.save();
  } catch (err) {
    console.error(err);
  }
}
exports.updateUniqueId = updateUniqueId;

// Delete a mapping based on the chatId
// If it doesn't exist, do nothing
let deleteByChatId = async(experimentId, chatId) => {
  try{
    let experiment = await IDMap.findOne({ experimentId: experimentId });
    let delIdx = -1;
    for(let i = 0; i < experiment.IDMappings.length; i++){
      let curMap = experiment.IDMappings[i];
      if(curMap.chatId === chatId){
        delIdx = i;
        break;
      }
    }
    if(delIdx >= 0) {
      experiment.IDMappings.splice(delIdx, 1);
    }
    return experiment.save();
  } catch (err) {
    console.error(err);
  }
}
exports.deleteByChatId = deleteByChatId;

// Delete a mapping based on the unique Id
// If it doesn't exist, do nothing.
let deleteByUniqueId = async(experimentId, uniqueId) => {
  try{
    let experiment = await IDMap.findOne({ experimentId: experimentId });
    let delIdx = -1;
    for(let i = 0; i < experiment.IDMappings.length; i++){
      let curMap = experiment.IDMappings[i];
      if(curMap.uniqueId === uniqueId){
        delIdx = i;
        break;
      }
    }
    if(delIdx >= 0) {
      experiment.IDMappings.splice(delIdx, 1);
    }
    return experiment.save();
  } catch (err) {
    console.error(err);
  }
}
exports.deleteByUniqueId = deleteByUniqueId;

// Remove all documents
exports.removeAll = async () => {
  try {
    return IDMap.deleteMany({});
  } catch (err) {
    console.error(err);
  }
}

// Remove a single document by ID
exports.remove = async experimentId => {
  try {
    return IDMap.deleteOne({ experimentId: experimentId });
  } catch (err) {
    console.error(err);
  }
}
