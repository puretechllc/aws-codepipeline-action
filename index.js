const AWS = require("aws-sdk");
const core = require("@actions/core");
require('dotenv').config({path: process.env.DOT_ENV_FILE})

const ensurePipelineBranch = (pipeline, branchName) => {
    if (branchName == null || branchName.trim().length === 0) {
        return false;
    }
    for (let stage of pipeline.stages) {
        if (stage.name === 'Source') {
            for (let action of stage.actions) {
                if (action.name === 'Source') {
                    if (action.configuration.BranchName !== branchName) {
                        action.configuration.BranchName = branchName;
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

try {
    const awsRegion = core.getInput("aws-region") || process.env.GA_AWS_REGION;
    const awsAccessKey = core.getInput("aws-access-key") || process.env.GA_AWS_KEY;
    const awssecretKey = core.getInput("aws-secret-key") || process.env.GA_AWS_SECRET;
    const pipelineName = core.getInput("pipeline-name") || process.env.GA_AWS_PIPELINE;
    const branchName = core.getInput("branch-name") || process.env.GA_BRANCH;
    AWS.config = new AWS.Config();
    AWS.config.region = awsRegion;
    AWS.config.accessKeyId = awsAccessKey;
    AWS.config.secretAccessKey = awssecretKey;

    const codepipeline = new AWS.CodePipeline();
    const pipeline = {
        name: pipelineName,
    };

    console.log("getting current pipeline config.")
    codepipeline.getPipeline(pipeline)
        .promise()
        .then((result) => {
            const pipelineData = result.pipeline;
            if (ensurePipelineBranch(pipelineData, branchName)) {
                console.log("Pipeline needs to be updated... ", JSON.stringify(pipelineData))
                return codepipeline.updatePipeline({
                    "pipeline": pipelineData
                }).promise();
            } else {
                console.log("Pipeline does not need to be updated. ")
                return Promise.resolve(1);
            }
        })
        .then((ignore) => {
            console.log("Starting pipeline execution.")
            return codepipeline.startPipelineExecution(pipeline).promise();
        })
        .catch((err) => {
            console.log(err, err.stack);
            throw err;
        });
} catch (error) {
    core.setFailed(error.message);
}
