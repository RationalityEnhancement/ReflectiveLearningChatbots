module.exports.assignToCondition = (participantId, pidMap, conditionAssignments, currentAssignments, assignmentScheme) => {
  if(participantId in pidMap){
    return pidMap[participantId];
  }
  if(assignmentScheme === "balanced"){
    totalParts = currentAssignments.reduce((a, b) => a + b, 0);
    relCurAssignments = currentAssignments.map(n => parseFloat(n / totalParts));
    
    relParts = conditionAssignments.reduce((a, b) => a + b, 0);
    relReqAssignments = conditionAssignments.map(n => parseFloat(n / relParts));

    relDiffs = [];
    for(let i=0; i < relCurAssignments.length; i++){
      relDiffs.push(relReqAssignments[i] - relCurAssignments[i]);
    }
    return relDiffs.indexOf(Math.max(...relDiffs));

  } else {
    return Math.floor(Math.random() * conditionAssignments.length);
  }
}