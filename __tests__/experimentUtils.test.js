const experimentUtils = require('../src/experimentUtils');
/**
describe('condition assignment tests', () => {
	const map = {'1234': 0};
	const conditionAssignments = [0.5, 0.5]
	const conditionAssignments2 = [1, 2, 1];
	const currentAssignments = [2,1];
	const currentAssignments2 = [1,1,1]
	describe('pid assignment test 1', () => {
		it('should equal 0', () => {
			const result = index.assignToCondition('1234', map, conditionAssignments, currentAssignments,"balanced")
		})
	});
	describe('pid assignment test 2', () => {
		it('should equal 0', () => {
			const result = index.assignToCondition('1234', map, conditionAssignments, currentAssignments,"random")
		})
	});
})
**/
const map = {'1234': 0};
const conditionAssignments = [0.5, 0.5]
const conditionAssignments2 = [1, 1, 2];
const currentAssignments = [2,1];
const currentAssignments2 = [1,1,1]
const currentAssignments3 = [20,20,35]
test('condition assignment: Pid map balanced', ()=>{
	
	const result = experimentUtils.assignToCondition('1234', map, conditionAssignments, currentAssignments,"balanced")
	expect(result).toBe(0);
})
test('condition assignment: Pid map random', ()=>{
	
	const result = experimentUtils.assignToCondition('1234', map, conditionAssignments, currentAssignments,"random")
	expect(result).toBe(0);
})
test('condition assignment: balanced 1', ()=>{
	
	const result = experimentUtils.assignToCondition('1235', map, conditionAssignments, currentAssignments,"balanced")
	expect(result).toBe(1);
})
test('condition assignment: balanced 2', ()=>{
	
	const result = experimentUtils.assignToCondition('1235', map, conditionAssignments2, currentAssignments2,"balanced")
	expect(result).toBe(2);
})
test('condition assignment: balanced 3', ()=>{
	
	const result = experimentUtils.assignToCondition('1235', map, conditionAssignments2, currentAssignments3,"balanced")
	expect(result).toBe(2);
})