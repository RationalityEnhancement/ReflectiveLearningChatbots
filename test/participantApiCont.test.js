const { MongoMemoryServer } = require('mongodb-memory-server');

const participants = require('../src/apiControllers/participantApiController');

const mongo = require('mongoose');

const {assert, expect} = require('chai');

const moment = require('moment-timezone');


const testId = "123";
const testId2 = "321";
const testExptId = '98867';
describe('Participant Controller API: ', () =>{
		

	it('Should connect to memory server', async () => {
		mongoServer = await MongoMemoryServer.create()
		try{
			await mongo.connect(mongoServer.getUri(), { dbName: "verifyMASTER" });
			console.log('\tConnection successful!');
		} catch (err) {
			console.log(err);
		}
		
		const result = mongo.connection.readyState;
		expect(result).to.equal(1);
	});
	
	it('Should add and get participant', async () => {
		
		await participants.add(testId);
		var participant = await participants.get(testId);
		expect(participant).to.not.be.null;
		expect(participant.chatId).to.equal(testId);
		
		
	});
	it('Should initialize a participant', async() => {
		const testDefaultLang = 'Shona';
		const expectedParams = {
			"language": "Shona",
		};
		let savedPart = await participants.initializeParticipant(testId, testExptId, testDefaultLang);
		let newPart = await participants.get(testId);
		expect(newPart['experimentId']).to.equal(testExptId);
		expect(newPart['parameters']['language']).to.eql("Shona");
		expect(newPart['currentState']).to.equal("starting");
	})
	it('Should add and get participant - 2', async () => {

		await participants.add(testId2);
		var participant = await participants.get(testId2);
		expect(participant).to.not.be.null;
		expect(participant.chatId).to.equal(testId2);


	});
	it('Should initialize a participant - 2', async() => {

		const testDefaultLang = 'Shona';
		const expectedParams = {
			"language": "Shona",
		};
		let savedPart = await participants.initializeParticipant(testId2, testExptId, testDefaultLang);
		let newPart = await participants.get(testId2);
		expect(newPart['experimentId']).to.equal(testExptId);
		expect(newPart['parameters']['language']).to.eql("Shona");
		expect(newPart['currentState']).to.equal("starting");
	})
	it('Should get all participants by experiment ID', async() => {
		let pList = await participants.getByExperimentId(testExptId);
		expect(pList.length).to.equal(2);
		expect(pList[0].chatId).to.equal(testId);
		expect(pList[1].chatId).to.equal(testId2);
	})
	it('Should update Number field', async () => {
		
		const testCondIdx = 2;
		await participants.updateField(testId, 'conditionIdx', testCondIdx);
		
		let participant = await participants.get(testId)
		
		expect(participant.conditionIdx).to.equal(testCondIdx);
		
	});
	it('Should update String field', async () => {
		
		const testState = 'peem';
		await participants.updateField(testId, 'currentState', testState);
		
		let participant = await participants.get(testId)
		
		expect(participant.currentState).to.equal(testState);
		
	});

	it('Should update parameter', async () => {
		
		const paramField = 'timezone';
		const paramValue = 'zbeengo';
		
		await participants.updateParameter(testId, paramField, paramValue);
		let part = await participants.get(testId);
		expect(part.parameters[paramField]).to.equal(paramValue);	
		
	});


	it('Should add an answer', async () => {
		const testAnswer = {
			qId : "Zombotron",
			text: "Are you a zombie please?",
			timeStamp: moment.tz().format(),
			answer: ["yes","no","maybe so"]
		}
		await participants.addAnswer(testId, testAnswer);
		let participant = await participants.get(testId)
		// console.log(participant["answers"]);
		expect(participant["answers"][0]['qId']).to.eql(testAnswer.qId);
		expect(participant["answers"][0]['text']).to.eql(testAnswer.text);
		expect(participant["answers"][0]['timeStamp']).to.eql(testAnswer.timeStamp);
		expect(participant["answers"][0]['answer']).to.eql(testAnswer.answer);
	});
	const testJob = {
		jobId: "testJobJa",
		qId : "speep.Zombotron",
		atTime: "10:00",
		onDays: ["Mon", "Tue", "Wed"]

	}
	it('Should add a scheduled question', async () => {

		await participants.addScheduledQuestion(testId, testJob);
		let participant = await participants.get(testId)
		let scheduledQs = participant["scheduledOperations"]["questions"];
		expect(scheduledQs[0]['jobId']).to.eql(testJob.jobId);
		expect(scheduledQs[0]['qId']).to.eql(testJob.qId);
		expect(scheduledQs[0]['atTime']).to.eql(testJob.atTime);
		expect(scheduledQs[0]['onDays']).to.eql(testJob.onDays);
	});
	it('Should have the scheduled question', async () => {
		let hasQ = await participants.hasScheduledQuestion(testId, testJob);
		assert(hasQ);
	})
	it('Should not have a question that wasnt scheduled', async () => {
		let fakeJob = {};
		fakeJob = Object.assign(fakeJob, testJob);
		fakeJob.qId = "fakeQuestion";
		let hasQ = await participants.hasScheduledQuestion(testId, fakeJob);
		assert(!hasQ);
	})
	it('Should not add the same scheduled question again', async () => {

		let participant = await participants.get(testId);
		expect(participant.scheduledOperations["questions"].length).to.equal(1);
		await participants.addScheduledQuestion(testId, testJob);
		participant = await participants.get(testId)
		expect(participant.scheduledOperations["questions"].length).to.equal(1);
	});
	it('Should return normally if removed question doesnt exist', async () => {
		let DBHasJob = (jobArray, jobId) => {
			let foundJob = false;
			for(let i = 0; i < jobArray.length; i++){
				if(jobArray[i]["jobId"] === jobId){
					foundJob = true;
					break;
				}
			}
			return foundJob;
		}
		await participants.removeScheduledQuestion(testId, 'fakeJobId');
		let participant = await participants.get(testId)
		let scheduledQs = participant["scheduledOperations"]["questions"];
		assert(DBHasJob(scheduledQs, testJob.jobId));
	});
	it('Should remove a scheduled question', async () => {
		let DBHasJob = (jobArray, jobId) => {
			let foundJob = false;
			for(let i = 0; i < jobArray.length; i++){
				if(jobArray[i]["jobId"] === jobId){
					foundJob = true;
					break;
				}
			}
			return foundJob;
		}
		await participants.removeScheduledQuestion(testId, testJob.jobId);
		let participant = await participants.get(testId)
		let scheduledQs = participant["scheduledOperations"]["questions"];
		assert(!DBHasJob(scheduledQs, testJob.jobId));
	});
	it('Should add an answer to current answer', async () => {

		await participants.addToCurrentAnswer(testId, "answer1");
		let participant = await participants.get(testId)
		let cAnswer = participant["currentAnswer"];
		expect(cAnswer).to.eql(["answer1"]);
	});
	it('Should add an answer to current answer 2', async () => {

		await participants.addToCurrentAnswer(testId, "answer2");
		let participant = await participants.get(testId)
		let cAnswer = participant["currentAnswer"];
		expect(cAnswer).to.eql(["answer1", "answer2"]);
	});
	it('Should add not add duplicate to current answer', async () => {

		await participants.addToCurrentAnswer(testId, "answer2");
		let participant = await participants.get(testId)
		let cAnswer = participant["currentAnswer"];
		expect(cAnswer).to.eql(["answer1", "answer2"]);
	});
	it('Should add erase the current answer', async () => {

		await participants.eraseCurrentAnswer(testId);
		let participant = await participants.get(testId)
		let cAnswer = participant["currentAnswer"];
		expect(cAnswer).to.eql([]);
	});


	it('Should remove participant', async () => {
		await participants.remove(testId);
		let participant = await participants.get(testId);
		expect(participant).to.be.null;
		
	});

	it('Should close connection', async () => {
		try
		{
			await mongo.connection.close();	
			console.log('\tConnection closed!')
		} catch(err) {
			console.log(err)
		}
		
		const result = mongo.connection.readyState;
		expect(result).to.equal(0);
	});
});
