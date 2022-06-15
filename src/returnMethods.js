const ConfigReader = require('../src/configReader');
const DevConfig = ConfigReader.getDevConfig();

class ReturnMethods {

    static returnSuccess(data) {
        return {
            returnCode: DevConfig.SUCCESS_CODE,
            data: data
        };
    }

    static returnPartialFailure(failData, successData) {
        return {
            returnCode: DevConfig.PARTIAL_FAILURE_CODE,
            failData: failData,
            successData: successData
        }
    }

    static returnFailure(data) {
        return {
            returnCode: DevConfig.FAILURE_CODE,
            data: data
        };
    }
}

module.exports = ReturnMethods;