const experimentUtils = require('../src/experimentUtils');
const expect = require('chai').expect

const map = {'1234': 0};
const conditionAssignments = [0.5, 0.5]
const conditionAssignments2 = [1, 1, 2];
const currentAssignments = [2,1];
const currentAssignments2 = [1,1,1]
const currentAssignments3 = [20,20,35]
describe('Condition assignment', () => {
	describe('Pid Map', () => {
		it('assigns to condition by PID - balanced', () => {
			const result = experimentUtils.assignToCondition('1234', map, conditionAssignments, currentAssignments,"balanced")
			expect(result).to.equal(0);
		})
		it('assigns to condition by PID - random', () => {
			const result = experimentUtils.assignToCondition('1234', map, conditionAssignments, currentAssignments,"random")
			expect(result).to.equal(0);
		})
	})
	describe('Natural assignment', () => {
		it('balances by condition - 1', () => {
			const result = experimentUtils.assignToCondition('1235', map, conditionAssignments, currentAssignments,"balanced")
			expect(result).to.equal(1);
		})
		it('balances by condition - 2', () => {
			const result = experimentUtils.assignToCondition('1235', map, conditionAssignments2, currentAssignments2,"balanced")
			expect(result).to.equal(2);
		})
		it('balances by condition - 3', () => {
			const result = experimentUtils.assignToCondition('1235', map, conditionAssignments2, currentAssignments3,"balanced")
			expect(result).to.equal(2);
		})
		it('tends to the natural balance', () => {
			const numParts = 100;
			const curAssignments = [0,0,0];
			const conAssignments = [5,3,2];
		    
		    relParts = conAssignments.reduce((a, b) => a + b, 0);
		    relReqAssignments = conAssignments.map(n => parseFloat(n / relParts));

		    for(let i = 0; i < numParts; i++){
		    	let assignment = experimentUtils.assignToCondition('1235', map, conAssignments, curAssignments, "balanced");
		    	
		    	curAssignments[assignment] += 1;

		    }

		    totalParts = curAssignments.reduce((a, b) => a + b, 0);
		    relCurAssignments = curAssignments.map(n => parseFloat(n / totalParts));

		    relDiffs = [];
		    for(let i=0; i < relCurAssignments.length; i++){
		      relDiffs.push(relReqAssignments[i] - relCurAssignments[i]);
		    }
		    expect(relDiffs.every(val => Math.abs(val) < 0.05)).to.be.true;
		})
	})
})