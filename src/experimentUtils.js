const moment = require('moment-timezone')
const ReturnMethods = require('./returnMethods')
const ConfigReader = require('../src/configReader');
const DevConfig = ConfigReader.getDevConfig();

/**
 * Selects the appropriate condition assignment depending on whether the
 * conditions of variables are met for that condition assignment
 *
 * @param participantId the Id of the participant
 * @param pidMap mapping between Ids and condition indices
 * @param assignmentScheme the assignment scheme specified in the config file ("pid", "balanced", "random")
 * @param currentAssignments list of number of participant currently assigned to each condition
 */
let resolveAssignmentScheme = (participantId, pidMap, assignmentScheme, currentAssignments) => {
  let newAssScheme = assignmentScheme;
  // Assigning by PID map
  if(newAssScheme === "pid"){
    // If the PID map doesn't exist, assign balanced
    //  or if the mapping for that participant ID does not exist in PID map
    if(!pidMap){
      newAssScheme = "balanced";
    } else if(!(participantId in pidMap)) {
      newAssScheme = "balanced";
    }
  }
  // If no participants are assigned currently for balancing, assign at random
  if(newAssScheme === "balanced"){
    if(!currentAssignments.some(val => val > 0)){
      newAssScheme = "random";
    }
  }
  return newAssScheme;
}
module.exports.resolveAssignmentScheme = resolveAssignmentScheme;
/**
  Assigns to an experiment condition based on input parameters. If there exists
  a pre-existing mapping between PID and condition number, return that. Otherwise
  assigned randomly to one of the conditions, or balance according to the 
  given condition assignment ratios.

  In:
    participantId -> Id of participant
    pidMap -> object mapping PIDs to condition indices
    conditionAssignments -> array of same length containing ratios of group
                            sizes
    currentAssignment -> array of same length containing number of participants
                          already assigned to each corresponding condition
    assignmentScheme -> "balanced", "random", or "pid"

  Out:
    index of the assigned condition, selected according to the above scheme. If PID
    exists in numbers are exceeded 

*/
module.exports.assignToCondition = (participantId, pidMap, conditionAssignments, currentAssignments, assignmentScheme) => {
  // Error handling
  if(!DevConfig.validAssignmentSchemes.includes(assignmentScheme)){
    return ReturnMethods.returnFailure("ExpUtils: assignmentScheme invalid for condition assignment")
  }
  if(!conditionAssignments || conditionAssignments.length === 0 || !conditionAssignments.some(val => val > 0)){
    return ReturnMethods.returnFailure("ExpUtils: condition ratios invalid for condition assignment")
  }
  if(!currentAssignments || currentAssignments.length === 0){
    return ReturnMethods.returnFailure("ExpUtils: current assignments invalid for condition assignment")
  }
  if(conditionAssignments.length !== currentAssignments.length){
    return ReturnMethods.returnFailure("ExpUtils: condition ratios and current assignment do not match length")
  }

  let assScheme = resolveAssignmentScheme(participantId, pidMap,assignmentScheme, currentAssignments);
  if(assScheme === "pid"){
    return ReturnMethods.returnSuccess(pidMap[participantId]);
  } else if(assScheme === "balanced"){
    let totalParts = currentAssignments.reduce((a, b) => a + b, 0);
    let relCurAssignments = currentAssignments.map(n => parseFloat(n / totalParts));
    
    let relParts = conditionAssignments.reduce((a, b) => a + b, 0);
    let relReqAssignments = conditionAssignments.map(n => parseFloat(n / relParts));

    let relDiffs = [];
    for(let i=0; i < relCurAssignments.length; i++){
      relDiffs.push(relReqAssignments[i] - relCurAssignments[i]);
    }
    return ReturnMethods.returnSuccess(relDiffs.indexOf(Math.max(...relDiffs)));
  } else {
    return ReturnMethods.returnSuccess(Math.floor(Math.random() * conditionAssignments.length));
  }
}

/**
 * Takes a moment date string (moment.tz().format()) and converts it into a date object to access
 *  the numbers directly
 *
 * @param dateString moment date string of the format "YYYY-MM-DDTHH:MM:SS+OH:OM" (OH, OM = offset hours, minutes)
 *                                                 or "YYYY-MM-DDTHH:MM:SS-OH:OM"
 * @returns {{}} date object with following int properties: hours, minutes, seconds, years, months, days
 */

let parseMomentDateString = (dateString) => {
  let dateObj = {},date,time;
  try{
    let dateTimeSplit = dateString.split(/[T]/)
    date = dateTimeSplit[0];
    time = dateTimeSplit[1];
  } catch(e){
    let errorMsg = "ExpUtils: moment string cannot be split"
    ReturnMethods.returnFailure(errorMsg);
  }
  try{
    let dateSplit = date.split('-');
    dateObj.years = parseInt(dateSplit[0]);
    dateObj.months = parseInt(dateSplit[1]);
    dateObj.days = parseInt(dateSplit[2]);
  } catch(e){
    let errorMsg = "ExpUtils: date cannot be split properly"
    ReturnMethods.returnFailure(errorMsg);
  }

  try{
    let timeSplit = time.split(/[-\+:]/);
    dateObj.hours = parseInt(timeSplit[0]);
    dateObj.minutes = parseInt(timeSplit[1]);
    dateObj.seconds = parseInt(timeSplit[2]);
  } catch(e){
    let errorMsg = "ExpUtils: time cannot be split appropriately"
    ReturnMethods.returnFailure(errorMsg);
  }

  let jsDate = new Date();
  jsDate.setDate(dateObj.days);
  jsDate.setMonth(dateObj.months-1);
  jsDate.setFullYear(dateObj.years);

  dateObj.dayOfWeek = jsDate.getDay();

  return ReturnMethods.returnSuccess(dateObj);
}

module.exports.parseMomentDateString = parseMomentDateString;

/**
 * Takes a given timezone in tz-database format and returns a date object
 *
 * @param timezone string in tz database format (see Wikipedia)
 * @returns {{}} date object with following int properties: hours, minutes, seconds, years, months, days
 */
module.exports.getNowDateObject = (timezone) => {
  let now = moment.tz(timezone);
  let dateObj = parseMomentDateString(now.format());

  return dateObj.data;
}
/**
 * Takes an array and rotates in place to the left by one
 * Takes the first item and appends it to the end while preserving the length
 *
 * @param array array to be rotated
 */
module.exports.rotateLeftByOne = (array) => {
  if(!Array.isArray(array)) return [];
  if(array.length === 0) return [];
  let el = array.shift();
  array.push(el);
  return array;
}

/**
 * Takes an array and rotates in place to the left by one
 * Takes the first item and appends it to the end while preserving the length
 *
 * @param array array to be rotated
 */
module.exports.rotateLeftByMany = (array, count) => {
  if(!Array.isArray(array)) return [];
  if(array.length === 0) return [];
  for(let i = 0; i < count; i++){
    this.rotateLeftByOne(array);
  }
  return array;

}

/**
 *
 * Get the difference in minutes between two objects:
 *
 * {
 *     dayIndex: 0 - 6 (Sun - Sat)
 *     time: 00:00 - 24:00
 * }
 *
 * @param obj1 first time point
 * @param obj2 second time point (assumed to be after)
 */
module.exports.getMinutesDiff = (obj1, obj2) => {
  let day1 = obj1.dayIndex;
  let day2 = obj2.dayIndex;

  let hrs1 = parseInt(obj1.time.substring(0,2));
  let mins1 = parseInt(obj1.time.substring(3));

  let day1mins = hrs1 * 60 + mins1;

  let hrs2 = parseInt(obj2.time.substring(0,2));
  let mins2 = parseInt(obj2.time.substring(3));
  let day2mins = hrs2 * 60 + mins2;

  if(day2 < day1 || (day2 === day1 && day2mins <= day1mins)){
    day2 += 7;
  }

  let totalMins1 = day1 * 24 * 60 + day1mins;
  let totalMins2 = day2 * 24 * 60 + day2mins;

  return totalMins2 - totalMins1;

}
