// This is the main AWS Amplify backend configuration file
// It sets up the API Gateway and connects it to the Lambda function

// Import necessary AWS CDK and Amplify components
import { defineBackend } from "@aws-amplify/backend";
import { Stack } from "aws-cdk-lib";
import { RestApi, LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { grammarFunction } from "./functions/grammarAPI/resource";
import { processorFunction } from "./functions/grammarProcessor/resource";
import { statusFunction } from "./functions/grammarStatus/resource";
import { Queue, QueueEncryption } from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Duration } from "aws-cdk-lib";
import { Table, AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { RemovalPolicy } from "aws-cdk-lib";

/**
 * Main backend configuration for the Grammar API service
 * Sets up API Gateway with Lambda integration and CORS settings
 */

// Define the backend first
const backend = defineBackend({
  grammarFunction,
  processorFunction,
  statusFunction,
});

// Create a dedicated stack for infrastructure
const infraStack = backend.createStack("InfraStack");

// Create DynamoDB table
const resultsTable = new Table(infraStack, "GrammarResults", {
  partitionKey: { name: "requestId", type: AttributeType.STRING },
  timeToLiveAttribute: "ttl",
  removalPolicy: RemovalPolicy.DESTROY,
});

// Create DLQ with 1-hour retention
const deadLetterQueue = new Queue(infraStack, "GrammarDLQ", {
  retentionPeriod: Duration.hours(1),
});

// Configure main queue with DLQ and 1-hour retention
const grammarQueue = new Queue(infraStack, "GrammarQueue", {
  visibilityTimeout: Duration.seconds(300),
  retentionPeriod: Duration.hours(1),
  deadLetterQueue: {
    queue: deadLetterQueue,
    maxReceiveCount: 3,
  },
  encryption: QueueEncryption.KMS_MANAGED,
  fifo: false,
  receiveMessageWaitTime: Duration.seconds(20),
});

// Grant permissions first
resultsTable.grantWriteData(backend.processorFunction.resources.lambda);
resultsTable.grantReadData(backend.statusFunction.resources.lambda);
grammarQueue.grantSendMessages(backend.grammarFunction.resources.lambda);

// Add environment variables
backend.processorFunction.addEnvironment(
  "RESULTS_TABLE",
  resultsTable.tableName
);
backend.grammarFunction.addEnvironment(
  "GRAMMAR_QUEUE_URL",
  grammarQueue.queueUrl
);
backend.statusFunction.addEnvironment("RESULTS_TABLE", resultsTable.tableName);

// Configure SQS trigger for processor
backend.processorFunction.resources.lambda.addEventSource(
  new SqsEventSource(grammarQueue, {
    batchSize: 10,
    maxBatchingWindow: Duration.seconds(30),
    reportBatchItemFailures: true,
  })
);

// Create API Gateway in a separate stack
const apiStack = backend.createStack("APIStack");
const api = new RestApi(apiStack, "GrammarRestApi", {
  restApiName: "grammarapi",
  deploy: true,
  deployOptions: {
    stageName: "prod",
  },
  defaultCorsPreflightOptions: {
    allowOrigins: [process.env.CORS_ORIGIN || "*"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "X-Amz-Date",
      "Authorization",
      "X-Api-Key",
      "X-Amz-Security-Token",
    ],
    allowCredentials: true,
  },
});

// Add routes after all resources are created
const grammarRoute = api.root.addResource("grammar");
grammarRoute.addMethod(
  "POST",
  new LambdaIntegration(backend.grammarFunction.resources.lambda)
);

// Create status endpoint with path parameter
const statusRoute = api.root.addResource("status").addResource("{requestId}");

statusRoute.addMethod(
  "GET",
  new LambdaIntegration(backend.statusFunction.resources.lambda, {
    proxy: true,
  }),
  {
    methodResponses: [
      {
        statusCode: "200",
        responseParameters: {
          "method.response.header.Access-Control-Allow-Origin": true,
          "method.response.header.Access-Control-Allow-Methods": true,
          "method.response.header.Access-Control-Allow-Headers": true,
          "method.response.header.Access-Control-Allow-Credentials": true,
        },
      },
    ],
  }
);

// Export API details with consistent naming
backend.addOutput({
  custom: {
    API: {
      grammarapi: {
        endpoint: api.url,
        region: Stack.of(apiStack).region,
      },
    },
  },
});

export default backend;
