const { MongoMemoryServer } = require('mongodb-memory-server');

const participants = require('../src/apiControllers/participantApiController');

const mongo = require('mongoose');

const expect = require('chai').expect;


const testId = 123;
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
		const testExptId = '98867';
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
			timeStamp: new Date(),
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
	it('Should add a scheduled question', async () => {
		const testJob = {
			jobId: "testJobJa",
			qId : "speep.Zombotron",
			atTime: "10:00",
			onDays: ["Mon", "Tue", "Wed"]

		}
		await participants.addScheduledQuestion(testId, testJob);
		let participant = await participants.get(testId)
		let scheduledQs = participant["scheduledOperations"]["questions"];
		expect(scheduledQs[0]['jobId']).to.eql(testJob.jobId);
		expect(scheduledQs[0]['qId']).to.eql(testJob.qId);
		expect(scheduledQs[0]['atTime']).to.eql(testJob.atTime);
		expect(scheduledQs[0]['onDays']).to.eql(testJob.onDays);
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
