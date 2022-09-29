const { MongoMemoryServer } = require('mongodb-memory-server');

const answers = require('../src/apiControllers/answerApiController');

const mongo = require('mongoose');
const moment = require("moment-timezone");
const transcripts = require("../src/apiControllers/transcriptApiController");

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
		let experiment = await answers.getCurrent(testId);
		expect(experiment).to.not.be.null;
		expect(experiment.uniqueId).to.equal(testId);
		
		
	});
	it('Should initialize an answer doc', async() => {
		let savedExp = await answers.initializeAnswer(testId, testExptId);
		let newExp = await answers.getCurrent(testId);
		expect(newExp['experimentId']).to.equal(testExptId);
		expect(newExp['current']).to.equal(true);
		expect(newExp['start']).to.equal(true);
		expect(newExp['linkId']).to.not.be.undefined;
		expect(newExp['lastLinkId']).to.be.undefined;
	})
	it('Should add and get answer doc - 2', async () => {

		await answers.add(testId2);
		let experiment = await answers.getCurrent(testId2);
		expect(experiment).to.not.be.null;
		expect(experiment.uniqueId).to.equal(testId2);


	});
	it('Should initialize an answer doc - 2', async() => {
		let savedExp = await answers.initializeAnswer(testId2, testExptId);
		let newExp = await answers.getCurrent(testId2);
		expect(newExp['experimentId']).to.equal(testExptId);
		expect(newExp['current']).to.equal(true);
		expect(newExp['start']).to.equal(true);
		expect(newExp['linkId']).to.not.be.undefined;
		expect(newExp['lastLinkId']).to.be.undefined;
	})
	it('Should add an answer', async () => {
		const testAnswer = {
			qId : "Zombotron1",
			text: "Are you a zombie please?",
			askTimeStamp: moment.tz().format(),
			answerTimeStamp: moment.tz().format(),
			answer: ["yes","no","maybe so"]
		}
		await answers.addAnswer(testId, testAnswer);
		let participant = await answers.getCurrent(testId)
		// console.log(participant["answers"]);
		let lastIdx = participant["answers"].length - 1
		expect(participant["answers"][lastIdx]['qId']).to.eql(testAnswer.qId);
		expect(participant["answers"][lastIdx]['text']).to.eql(testAnswer.text);
		expect(participant["answers"][lastIdx]['askTimeStamp']).to.eql(testAnswer.askTimeStamp);
		expect(participant["answers"][lastIdx]['answerTimeStamp']).to.eql(testAnswer.answerTimeStamp);
		expect(participant["answers"][lastIdx]['answer']).to.eql(testAnswer.answer);
	});
	it('Should have not changed any other document', async () => {

		let participant = await answers.getCurrent(testId2)
		// console.log(participant["answers"]);
		expect(participant["answers"].length).to.eql(0);
	});

	let startLinkId;
	it('Should create a new node in the linked list with empty array', async () => {
		let currentDebugInfo = await answers.getCurrent(testId);
		startLinkId = currentDebugInfo.linkId
		await answers.addNode(testId);
		let oldDebugInfo = await answers.getByLinkId(testId, currentDebugInfo.linkId)
		let newDebugInfo = await answers.getCurrent(testId);
		expect(oldDebugInfo.nextLinkId).to.equal(newDebugInfo.linkId);
		expect(newDebugInfo.nextLinkId).to.be.undefined;
		expect(newDebugInfo.start).to.equal(false);
		expect(oldDebugInfo.start).to.equal(true);
		expect(oldDebugInfo.answers.length).equal(1);
		expect(newDebugInfo.answers.length).equal(0);
	})
	let partDocs;
	it('Should get all documents for participant', async () => {
		partDocs = await answers.getAllForId(testId);
		expect(partDocs.length).to.equal(2)
		partDocs.forEach(doc => {
			expect(doc.uniqueId).to.equal(testId)
		})
	})
	it('Only one of the partDocs should be current', async () => {
		let currentCount = 0
		partDocs.forEach(doc => {
			if(doc.current) currentCount++;
		})
		expect(currentCount).to.equal(1);
	})
	it('Should add multiple answer objects to new node', async () => {
		const testAnswer2 = {
			qId : "Zombotron2",
			text: "Are you a zombie please?",
			askTimeStamp: moment.tz().format(),
			answerTimeStamp: moment.tz().format(),
			answer: ["no","maybe so"]
		}
		const testAnswer3 = {
			qId : "Zombotron3",
			text: "Are you are a zombie please?",
			askTimeStamp: moment.tz().format(),
			answerTimeStamp: moment.tz().format(),
			answer: ["yes","no"]
		}
		await answers.addAnswer(testId, testAnswer2);
		await answers.addAnswer(testId, testAnswer3);

		let participant = await answers.getCurrent(testId)

		expect(participant["answers"][0]['qId']).to.eql(testAnswer2.qId);
		expect(participant["answers"][0]['text']).to.eql(testAnswer2.text);
		expect(participant["answers"][0]['askTimeStamp']).to.eql(testAnswer2.askTimeStamp);
		expect(participant["answers"][0]['answerTimeStamp']).to.eql(testAnswer2.answerTimeStamp);
		expect(participant["answers"][0]['answer']).to.eql(testAnswer2.answer);

		expect(participant["answers"][1]['qId']).to.eql(testAnswer3.qId);
		expect(participant["answers"][1]['text']).to.eql(testAnswer3.text);
		expect(participant["answers"][1]['askTimeStamp']).to.eql(testAnswer3.askTimeStamp);
		expect(participant["answers"][1]['answerTimeStamp']).to.eql(testAnswer3.answerTimeStamp);
		expect(participant["answers"][1]['answer']).to.eql(testAnswer3.answer);
	});
	it('Should not have added anything to old document', async () => {

		let answer = await answers.getByLinkId(testId, startLinkId);
		expect(answer.answers.length).to.equal(1)
		expect(answer.answers[0].qId).to.equal("Zombotron1")
	});
	it('Should build a single list of all debug infos from linked list', async () => {
		let list = await answers.getSingleList(testId);
		expect(list.length).to.equal(3);
		for(let i = 0; i < list.length; i++){
			expect(list[i].qId).to.equal("Zombotron" + (i+1))
		}
	})
	it('Should remove answers for Id', async () => {
		await answers.removeAllForId(testId);
		let experiment = await answers.getCurrent(testId);
		expect(experiment).to.be.null;
	});
	it('Should not have removed debug infos for other Id', async () => {
		let experiment = await answers.getCurrent(testId2);
		expect(experiment).to.not.be.null;
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
