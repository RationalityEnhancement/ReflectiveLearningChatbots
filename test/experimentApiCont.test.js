const { MongoMemoryServer } = require('mongodb-memory-server');

const experiments = require('../src/apiControllers/experimentApiController');

const mongo = require('mongoose');

const expect = require('chai').expect;


const testId = '123';
describe('Experiment Controller API: ', () =>{
		

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
	
	it('Should add and get experiment', async () => {
		
		await experiments.add(testId);
		var experiment = await experiments.get(testId);
		expect(experiment).to.not.be.null;
		expect(experiment.experimentId).to.equal(testId);
		
		
	});
	it('Should initialize an experiment', async() => {
		let savedExp = await experiments.initializeExperiment(testId, 'TestName', ["Control", "Experiment"], [1,1]);
		let newExp = await experiments.get(testId);
		expect(newExp['experimentName']).to.equal('TestName');
		expect(newExp['experimentConditions']).to.eql(["Control", "Experiment"]);
		expect(newExp['conditionAssignments']).to.eql([1,1]);
		expect(newExp['currentlyAssignedToCondition']).to.eql([0,0]);
	})
	it('Should update String field', async () => {
		
		const testName = 'TestyBob'
		let exp1 = await experiments.updateField(testId, 'experimentName', testName);
		
		let exp2 = await experiments.get(testId)
		
		expect(exp2.experimentName).to.equal(testName);
		
	});

	it('Should update array field', async () => {
		
		const testArray = [2,2];
		let exp1 = await experiments.updateField(testId, 'currentlyAssignedToCondition', testArray);
		let exp2 = await experiments.get(testId);
		expect(exp2.currentlyAssignedToCondition).to.eql(testArray);	
		
	});

	it('Should add participant to condition', async () => {
		
		const testCondIdx = 1;
		let exp1 = await experiments.updateConditionAssignees(testId, testCondIdx, 1);
		let exp2 = await experiments.get(testId)
		expect(exp2["currentlyAssignedToCondition"]).to.eql([2,3]);
	});


	it('Should decrease assigned to condition', async () => {
		const testCondIdx = 0;
		await experiments.updateConditionAssignees(testId, testCondIdx, -1);
		let experiment = await experiments.get(testId)
		expect(experiment["currentlyAssignedToCondition"]).to.eql([1,3]);
	});
	it('Should decrease assigned to condition - edge case 0', async () => {
		const testCondIdx = 0;
		await experiments.updateConditionAssignees(testId, testCondIdx, -2);
		let experiment = await experiments.get(testId)
		expect(experiment["currentlyAssignedToCondition"]).to.eql([0,3]);
	});
	it('Should add an error', async () => {
		let part = {
			uniqueId : "12345",
			stages : {
				"stageName" : "lol"
			}
		}
		let testErrObj = {
			message : "testError",
			participantJSON : JSON.stringify(part)
		};
		await experiments.addErrorObject(testId, testErrObj);
		let experiment = await experiments.get(testId)
		expect(experiment.errorMessages.length).to.equal(1)
		let lastError = experiment.errorMessages[experiment.errorMessages.length-1];
		expect(lastError.message).to.equal(testErrObj.message);
		expect(lastError.participantJSON).to.equal(testErrObj.participantJSON);
	})
	it('Should add an error - 2', async () => {
		let part = {
			uniqueId : "12346",
			stages : {
				"stageName" : "lmao"
			}
		}
		let testErrObj = {
			message : "testErbor",
			participantJSON : JSON.stringify(part)
		};
		await experiments.addErrorObject(testId, testErrObj);
		let experiment = await experiments.get(testId)
		expect(experiment.errorMessages.length).to.equal(2)
		let lastError = experiment.errorMessages[experiment.errorMessages.length-1];
		expect(lastError.message).to.equal(testErrObj.message);
		expect(lastError.participantJSON).to.equal(testErrObj.participantJSON);
	})

	it('Should add feedback', async () => {
		let part = {
			uniqueId : "12345",
			stages : {
				"stageName" : "lol"
			}
		}
		let testErrObj = {
			message : "testFeedback",
			participantJSON : JSON.stringify(part)
		};
		await experiments.addFeedbackObject(testId, testErrObj);
		let experiment = await experiments.get(testId)
		expect(experiment.feedbackMessages.length).to.equal(1)
		let lastError = experiment.feedbackMessages[experiment.feedbackMessages.length-1];
		expect(lastError.message).to.equal(testErrObj.message);
		expect(lastError.participantJSON).to.equal(testErrObj.participantJSON);
	})
	it('Should add feedback - 2', async () => {
		let part = {
			uniqueId : "12346",
			stages : {
				"stageName" : "lmao"
			}
		}
		let testErrObj = {
			message : "testFeebag",
			participantJSON : JSON.stringify(part)
		};
		await experiments.addFeedbackObject(testId, testErrObj);
		let experiment = await experiments.get(testId)
		expect(experiment.feedbackMessages.length).to.equal(2)
		let lastError = experiment.feedbackMessages[experiment.feedbackMessages.length-1];
		expect(lastError.message).to.equal(testErrObj.message);
		expect(lastError.participantJSON).to.equal(testErrObj.participantJSON);
	})

	it('Should remove experiment', async () => {
		await experiments.remove(testId);
		let experiment = await experiments.get(testId);
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
