const { MongoMemoryServer } = require('mongodb-memory-server');

const answers = require('../src/apiControllers/answerApiController');

const mongo = require('mongoose');
const moment = require("moment-timezone");
const participants = require("../src/apiControllers/participantApiController");

const expect = require('chai').expect;


const testId = '123';
const testId2 = '321';
const testExptId = 'testExptId';
describe('Answer Controller API: ', () =>{
		

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
	
	it('Should add and get answer doc', async () => {
		
		await answers.add(testId);
		let experiment = await answers.get(testId);
		expect(experiment).to.not.be.null;
		expect(experiment.uniqueId).to.equal(testId);
		
		
	});
	it('Should initialize an answer doc', async() => {
		let savedExp = await answers.initializeAnswer(testId, testExptId);
		let newExp = await answers.get(testId);
		expect(newExp['experimentId']).to.equal(testExptId);
	})
	it('Should add and get answer doc - 2', async () => {

		await answers.add(testId2);
		let experiment = await answers.get(testId2);
		expect(experiment).to.not.be.null;
		expect(experiment.uniqueId).to.equal(testId2);


	});
	it('Should initialize an answer doc - 2', async() => {
		let savedExp = await answers.initializeAnswer(testId2, testExptId);
		let newExp = await answers.get(testId2);
		expect(newExp['experimentId']).to.equal(testExptId);
	})
	it('Should add an answer', async () => {
		const testAnswer = {
			qId : "Zombotron",
			text: "Are you a zombie please?",
			askTimeStamp: moment.tz().format(),
			answerTimeStamp: moment.tz().format(),
			answer: ["yes","no","maybe so"]
		}
		await answers.addAnswer(testId, testAnswer);
		let participant = await answers.get(testId)
		// console.log(participant["answers"]);
		let lastIdx = participant["answers"].length - 1
		expect(participant["answers"][lastIdx]['qId']).to.eql(testAnswer.qId);
		expect(participant["answers"][lastIdx]['text']).to.eql(testAnswer.text);
		expect(participant["answers"][lastIdx]['askTimeStamp']).to.eql(testAnswer.askTimeStamp);
		expect(participant["answers"][lastIdx]['answerTimeStamp']).to.eql(testAnswer.answerTimeStamp);
		expect(participant["answers"][lastIdx]['answer']).to.eql(testAnswer.answer);
	});
	it('Should have not changed any other document', async () => {

		let participant = await answers.get(testId2)
		// console.log(participant["answers"]);
		expect(participant["answers"].length).to.eql(0);
	});

	it('Should remove experiment', async () => {
		await answers.remove(testId);
		let experiment = await answers.get(testId);
		expect(experiment).to.be.null;
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
