const ConfigReader = require('../src/configReader');
const DevConfig = ConfigReader.getDevConfig();
const { assert, expect } = require('chai');

const testFile = require('../json/test/filename/filenameTest.json');
const ConfigParser = require("../src/configParser");

describe('Replacing file name deeply', () =>{
    it('Replacing normally', ()=>{
        let returnObj = ConfigReader.replaceFilenameDeeply(testFile["normal"].input);
        expect(returnObj).to.eql(testFile["normal"].target);
    })
    it('Invalid JSON', ()=>{
        let returnObj = ConfigReader.replaceFilenameDeeply(testFile["invalidJSON"].input);
        expect(returnObj).to.eql(testFile["invalidJSON"].target);
    })
    it('Missing extension', ()=>{
        let returnObj = ConfigReader.replaceFilenameDeeply(testFile["missingExtension"].input);
        expect(returnObj).to.eql(testFile["missingExtension"].target);
    })
    it('File doesnt exist', ()=>{
        let returnObj = ConfigReader.replaceFilenameDeeply(testFile["fileNotExist"].input);
        expect(returnObj).to.eql(testFile["fileNotExist"].target);
    })
})

describe('Parse Filename Token', () => {
    it('Should return string', () => {
        let testStr = "$F{asdklfasdfasdf.jpg}";
        let expectedVal = "asdklfasdfasdf.jpg";
        let returnObj = ConfigReader.parseFilenameToken(testStr);
        expect(returnObj.returnCode).to.equal(DevConfig.SUCCESS_CODE);
        expect(returnObj.data).to.eql(expectedVal)

    })

    it('Should fail when not string', () => {
        let testStr = 123;
        let returnObj = ConfigReader.parseFilenameToken(testStr);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

    })
    it('Should fail when string doesnt start with $F{ ', () => {
        let testStr = "${23}";
        let returnObj = ConfigReader.parseFilenameToken(testStr);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

    })
    it('Should fail when string doesnt end with } ', () => {
        let testStr = "$F{23";
        let returnObj = ConfigReader.parseFilenameToken(testStr);
        expect(returnObj.returnCode).to.equal(DevConfig.FAILURE_CODE);

    })
})